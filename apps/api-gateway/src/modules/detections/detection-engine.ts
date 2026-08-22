export type DetectionOperator = "equals" | "not_equals" | "contains" | "in" | "gte" | "lte" | "exists";

export interface DetectionCondition {
  field: string;
  operator: DetectionOperator;
  value?: unknown;
}

export interface DetectionConditions {
  all?: DetectionCondition[];
  any?: DetectionCondition[];
}

function readPath(input: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    return (value as Record<string, unknown>)[key];
  }, input);
}

function matchesCondition(event: unknown, condition: DetectionCondition): boolean {
  const actual = readPath(event, condition.field);
  switch (condition.operator) {
    case "equals": return actual === condition.value;
    case "not_equals": return actual !== condition.value;
    case "contains": return typeof actual === "string" && typeof condition.value === "string" && actual.includes(condition.value);
    case "in": return Array.isArray(condition.value) && condition.value.includes(actual);
    case "gte": return typeof actual === "number" && typeof condition.value === "number" && actual >= condition.value;
    case "lte": return typeof actual === "number" && typeof condition.value === "number" && actual <= condition.value;
    case "exists": return condition.value === false ? actual === undefined : actual !== undefined;
    default: return false;
  }
}

export function evaluateConditions(event: unknown, conditions: DetectionConditions): {
  matched: boolean;
  evaluated: Array<DetectionCondition & { matched: boolean }>;
} {
  const all = conditions.all ?? [];
  const any = conditions.any ?? [];
  const evaluatedAll = all.map((condition) => ({ ...condition, matched: matchesCondition(event, condition) }));
  const evaluatedAny = any.map((condition) => ({ ...condition, matched: matchesCondition(event, condition) }));
  return {
    matched: evaluatedAll.every(({ matched }) => matched) && (evaluatedAny.length === 0 || evaluatedAny.some(({ matched }) => matched)),
    evaluated: [...evaluatedAll, ...evaluatedAny],
  };
}
