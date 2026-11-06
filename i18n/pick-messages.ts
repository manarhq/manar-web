type Tree = { [key: string]: unknown };

/** Copies only the given dotted paths ("common.actions", "nav") out of a messages tree. */
export function pickMessages(messages: Tree, paths: readonly string[]): Tree {
  const out: Tree = {};
  for (const path of paths) {
    const keys = path.split(".");
    let from: unknown = messages;
    for (const k of keys) from = (from as Tree | undefined)?.[k];
    if (from === undefined) continue;
    let to = out;
    keys.slice(0, -1).forEach((k) => {
      to = (to[k] ??= {}) as Tree;
    });
    to[keys[keys.length - 1]] = from;
  }
  return out;
}

/** Deep merge; `b` wins. Arrays and strings are replaced, objects are merged. */
export function mergeMessages(a: Tree, b: Tree): Tree {
  const out: Tree = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] =
      v && cur && typeof v === "object" && typeof cur === "object" && !Array.isArray(v)
        ? mergeMessages(cur as Tree, v as Tree)
        : v;
  }
  return out;
}
