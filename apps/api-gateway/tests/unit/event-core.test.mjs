import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEvent } from "../../dist/modules/events/event-normalizer.js";
import { evaluateConditions } from "../../dist/modules/detections/detection-engine.js";

const input = {
  timestamp: "2026-08-22T12:00:00.000Z",
  source: " Sysmon ", sourceType: " Windows ", category: " Process ", action: " Start ",
  severity: "HIGH", process: { name: "powershell.exe", pid: 42 }, rawEvent: { eventId: 1 },
};

test("normalizes fields and produces stable deduplication keys", () => {
  const first = normalizeEvent(input);
  const second = normalizeEvent({ ...input, rawEvent: { eventId: 1 } });
  assert.equal(first.source, "sysmon");
  assert.equal(first.severity, "high");
  assert.equal(first.deduplicationKey, second.deduplicationKey);
});

test("rejects invalid event timestamps", () => {
  assert.throws(() => normalizeEvent({ ...input, timestamp: "invalid" }));
});

test("evaluates nested all and any detection conditions", () => {
  const result = evaluateConditions(normalizeEvent(input), {
    all: [{ field: "process.name", operator: "equals", value: "powershell.exe" }],
    any: [
      { field: "process.pid", operator: "gte", value: 100 },
      { field: "severity", operator: "in", value: ["high", "critical"] },
    ],
  });
  assert.equal(result.matched, true);
  assert.equal(result.evaluated.length, 3);
});

test("fails closed for unknown operators", () => {
  const result = evaluateConditions(input, { all: [{ field: "source", operator: "unknown", value: "Sysmon" }] });
  assert.equal(result.matched, false);
});
