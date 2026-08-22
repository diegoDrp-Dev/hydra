import assert from "node:assert/strict";
import test from "node:test";
import { assertAllowedScanTarget } from "../../dist/security/target-policy.js";

test("rejects non-HTTP protocols", async () => {
  await assert.rejects(assertAllowedScanTarget("file:///etc/passwd"));
});

test("rejects credentials embedded in targets", async () => {
  await assert.rejects(assertAllowedScanTarget("https://user:password@example.com"));
});

test("rejects loopback targets by default", async () => {
  await assert.rejects(assertAllowedScanTarget("http://127.0.0.1:4000"));
});

test("rejects malformed targets", async () => {
  await assert.rejects(assertAllowedScanTarget("not-a-url"));
});
