/**
 * Text an agent wrote (a resource, a command, a parameter) is shown as plain text, never markup
 * (React escapes it), and is cleaned first so it cannot pretend to be something else:
 * - control characters and bidi controls (U+202E "right-to-left override" and friends, zero-width
 *   characters) become a visible U+FFFD, so `report-weekly‮fdp.exe` cannot read as a PDF;
 * - runs of whitespace collapse, so padding cannot push the real end of a value out of view;
 * - long values are cut, and say so.
 * `flagged` is true when anything was replaced: the card then warns the approver.
 * Render the result inside <bdi> so it never reorders the sentence around it.
 */
const HIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F؜​-‏‪-‮⁠-⁩﻿]/g;

export interface CleanText {
  text: string;
  flagged: boolean;
  truncated: boolean;
}

export function cleanAgentText(value: string, max = 300): CleanText {
  let flagged = false;
  let text = value.replace(HIDDEN, () => {
    flagged = true;
    return "�";
  });
  text = text.replace(/[\t\n\r ]{2,}/g, " ").trim();
  const truncated = text.length > max;
  if (truncated) text = `${text.slice(0, max)}…`;
  return { text, flagged, truncated };
}
