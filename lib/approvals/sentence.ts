/**
 * The verb a manager reads in "Cursor on Sara's laptop wants to <verb> <what>". A key under
 * `personal.approval.verbs`; an action we do not know reads as "use {action}" so nothing is hidden.
 */
export type ActionVerb =
  | "read"
  | "change"
  | "run"
  | "open"
  | "search"
  | "look"
  | "useTool"
  | "task"
  | "connect"
  | "secret"
  | "other";

const VERBS: Record<string, ActionVerb> = {
  read: "read",
  "file.read": "read",
  notebookread: "read",
  write: "change",
  edit: "change",
  multiedit: "change",
  notebookedit: "change",
  "file.write": "change",
  todowrite: "change",
  bash: "run",
  shell: "run",
  webfetch: "open",
  websearch: "search",
  glob: "look",
  grep: "look",
  ls: "look",
  mcp: "useTool",
  task: "task",
  "site.connect": "connect",
  "secret.use": "secret",
};

export function actionVerb(actionId: string): ActionVerb {
  return VERBS[actionId.toLowerCase()] ?? "other";
}
