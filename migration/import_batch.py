"""One-time migration helper. Signed source URLs are never logged or committed."""
import base64, concurrent.futures, hashlib, json, pathlib, re, urllib.request, sys
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

root = pathlib.Path.cwd()
private = serialization.load_pem_private_key(pathlib.Path('/tmp/migration-key/private.pem').read_bytes(), password=None)
ledger_path = root / 'migration/imported.json'
ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {}

def load_batch(path):
    envelope = json.loads(path.read_text())
    dec = lambda value: base64.b64decode(value, validate=True)
    key = private.decrypt(dec(envelope['key']), padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    return json.loads(AESGCM(key).decrypt(dec(envelope['nonce']), dec(envelope['ciphertext']), b'kormic-source-transfer-v1'))

def download(item, batch):
    rel = pathlib.PurePosixPath(item['path'])
    if rel.is_absolute() or '..' in rel.parts or '.git' in rel.parts:
        raise ValueError('Unsafe source path')
    expected_prefix = 'https://raw.githubusercontent.com/' + batch['repository'] + '/' + batch['commit'] + '/'
    if not item['url'].startswith(expected_prefix):
        raise ValueError('Unexpected download host or source')
    try:
        with urllib.request.urlopen(item['url'], timeout=45) as response:
            data = response.read()
    except Exception:
        raise RuntimeError('Download failed for ' + str(rel)) from None
    sha = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    if sha != item['sha']:
        raise ValueError('Source hash mismatch: ' + str(rel))
    if rel.name == '.env' or (rel.name.startswith('.env.') and rel.name not in ('.env.example', '.env.sample', '.env.template')):
        raise ValueError('Refusing environment-secret file: ' + str(rel))
    if re.search(rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)', data):
        raise ValueError('Potential credential requires review: ' + str(rel))
    return rel, data, sha

count = 0
for path in sorted((root / 'migration/batches').glob('*.json')):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if ledger.get(path.name, {}).get('envelope_sha256') == digest:
        continue
    batch = load_batch(path)
    if batch['role'] not in ('student', 'university', 'institute', 'superuser'):
        raise ValueError('Unknown portal')
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda item: download(item, batch), batch['files']))
    dest = root / 'apps' / batch['role']
    manifest = {}
    for rel, data, sha in results:
        target = dest / rel
        if target.exists() and target.read_bytes() != data:
            raise ValueError('Refusing to overwrite differing portal file: ' + str(rel))
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        if rel.name == 'gradlew':
            target.chmod(0o755)
        manifest[str(rel)] = sha
    ledger[path.name] = {'envelope_sha256': digest, 'role': batch['role'], 'repository': batch['repository'], 'commit': batch['commit'], 'files': manifest}
    count += len(results)
ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
print('Verified and imported', count, 'source files.')
