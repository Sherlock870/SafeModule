import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeFallbackAssessment } from "@/lib/risk-fallback";

const prisma = {
  alert: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  telemetry: {
    findMany: vi.fn(),
  },
};

const tryLlmAssessment = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/llm-seam", () => ({ tryLlmAssessment }));

const { runRiskAssessment } = await import("@/lib/risk-assessment");

describe("computeFallbackAssessment", () => {
  it("treats a manual SOS as high risk without telemetry", () => {
    expect(computeFallbackAssessment("MANUAL_SOS", [])).toEqual({
      riskLevel: "HIGH",
      riskConfidence: 0.6,
      triggeringSignals: ["manual_sos"],
      rationale: "Manual SOS button pressed; no recent heart-rate telemetry available.",
      recommendedAction: "Dispatch nearest guardian immediately and attempt contact.",
    });
  });

  it("raises voice distress to high risk for elevated average heart rate", () => {
    const result = computeFallbackAssessment("VOICE_DISTRESS", [105, 110, 102]);

    expect(result.riskLevel).toBe("HIGH");
    expect(result.riskConfidence).toBe(0.7);
    expect(result.triggeringSignals).toEqual([
      "voice_distress",
      "elevated_heart_rate",
    ]);
    expect(result.rationale).toContain("averaging 106bpm");
  });

  it("raises any trigger to critical for critically elevated heart rate", () => {
    const result = computeFallbackAssessment("MANUAL_SOS", [92, 164]);

    expect(result.riskLevel).toBe("CRITICAL");
    expect(result.riskConfidence).toBe(0.85);
    expect(result.triggeringSignals).toContain("critically_elevated_heart_rate");
    expect(result.recommendedAction).toContain("Immediate dispatch");
  });

  it("uses only the ten most recent readings", () => {
    const result = computeFallbackAssessment("VOICE_DISTRESS", [
      140,
      140,
      140,
      140,
      140,
      140,
      140,
      140,
      140,
      140,
      70,
    ]);

    expect(result.riskLevel).toBe("CRITICAL");
    expect(result.rationale).toContain("averaging 140bpm");
  });
});

describe("runRiskAssessment", () => {
  const alert = {
    id: "alert-1",
    deviceId: "device-1",
    triggerType: "VOICE_DISTRESS" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.alert.update.mockResolvedValue({});
    prisma.alert.findUnique.mockResolvedValue(alert);
    prisma.telemetry.findMany.mockResolvedValue([
      { heartRate: 145 },
      { heartRate: 150 },
    ]);
  });

  it("persists a successful LLM assessment", async () => {
    const llmResult = {
      riskLevel: "HIGH" as const,
      riskConfidence: 0.91,
      triggeringSignals: ["voice_distress"],
      rationale: "The voice trigger indicates immediate danger.",
      recommendedAction: "Contact the wearer immediately.",
    };
    tryLlmAssessment.mockResolvedValue(llmResult);

    await runRiskAssessment("alert-1");

    expect(prisma.alert.update).toHaveBeenNthCalledWith(1, {
      where: { id: "alert-1" },
      data: { aiStatus: "ANALYZING" },
    });
    expect(prisma.alert.update).toHaveBeenLastCalledWith({
      where: { id: "alert-1" },
      data: {
        aiStatus: "DONE_LLM",
        aiSource: "llm",
        riskLevel: "HIGH",
        riskConfidence: 0.91,
        triggeringSignals: ["voice_distress"],
        rationale: "The voice trigger indicates immediate danger.",
        recommendedAction: "Contact the wearer immediately.",
        aiAnalyzedAt: expect.any(Date),
      },
    });
  });

  it("falls back when the LLM returns no assessment", async () => {
    tryLlmAssessment.mockResolvedValue(null);

    await runRiskAssessment("alert-1");

    expect(prisma.alert.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiStatus: "DONE_FALLBACK",
          aiSource: "fallback",
          riskLevel: "CRITICAL",
        }),
      })
    );
  });

  it("falls back when the LLM throws", async () => {
    tryLlmAssessment.mockRejectedValue(new Error("Gemini unavailable"));

    await expect(runRiskAssessment("alert-1")).resolves.toBeUndefined();

    expect(prisma.alert.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiStatus: "DONE_FALLBACK",
          aiSource: "fallback",
        }),
      })
    );
  });

  it("marks the assessment failed when the alert cannot be loaded", async () => {
    prisma.alert.findUnique.mockResolvedValue(null);

    await runRiskAssessment("missing-alert");

    expect(prisma.alert.update).toHaveBeenLastCalledWith({
      where: { id: "missing-alert" },
      data: { aiStatus: "FAILED" },
    });
    expect(tryLlmAssessment).not.toHaveBeenCalled();
  });
});