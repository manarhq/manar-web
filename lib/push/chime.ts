const KEY = "manar.chime";

/** Decision #59: sound is off unless the person turned it on. */
export function chimeEnabled(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(KEY) === "on";
}

export function setChime(storage: Pick<Storage, "setItem" | "removeItem">, on: boolean) {
  if (on) storage.setItem(KEY, "on");
  else storage.removeItem(KEY);
}

/** One short, low, soft tone (about 0.25 s at 440 Hz, quiet). No audio file. */
export function playChime(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
    osc.onended = () => void ctx.close();
  } catch {
    // No sound is the safe failure.
  }
}
