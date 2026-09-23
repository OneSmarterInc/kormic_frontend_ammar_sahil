import { AuthError, createAuthClient, isPortal, safeDestination } from '/shared/auth.mjs';
const $ = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);
if (isPortal(query.get('portal'))) $('portal').value = query.get('portal');
let client;
try { client = createAuthClient({ origin: window.KORMIC_CONFIG?.apiOrigin }); }
catch (error) { $('error').textContent = error.message; $('error').hidden = false; $('password-form').querySelector('button[type=submit]').disabled = true; }
let pending = false;
let mfaToken = '';
let enrollmentAccess = '';
let resetToken = '';
let activePortal = '';
const panels = ['password-form','totp-form','enroll-form','backup-panel','forgot-form','reset-otp-form','reset-password-form'];
function message(id, text = '') { $(id).textContent = text; $(id).hidden = !text; }
function show(panel, title, description) {
  for (const name of panels) $(name).hidden = name !== panel;
  $('form-title').textContent = title;
  $('form-description').textContent = description;
  message('error'); message('notice');
  $(panel).querySelector('input:not([type=checkbox]),select')?.focus();
}
function clearSecrets() {
  mfaToken = ''; enrollmentAccess = ''; resetToken = '';
  for (const id of ['password','totp-code','enroll-code','reset-otp','new-password','confirm-password']) $(id).value = '';
  $('setup-key').textContent = ''; $('backup-codes').textContent = ''; $('setup-qr').replaceChildren(); $('manual-setup').hidden = true; $('manual-setup-toggle').setAttribute('aria-expanded', 'false');
  $('saved-codes').checked = false; $('finish-enrollment').disabled = true;
}
function back() { clearSecrets(); show('password-form','Kormic Login','Select your Kormic role. We’ll open the correct workspace after you sign in.'); }
async function run(form, action) {
  if (pending || !client) return;
  pending = true;
  message('error');
  const controls = [...$('forms').querySelectorAll('button,input,select')].map(el => [el, el.disabled]);
  for (const [el] of controls) el.disabled = true;
  form.setAttribute('aria-busy','true');
  try { await action(); }
  catch (error) { message('error', error instanceof AuthError ? error.message : 'Something went wrong. Please try again.'); }
  finally {
    for (const [el, disabled] of controls) el.disabled = disabled;
    $('finish-enrollment').disabled = !$('saved-codes').checked;
    form.removeAttribute('aria-busy'); pending = false;
  }
}
async function finish() {
  let user;
  try { user = await client.confirmSession(activePortal); }
  catch (error) {
    if (error.status === 401) throw new AuthError('Your browser could not restore the sign-in cookie. The frontend and backend must use a same-site HTTPS setup, and cookies must be allowed.');
    throw error;
  }
  const destination = safeDestination(user, query.get('next'), location.origin);
  clearSecrets();
  location.replace(destination);
}
$('password-form').addEventListener('submit', (event) => {
  event.preventDefault();
  run(event.currentTarget, async () => {
    activePortal = $('portal').value;
    const password = $('password').value;
    const email = $('email').value;
    let result;
    try { result = await client.login(activePortal, email, password); }
    finally { $('password').value = ''; }
    if (result.must_enroll_totp && result.access) {
      enrollmentAccess = result.access;
      const enrollment = await client.enroll(enrollmentAccess);
      if (typeof enrollment.secret !== 'string' || !enrollment.secret || typeof enrollment.provisioning_uri !== 'string' || !enrollment.provisioning_uri) {
        throw new AuthError('The backend did not return a complete TOTP enrollment configuration.');
      }
      show('enroll-form','Secure your account','Scan the QR code with your authenticator app, or use manual setup below.');
      $('setup-qr').setAttribute('data-value', enrollment.provisioning_uri);
      $('setup-qr').replaceChildren();
      const qrFrame = document.createElement('div');
      qrFrame.className = 'setup-qr-frame';
      const qr = document.createElement('img');
      qr.alt = 'TOTP enrollment QR code';
      qr.width = 220;
      qr.height = 220;
      qr.src = '/api/auth/totp/qr/?data=' + encodeURIComponent(enrollment.provisioning_uri);
      const logo = document.createElement('img');
      logo.className = 'setup-qr-logo';
      logo.src = '/favicon.svg';
      logo.alt = '';
      logo.setAttribute('aria-hidden', 'true');
      qrFrame.append(qr, logo);
      $('setup-qr').appendChild(qrFrame);
      $('setup-key').textContent = enrollment.secret;
      $('manual-setup').hidden = true;
      $('manual-setup-toggle').setAttribute('aria-expanded', 'false');
    } else if (result.totp_required && result.mfa_token) {
      mfaToken = result.mfa_token;
      show('totp-form','Verify it’s you','Enter the code from your authenticator app, or one unused backup code.');
    } else if (result.access) { await finish(); }
    else throw new AuthError('The backend returned an unsupported sign-in response.');
  });
});
$('totp-form').addEventListener('submit', (event) => {
  event.preventDefault();
  run(event.currentTarget, async () => {
    await client.verifyTotp(activePortal, mfaToken, $('totp-code').value);
    $('totp-code').value = ''; mfaToken = '';
    try { await finish(); } catch (error) { back(); throw error; }
  });
});
$('enroll-form').addEventListener('submit', (event) => {
  event.preventDefault();
  run(event.currentTarget, async () => {
    const result = await client.verifyEnrollment(enrollmentAccess, $('enroll-code').value);
    if (!Array.isArray(result.backup_codes) || result.backup_codes.some(c => typeof c !== 'string') || !result.backup_codes.length) throw new AuthError('Enrollment completed, but no backup codes were returned. Contact support before signing out.');
    show('backup-panel','Save your backup codes','Keep these codes in a safe place, not in a shared document.');
    $('backup-codes').textContent = result.backup_codes.join('\n');
    enrollmentAccess = ''; $('setup-key').textContent = ''; $('enroll-code').value = '';
  });
});
$('saved-codes').addEventListener('change', () => { $('finish-enrollment').disabled = !$('saved-codes').checked; });
$('finish-enrollment').addEventListener('click', () => {
  if (!$('saved-codes').checked) return;
  back(); message('notice','Two-factor authentication is enabled. Sign in with your password and an authenticator code to start your browser session.');
});
$('forgot').addEventListener('click', () => { $('reset-email').value = $('email').value; clearSecrets(); show('forgot-form','Reset your password','We’ll send a reset code when an eligible account exists.'); });
$('forgot-form').addEventListener('submit', (event) => { event.preventDefault(); run(event.currentTarget, async () => {
  await client.forgotPassword($('reset-email').value);
  show('reset-otp-form','Check your email','Enter the reset code sent to your account email. Check your spam folder too.');
}); });
$('reset-otp-form').addEventListener('submit', (event) => { event.preventDefault(); run(event.currentTarget, async () => {
  const result = await client.verifyResetOtp($('reset-email').value, $('reset-otp').value);
  if (typeof result.reset_token !== 'string' || !result.reset_token) throw new AuthError('The backend did not return a password-reset token.');
  resetToken = result.reset_token; $('reset-otp').value = '';
  show('reset-password-form','Choose a new password','Your existing sessions will be invalidated after the password is reset.');
}); });
$('reset-password-form').addEventListener('submit', (event) => { event.preventDefault(); run(event.currentTarget, async () => {
  if ($('new-password').value !== $('confirm-password').value) throw new AuthError('The passwords do not match.');
  await client.resetPassword(resetToken, $('new-password').value);
  $('email').value = $('reset-email').value;
  back(); message('notice','Your password has been reset. Sign in using the new password.');
}); });
for (const el of document.querySelectorAll('.back')) el.addEventListener('click', back);
$('show-password').addEventListener('click', () => {
  const show = $('password').type === 'password';
  $('password').type = show ? 'text' : 'password';
  $('show-password').textContent = show ? 'Hide' : 'Show';
  $('show-password').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  $('show-password').setAttribute('aria-pressed', String(show));
});
$('manual-setup-toggle').addEventListener('click', () => {
  const expanded = !$('manual-setup').hidden;
  $('manual-setup').hidden = expanded;
  $('manual-setup-toggle').setAttribute('aria-expanded', String(!expanded));
});
for (const [button, target] of [['copy-key','setup-key'],['copy-codes','backup-codes']]) $(button).addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($(target).textContent); message('notice','Copied. Store this somewhere safe.'); }
  catch { message('error','Copy is unavailable in this browser. Select and copy the text manually.'); }
});
// Prevent browser back/forward cache from resurrecting secrets or a completed MFA challenge.
addEventListener('pagehide', clearSecrets);
addEventListener('pageshow', event => { if (event.persisted) back(); });

function studentLinks() { $('student-links').hidden = $('portal').value !== 'student'; }
$('portal').addEventListener('change', studentLinks); studentLinks();
