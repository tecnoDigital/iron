import assert from "node:assert/strict";
import { test } from "node:test";

import { mapGoogleConnectionToAuthState } from "../modules/google/google.state";

test("maps connected status to GOOGLE_CONNECTED", () => {
  assert.equal(mapGoogleConnectionToAuthState("connected"), "GOOGLE_CONNECTED");
});

test("maps reauth_required status to REAUTH_REQUIRED", () => {
  assert.equal(mapGoogleConnectionToAuthState("reauth_required"), "REAUTH_REQUIRED");
});

test("maps no_google_auth status to NO_GOOGLE_AUTH", () => {
  assert.equal(mapGoogleConnectionToAuthState("no_google_auth"), "NO_GOOGLE_AUTH");
});
