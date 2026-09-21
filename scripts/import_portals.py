#!/usr/bin/env python3
"""Import all four pinned repositories using the operator's existing Git login.

Read-only source operations. No Git push, permission changes, or backend changes.
All downloads and integration checks finish in staging before apps/ is replaced.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ROLES = ('student', 'university', 'institute', 'superuser')
SECRET = re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')


def blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def git(*args: str, cwd: Path | None = None) -> bytes:
    result = subprocess.run(['git', *args], cwd=cwd, stdout=subprocess.PIPE, check=True)
    return result.stdout


def replace_once(text: str, old: str, new: str, path: str) -> str:
    if text.count(old) != 1:
        raise ValueError(f'Integration anchor changed in {path}; refusing to guess.')
    return text.replace(old, new, 1)


def portal_entry(role: str) -> str:
    home = {'institute': '"/institute/dashboard"', 'superuser': '"/admin/dashboard"',
            'university': '`/university/${user.university_id}/dashboard`'}[role]
    return f'''import {{ useEffect }} from "react";
import {{ Navigate }} from "react-router-dom";
import {{ useAuth }} from "../../context/AuthContext";

/** One browser login; no token hand-off through URLs or browser storage. */
export default function UnifiedPortalEntry() {{
  const {{ status, user }} = useAuth();
  useEffect(() => {{
    if (status === "guest") {{
      window.location.replace("/login?portal={role}");
    }}
  }}, [status]);
  if (status === "authenticated" && user?.role !== "{role}") return <p role="alert">This account cannot open this portal. <a href="/login">Return to sign in</a></p>;
  if (status === "authenticated") return <Navigate to={{{home}}} replace />;
  if (status === "must_enroll_totp") return <Navigate to="/totp/enroll" replace />;
  return <p role="status" style={{{{ padding: "2rem" }}}}>Opening your secure sign-in…</p>;
}}
'''


def integrate(staged: Path) -> list[str]:
    changed: list[str] = []
    for role in ('university', 'institute', 'superuser'):
        app = staged / role / 'src/App.jsx'
        text = app.read_text(encoding='utf-8')
        # Preserve every original route, provider, guard and API module.
        pattern = r'(?P<prefix>import\s+\w+\s+from\s+[\"\'])\./pages/(?:LandingPage|auth/(?:LoginPage|UniversityLoginPage))(?P<suffix>[\"\'];)'
        text, count = re.subn(pattern, r'\g<prefix>./components/auth/UnifiedPortalEntry\g<suffix>', text)
        if count != 2:
            raise ValueError(f'{role}: expected the original landing and login imports, found {count}.')
        context = (staged / role / 'src/context/AuthContext.jsx').read_text(encoding='utf-8')
        if '"guest"' not in context and "'guest'" not in context:
            raise ValueError(f'{role}: unknown guest session state; integration requires review.')
        app.write_text(text, encoding='utf-8', newline='\n')
        new = staged / role / 'src/components/auth/UnifiedPortalEntry.jsx'
        new.write_text(portal_entry(role), encoding='utf-8', newline='\n')
        changed.extend([f'apps/{role}/src/App.jsx', f'apps/{role}/src/components/auth/UnifiedPortalEntry.jsx'])

    student = staged / 'student'
    app = student / 'src/App.tsx'
    text = app.read_text(encoding='utf-8')
    text = replace_once(text,
        "import { ActivityIndicator, BackHandler, StatusBar, StyleSheet, View } from 'react-native';",
        "import { ActivityIndicator, BackHandler, Platform, StatusBar, StyleSheet, View } from 'react-native';", str(app))
    effect = '''  // Browser entry only. Native login, registration and claim flows remain intact.
  useEffect(() => {
    if (Platform.OS !== 'web' || restoringSession || state.authSession?.access) return;
    const welcomeAllowed = new URLSearchParams(window.location.search).get('signup') === '1';
    if (state.route === 'Login' || (state.route === 'Welcome' && !welcomeAllowed && !claimLinkHandledRef.current)) {
      window.location.replace('/login?portal=student');
    }
  }, [restoringSession, state.authSession?.access, state.route, claimLinkHandledRef]);

'''
    marker = '  if (!frauncesLoaded || !interLoaded || restoringSession) {'
    text = replace_once(text, marker, effect + marker, str(app))
    app.write_text(text, encoding='utf-8', newline='\n')
    session = student / 'src/features/auth/useStudentSession.ts'
    text = session.read_text(encoding='utf-8')
    text = replace_once(text, "    dispatch({ type: 'LOGOUT' });", "    dispatch({ type: 'LOGOUT' });\n    if (Platform.OS === 'web') window.location.replace('/login?portal=student');", str(session))
    session.write_text(text, encoding='utf-8', newline='\n')
    config_file = student / 'app.json'
    config = json.loads(config_file.read_text(encoding='utf-8'))
    config.setdefault('expo', {}).setdefault('experiments', {})['baseUrl'] = '/student'
    config_file.write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
    changed.extend(['apps/student/src/App.tsx', 'apps/student/src/features/auth/useStudentSession.ts', 'apps/student/app.json'])
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repos-dir', type=Path, help='Optional folder containing local clones, named exactly like the source repositories.')
    options = parser.parse_args()
    if (ROOT / 'IMPORT_COMPLETE.json').exists():
        raise SystemExit('Sources have already been imported. Refusing to overwrite subsequent edits.')
    sources = json.loads((ROOT / 'SOURCE_MANIFEST.json').read_text())
    if set(sources) != set(ROLES):
        raise SystemExit('Unexpected source manifest.')
    ledger: dict[str, str] = {}
    with tempfile.TemporaryDirectory(prefix='kormic-import-', dir=ROOT) as temporary:
        temp = Path(temporary)
        staged = temp / 'apps'
        for role in ROLES:
            source = sources[role]
            repo, commit = source['repository'], source['commit']
            if not re.fullmatch(r'OneSmarterInc/[A-Za-z0-9_-]+', repo) or not re.fullmatch(r'[a-f0-9]{40}', commit):
                raise ValueError('Unexpected source repository or commit.')
            if options.repos_dir:
                checkout = options.repos_dir.resolve() / repo.split('/')[1]
                if not (checkout / '.git').exists():
                    raise ValueError(f'Local clone not found: {checkout}')
                actual = git('rev-parse', commit + '^{commit}', cwd=checkout).decode().strip()
            else:
                checkout = temp / ('repo-' + role)
                checkout.mkdir()
                git('init', '--quiet', str(checkout))
                print(f'Reading {repo} at {commit[:7]} using your Git authentication…', flush=True)
                git('fetch', '--depth=1', 'https://github.com/' + repo + '.git', commit, cwd=checkout)
                actual = git('rev-parse', 'FETCH_HEAD', cwd=checkout).decode().strip()
            if actual != commit:
                raise ValueError(f'Unexpected source commit for {role}.')
            expected = {}
            for row in git('ls-tree', '-r', '-z', commit, cwd=checkout).split(b'\0'):
                if not row:
                    continue
                meta, name = row.split(b'\t', 1)
                mode, kind, digest = meta.decode().split(' ')
                if kind != 'blob' or mode not in ('100644', '100755'):
                    raise ValueError('Review symlink or submodule before import: ' + name.decode())
                expected[name.decode()] = (digest, mode)
            archive = git('archive', '--format=tar', commit, cwd=checkout)
            with tarfile.open(fileobj=io.BytesIO(archive), mode='r:') as files:
                for member in files:
                    if member.isdir():
                        continue
                    path = PurePosixPath(member.name)
                    if not member.isfile() or path.is_absolute() or any(p in ('..', '.git') for p in path.parts):
                        raise ValueError('Unsafe archive member: ' + member.name)
                    if path.name == '.env' or (path.name.startswith('.env.') and path.name not in ('.env.example', '.env.sample', '.env.template')):
                        raise ValueError('Review environment file before public import: ' + member.name)
                    stream = files.extractfile(member)
                    if stream is None:
                        raise ValueError('Unreadable source file: ' + member.name)
                    data = stream.read()
                    if SECRET.search(data):
                        raise ValueError('Potential secret requires review: ' + member.name)
                    digest = blob_sha(data)
                    if expected.get(member.name, ('', ''))[0] != digest:
                        raise ValueError('Source hash mismatch: ' + member.name)
                    destination = staged / role / path
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(data)
                    if expected[member.name][1] == '100755':
                        destination.chmod(0o755)
                    ledger[f'apps/{role}/{path}'] = digest
            for name in expected:
                if f'apps/{role}/{name}' not in ledger:
                    raise ValueError('Archive omitted a tracked file: ' + name)
        changed = integrate(staged)
        # API and service files are deliberately absent from the change allowlist.
        for path, before in ledger.items():
            after = blob_sha((temp / path).read_bytes())
            if before != after and path not in changed:
                raise ValueError('Unexpected source change: ' + path)
        existing = ROOT / 'apps'
        old_ledger = json.loads((ROOT / 'SOURCE_FILES.json').read_text()) if (ROOT / 'SOURCE_FILES.json').exists() else {}
        if existing.exists():
            for path in existing.rglob('*'):
                if path.is_file():
                    rel = path.relative_to(ROOT).as_posix()
                    if old_ledger.get(rel) != blob_sha(path.read_bytes()):
                        raise ValueError('Existing local changes require review: ' + rel)
            backup = ROOT / 'apps.before-import'
            if backup.exists():
                raise ValueError('An existing apps.before-import backup must be reviewed first.')
            existing.rename(backup)
        staged.rename(existing)
        (ROOT / 'SOURCE_FILES.json').write_text(json.dumps(ledger, indent=2) + '\n')
        (ROOT / 'IMPORT_COMPLETE.json').write_text(json.dumps({'sources': sources, 'source_file_count': len(ledger), 'integration_files': changed}, indent=2) + '\n')
    print(f'Imported {len(ledger)} original files. Applied {len(changed)} entry/config changes; original API/service files unchanged.')
    print('Next: npm run setup && npm test && npm run build. Review the diff before committing and pushing.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, subprocess.CalledProcessError, OSError) as error:
        raise SystemExit(str(error)) from None
