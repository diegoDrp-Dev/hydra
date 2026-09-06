import assert from "node:assert/strict";
import test from "node:test";
import { assertAllowedWebhookUrl } from "../../dist/security/webhook-policy.js";

test("rejects non-HTTPS webhook targets", async () => {
  await assert.rejects(assertAllowedWebhookUrl("http://example.com/hook"), /HTTPS/);
});

test("rejects credentials embedded in webhook targets", async () => {
  await assert.rejects(assertAllowedWebhookUrl("https://user:password@example.com/hook"), /Credentials/);
});

test("rejects loopback webhook targets", async () => {
  await assert.rejects(assertAllowedWebhookUrl("https://127.0.0.1/hook"), /private or reserved/);
});
