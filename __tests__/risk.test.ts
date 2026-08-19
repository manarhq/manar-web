import { describe, expect, it } from "vitest";

import { RISK_BANDS, clampRiskScore, riskBandForScore } from "@/lib/risk";

describe("lib/risk", () => {
  it("covers every integer 0-100 with exactly one band", () => {
    for (let score = 0; score <= 100; score++) {
      const band = riskBandForScore(score);
      const matches = RISK_BANDS.filter((b) => score >= b.min && score <= b.max);
      expect(matches).toHaveLength(1);
      expect(band).toBe(matches[0].band);
    }
  });

  it("maps known thresholds to the expected band", () => {
    expect(riskBandForScore(0)).toBe("minimal");
    expect(riskBandForScore(19)).toBe("minimal");
    expect(riskBandForScore(20)).toBe("low");
    expect(riskBandForScore(39)).toBe("low");
    expect(riskBandForScore(40)).toBe("moderate");
    expect(riskBandForScore(59)).toBe("moderate");
    expect(riskBandForScore(60)).toBe("high");
    expect(riskBandForScore(79)).toBe("high");
    expect(riskBandForScore(80)).toBe("critical");
    expect(riskBandForScore(100)).toBe("critical");
  });

  it("clamps out-of-range and non-finite scores", () => {
    expect(clampRiskScore(-5)).toBe(0);
    expect(clampRiskScore(150)).toBe(100);
    expect(clampRiskScore(Number.NaN)).toBe(0);
    expect(clampRiskScore(42.6)).toBe(43);
  });
});
