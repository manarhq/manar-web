import prettier from "prettier";

/**
 * Formats generated TypeScript with the repo's prettier config, so the committed
 * (lint-staged formatted) schema.d.ts and a fresh generation compare equal.
 */
export async function formatGenerated(source, filepath) {
  const config = (await prettier.resolveConfig(filepath)) ?? {};
  return prettier.format(source, { ...config, filepath });
}

/** True when the committed file matches a fresh generation, ignoring formatting. */
export async function matchesGenerated(existing, generated, filepath) {
  return (
    (await formatGenerated(existing, filepath)) === (await formatGenerated(generated, filepath))
  );
}
