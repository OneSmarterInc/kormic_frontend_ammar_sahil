import test from 'node:test';
import assert from 'node:assert/strict';
import { apiOrigin, AuthError, createAuthClient, isPortal, roleHome, safeDestination } from '../shared/auth.mjs';

const user = role => ({ role, university_id: 'uni-24' });
for (const [role, target] of Object.entries({student:'/student/',university:'/university/#/university/uni-24/dashboard',institute:'/institute/#/institute/dashboard',superuser:'/superuser/#/admin/dashboard'})) {
  test(`${role}: server role maps to its existing dashboard`, () => assert.equal(roleHome(user(role)), target));
}
test('unknown role is rejected', () => assert.throws(() => roleHome({role:'admin'}), AuthError));
for (const id of [undefined,'','../other','a/b','a?b','<script>']) test(`invalid university ID ${id}`, () => assert.throws(() => roleHome({role:'university',university_id:id}), AuthError));
for (const next of ['https://evil.example/','//evil.example/','/\\evil.example/','/superuser/#/admin/dashboard','/university/#/university/other/dashboard','/university/#/university/uni-24/../other','/university/?token=bad#/university/uni-24/dashboard','/university/#/university/uni-24/%2e%2e/other','/university/#/university/uni-24/%0a','/university/#%E0%A4%A']) {
  test(`unsafe return target rejected: ${next}`, () => assert.equal(safeDestination(user('university'),next),roleHome(user('university'))));
}
test('own university nested route is retained', () => assert.equal(safeDestination(user('university'),'/university/#/university/uni-24/settings/profile'),'/university/#/university/uni-24/settings/profile'));
test('student chooses its own onboarding route', () => assert.equal(safeDestination(user('student'),'/student/#admin'),'/student/'));
test('superuser valid detail route retained', () => assert.equal(safeDestination(user('superuser'),'/superuser/#/admin/students/24'),'/superuser/#/admin/students/24'));
test('backend origin normalizes trailing slash', () => assert.equal(apiOrigin('https://backend.kormic.ai/'),'https://backend.kormic.ai'));
for(const invalid of ['http://remote.example','https://name:password@backend.example','https://backend.example/api','https://backend.example/?secret=x','not-a-url'])test(`invalid backend configuration ${invalid}`, () => assert.throws(() => apiOrigin(invalid),AuthError));
test('local HTTP development is permitted',()=>assert.equal(apiOrigin('http://127.0.0.1:8000'),'http://127.0.0.1:8000'));
test('portal validation is exact',()=>{assert.equal(isPortal('superuser'),true);assert.equal(isPortal('administrator'),false);assert.equal(isPortal('__proto__'),false)});

