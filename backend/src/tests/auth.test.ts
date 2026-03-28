import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

const tempDir = join(process.cwd(), "tmp-tests");
const dbPath = join(tempDir, "auth-audit.sqlite");

if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.SESSION_SECRET = "session-secret-test";
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "google-token-secret-test";
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_MAX_AGE_MINUTES = "120";
process.env.SESSION_IDLE_TIMEOUT_MINUTES = "30";
process.env.ALLOWED_EMAIL_1 = "operador1@ironpay.test";
process.env.ALLOWED_EMAIL_2 = "operador2@ironpay.test";

const resetDatabase = (): void => {
  rmSync(dbPath, { force: true });
};

test("buildHealthPayload returns todo correcto for port 3000", async () => {
  const { buildHealthPayload } = await import("../app");

  const payload = buildHealthPayload(3000);

  assert.deepEqual(payload, { status: "ok", message: "todo correcto" });
});

test("audit service stores login success in audit_logs table", async () => {
  resetDatabase();

  const { AuditService } = await import("../modules/audit/audit.service");
  const { AUTH_AUDIT_ACTIONS } = await import("../modules/auth/auth.audit");

  const service = new AuditService();

  service.record({
    action: AUTH_AUDIT_ACTIONS.LOGIN_SUCCESS,
    entityType: "auth",
    entityId: "session-123",
    metadata: { email: "operador1@ironpay.test", reason: "unit-test" }
  });

  const db = new DatabaseSync(dbPath);
  const row = db
    .prepare("SELECT action, entity_type, entity_id, metadata_json FROM audit_logs ORDER BY id DESC LIMIT 1")
    .get() as {
    action: string;
    entity_type: string;
    entity_id: string;
    metadata_json: string | null;
  };
  db.close();

  assert.equal(row.action, AUTH_AUDIT_ACTIONS.LOGIN_SUCCESS);
  assert.equal(row.entity_type, "auth");
  assert.equal(row.entity_id, "session-123");
  assert.ok(row.metadata_json);

  const metadata = JSON.parse(row.metadata_json ?? "{}");
  assert.equal(metadata.email, "operador1@ironpay.test");
  assert.equal(metadata.reason, "unit-test");
});
