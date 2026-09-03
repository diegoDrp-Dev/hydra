import assert from "node:assert/strict";
import test from "node:test";
import { validateSoarActions } from "../../dist/modules/operations/soar-policy.js";

test("accepts only the controlled SOAR action set", () => {
  assert.equal(validateSoarActions([{ type: "create_case", title: "Investigate" }]).length, 1);
});

test("rejects arbitrary command execution", () => {
  assert.throws(() => validateSoarActions([{ type: "shell", command: "whoami" }]));
});

test("rejects incomplete target mutations", () => {
  assert.throws(() => validateSoarActions([{ type: "set_alert_status", status: "closed" }]));
});