function mockClient(responses) {
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,options,body:options.body?JSON.parse(options.body):undefined});
    const next=responses.shift();
    assert.ok(next,`Unexpected request ${url}`);
    if(next instanceof Error)throw next;
    return {ok:(next.status??200)>=200&&(next.status??200)<300,status:next.status??200,json:async()=>next.data??{}};
  };
  return {client:createAuthClient({origin:'https://backend.kormic.ai',fetchImpl}),calls};
}
test('password login preserves CSRF + cookie endpoint and password whitespace',async()=>{
  const {client,calls}=mockClient([{data:{csrfToken:'csrf'}},{data:{totp_required:true,mfa_token:'mfa'}}]);
  const result=await client.login('institute',' name@example.com ',' pass ');
  assert.equal(result.mfa_token,'mfa');
  assert.deepEqual(calls.map(c=>c.url),['https://backend.kormic.ai/api/auth/web/csrf/','https://backend.kormic.ai/api/auth/web/login/']);
  assert.deepEqual(calls[1].body,{email:'name@example.com',password:' pass ',portal:'institute'});
  assert.equal(calls[1].options.headers['X-CSRFToken'],'csrf');
  assert.equal(calls[1].options.credentials,'include');
  assert.equal(calls[1].options.redirect,'error');
});
test('unknown portal does not make a network request',async()=>{
  const {client,calls}=mockClient([]);await assert.rejects(()=>client.login('bad','a','b'));assert.equal(calls.length,0);
});
test('missing CSRF blocks the credential request',async()=>{
  const{client,calls}=mockClient([{data:{}}]);await assert.rejects(()=>client.login('student','a','b'),/CSRF/);assert.equal(calls.length,1);
});
test('MFA preserves portal and challenge, never sends a refresh token',async()=>{
  const{client,calls}=mockClient([{data:{csrfToken:'csrf'}},{data:{access:'access'}}]);await client.verifyTotp('student','challenge',' backup-1 ');
  assert.equal(calls[1].url,'https://backend.kormic.ai/api/auth/web/verify-totp/');assert.deepEqual(calls[1].body,{mfa_token:'challenge',code:'backup-1',portal:'student'});
});
test('cookie restoration must succeed before /me and dashboard routing',async()=>{
  const{client,calls}=mockClient([{data:{csrfToken:'csrf'}},{data:{access:'memory-access'}},{data:user('university')}]);
  assert.equal((await client.confirmSession('university')).role,'university');
  assert.equal(calls[1].url,'https://backend.kormic.ai/api/auth/web/refresh/');
  assert.equal(calls[2].url,'https://backend.kormic.ai/api/auth/me/');assert.equal(calls[2].options.headers.Authorization,'Bearer memory-access');
});
test('cookie rejection never reaches /me or a dashboard',async()=>{
  const{client,calls}=mockClient([{data:{csrfToken:'csrf'}},{status:401,data:{detail:'Session expired.'}}]);
  await assert.rejects(()=>client.confirmSession('student'),e=>e.status===401);assert.equal(calls.length,2);
});
test('wrong server role is denied and selected portal cookie revoked',async()=>{
  const{client,calls}=mockClient([{data:{csrfToken:'csrf'}},{data:{access:'access'}},{data:user('superuser')},{data:{csrfToken:'csrf'}},{status:204}]);
  await assert.rejects(()=>client.confirmSession('student'),e=>e.status===403);
  assert.equal(calls.at(-1).url,'https://backend.kormic.ai/api/auth/web/logout/');
});
test('logout accepts empty 204 response',async()=>{
  const{client}=mockClient([{data:{csrfToken:'csrf'}},{status:204}]);assert.deepEqual(await client.logout('institute'),{});
});
test('TOTP enrollment uses the existing bearer-token endpoint',async()=>{
  const{client,calls}=mockClient([{data:{secret:'EXAMPLE'}},{data:{backup_codes:['one-use']}}]);
  await client.enroll('temporary-access');await client.verifyEnrollment('temporary-access',' 123456 ');
  assert.equal(calls[0].url,'https://backend.kormic.ai/api/auth/totp/enroll/');assert.equal(calls[0].options.headers.Authorization,'Bearer temporary-access');
  assert.equal(calls[1].url,'https://backend.kormic.ai/api/auth/totp/verify-enrollment/');assert.deepEqual(calls[1].body,{code:'123456'});
});
test('password reset calls all three original endpoints with original fields',async()=>{
  const{client,calls}=mockClient([{data:{}},{data:{reset_token:'reset'}},{data:{}}]);
  await client.forgotPassword(' x@example.com ');await client.verifyResetOtp('x@example.com',' 222222 ');await client.resetPassword('reset','new value');
  assert.deepEqual(calls.map(c=>c.url.split('/api')[1]),['/auth/forgot-password/','/auth/reset-password/verify-otp/','/auth/reset-password/confirm/']);
  assert.deepEqual(calls[2].body,{reset_token:'reset',new_password:'new value'});
});
test('server error details are not exposed',async()=>{
  const{client}=mockClient([{status:500,data:{detail:'database password secret'}}]);await assert.rejects(()=>client.forgotPassword('a'),e=>e.status===500&&!e.message.includes('secret'));
});
test('rate-limit errors are readable',async()=>{
  const{client}=mockClient([{status:429}]);await assert.rejects(()=>client.forgotPassword('a'),/Too many/);
});
test('network exceptions do not expose raw transport details',async()=>{
  const{client}=mockClient([new Error('private network detail')]);await assert.rejects(()=>client.forgotPassword('a'),/Cannot connect/);
});
test('malformed JSON is handled',async()=>{
  const client=createAuthClient({origin:'https://backend.kormic.ai',fetchImpl:async()=>({ok:true,status:200,json:async()=>{throw new Error('bad')}})});
  await assert.rejects(()=>client.forgotPassword('a'),/unreadable/);
});
test('timeout aborts a hanging fetch',async()=>{
  const client=createAuthClient({origin:'https://backend.kormic.ai',timeoutMs:5,fetchImpl:async(_url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
  await assert.rejects(()=>client.forgotPassword('a'),/timed out/);
});
