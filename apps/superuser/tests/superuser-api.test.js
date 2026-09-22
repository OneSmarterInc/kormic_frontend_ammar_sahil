import test from "node:test";
import assert from "node:assert/strict";

import client from "../src/api/client.js";
import {
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
