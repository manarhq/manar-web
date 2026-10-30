import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DECISION_KEYS_ARM_MS, useDecisionKeys } from "@/hooks/use-decision-keys";

const approve = vi.fn();
const deny = vi.fn();

function Harness({ id = "r1" }: { id?: string }) {
  useDecisionKeys({ requestId: id, onApprove: approve, onDeny: deny });
  return (
    <div>
      <input aria-label="note" />
      <div contentEditable suppressContentEditableWarning aria-label="rich" />
    </div>
  );
}

const arm = () => act(() => void vi.advanceTimersByTime(DECISION_KEYS_ARM_MS + 1));
const press = (key: string, init: KeyboardEventInit = {}, target: Element = document.body) => {
  fireEvent.keyDown(target, { key, ...init });
  fireEvent.keyUp(target, { key });
};

beforeEach(() => {
  vi.useFakeTimers();
  approve.mockReset();
  deny.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useDecisionKeys", () => {
  it("is not armed until 750 ms after the request rendered", () => {
    render(<Harness />);
    press("a");
    expect(approve).not.toHaveBeenCalled();
    arm();
    press("a");
    expect(approve).toHaveBeenCalledTimes(1);
    press("d");
    expect(deny).toHaveBeenCalledTimes(1);
  });

  it("re-arms the delay when the request changes", () => {
    const { rerender } = render(<Harness id="r1" />);
    arm();
    rerender(<Harness id="r2" />);
    press("a");
    expect(approve).not.toHaveBeenCalled();
    arm();
    press("a");
    expect(approve).toHaveBeenCalledTimes(1);
  });

  it("ignores text fields, contenteditable, modifiers and auto-repeat", () => {
    render(<Harness />);
    arm();
    press("a", {}, screen.getByLabelText("note"));
    press("a", {}, screen.getByLabelText("rich"));
    for (const mod of ["ctrlKey", "metaKey", "altKey", "shiftKey"]) press("a", { [mod]: true });
    fireEvent.keyDown(document.body, { key: "a", repeat: true });
    expect(approve).not.toHaveBeenCalled();
  });

  it("ignores the key while focus is in a field even if the event targets the body", () => {
    render(<Harness />);
    arm();
    screen.getByLabelText("note").focus();
    press("d");
    expect(deny).not.toHaveBeenCalled();
  });

  it("ignores the key while a dialog or menu is open", () => {
    render(
      <>
        <Harness />
        <div role="dialog" />
      </>,
    );
    arm();
    press("a");
    expect(approve).not.toHaveBeenCalled();
    cleanup();
    render(
      <>
        <Harness />
        <button aria-haspopup="menu" aria-expanded="true" />
      </>,
    );
    arm();
    press("a");
    expect(approve).not.toHaveBeenCalled();
  });

  it("needs a key release between decisions", () => {
    render(<Harness />);
    arm();
    fireEvent.keyDown(document.body, { key: "a" });
    fireEvent.keyDown(document.body, { key: "d" });
    expect(approve).toHaveBeenCalledTimes(1);
    expect(deny).not.toHaveBeenCalled();
    fireEvent.keyUp(document.body, { key: "a" });
    fireEvent.keyDown(document.body, { key: "d" });
    expect(deny).toHaveBeenCalledTimes(1);
  });
});
