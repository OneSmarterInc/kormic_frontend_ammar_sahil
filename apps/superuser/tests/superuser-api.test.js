import test from "node:test";
import assert from "node:assert/strict";

import client from "../src/api/client.js";
import {
  listAuditLog, listStudents, listUniversities, listUsers, getDashboard,
  removeUserTotp,
  resetUserPassword,
  revokeUserSessions,
} from "../src/api/superuserApi.js";

function withPostStub(assertion) {
  const original = client.post;
  client.post = async (url, body) => {
    assertion(url, body);
    return { data: { ok: true } };
  };
  return () => {
    client.post = original;
  };
}

test("removeUserTotp targets the encoded destructive endpoint", async () => {
  const restore = withPostStub((url, body) => {
    assert.equal(url, "/superuser/users/user%2F42/remove-totp/");
    assert.equal(body, undefined);
  });
  try {
    assert.deepEqual(await removeUserTotp("user/42"), { ok: true });
  } finally {
    restore();
  }
});

test("resetUserPassword sends only the new password to the encoded user endpoint", async () => {
  const restore = withPostStub((url, body) => {
    assert.equal(url, "/superuser/users/user%2F42/reset-password/");
    assert.deepEqual(body, { password: "Replacement-Password-123!" });
  });
  try {
    assert.deepEqual(
      await resetUserPassword("user/42", "Replacement-Password-123!"),
      { ok: true },
    );
  } finally {
    restore();
  }
});

test("revokeUserSessions targets the encoded destructive endpoint", async () => {
  const restore = withPostStub((url, body) => {
    assert.equal(url, "/superuser/users/user%2F42/revoke-sessions/");
    assert.equal(body, undefined);
  });
  try {
    assert.deepEqual(await revokeUserSessions("user/42"), { ok: true });
  } finally {
    restore();
  }
});


test('list adapters forward pagination, email and audit cursor to the server', async () => {
  const calls = [];
  const original = client.get;
  client.get = async (url, options) => {calls.push([url, options?.params]); return {data:{}};};
  try {
    await listAuditLog({email:'older@example.test', before_id:42, limit:25});
    await listStudents('student', 2);
    await listUniversities('college', 3);
    await listUsers({role:'student', search:'person', page:4});
    await getDashboard();
    assert.deepEqual(calls, [
      ['/superuser/audit-log/', {email:'older@example.test', before_id:42, limit:25}],
      ['/superuser/students/', {search:'student', page:2}],
      ['/superuser/universities/', {search:'college', page:3}],
      ['/superuser/users/', {role:'student', search:'person', page:4}],
      ['/superuser/dashboard/', undefined],
    ]);
  } finally {client.get = original;}
});
