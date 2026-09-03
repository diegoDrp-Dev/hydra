export const SOAR_ACTIONS = ["create_case", "add_case_note", "set_alert_status"] as const;
export type SoarAction = { type: typeof SOAR_ACTIONS[number]; title?: string; content?: string; caseId?: string; alertId?: string; status?: string };

export function validateSoarActions(value: unknown): SoarAction[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) throw new Error("Invalid SOAR action list");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Invalid SOAR action");
    const action = entry as Record<string, unknown>;
    if (!SOAR_ACTIONS.includes(action.type as SoarAction["type"])) throw new Error("Unsupported SOAR action");
    if (action.type === "add_case_note" && (typeof action.caseId !== "string" || typeof action.content !== "string")) throw new Error("Incomplete add_case_note action");
    if (action.type === "set_alert_status" && (typeof action.alertId !== "string" || typeof action.status !== "string")) throw new Error("Incomplete set_alert_status action");
    return action as SoarAction;
  });
}
