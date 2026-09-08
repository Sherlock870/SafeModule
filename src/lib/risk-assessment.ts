import { prisma } from "@/lib/prisma";
import { tryLlmAssessment } from "@/lib/llm-seam";
import { computeFallbackAssessment } from "@/lib/risk-fallback";

export async function runRiskAssessment(alertId: string): Promise<void> {
  try {
    await prisma.alert.update({
      where: { id: alertId },
      data: { aiStatus: "ANALYZING" },
    });

    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) return;

    const telemetry = await prisma.telemetry.findMany({
      where: { deviceId: alert.deviceId },
      orderBy: { recordedAt: "desc" },
      take: 20,
    });

    let result;
    let source: "llm" | "fallback";

    try {
      const llmResult = await tryLlmAssessment(alert, telemetry);
      if (llmResult) {
        result = llmResult;
        source = "llm";
      } else {
        result = computeFallbackAssessment(
          alert.triggerType,
          telemetry.map((t) => t.heartRate)
        );
        source = "fallback";
      }
    } catch {
      result = computeFallbackAssessment(
        alert.triggerType,
        telemetry.map((t) => t.heartRate)
      );
      source = "fallback";
    }

    try {
      await prisma.alert.update({
        where: { id: alertId },
        data: {
          aiStatus: source === "llm" ? "DONE_LLM" : "DONE_FALLBACK",
          aiSource: source,
          riskLevel: result.riskLevel,
          riskConfidence: result.riskConfidence,
          triggeringSignals: result.triggeringSignals,
          rationale: result.rationale,
          recommendedAction: result.recommendedAction,
          aiAnalyzedAt: new Date(),
        },
      });
    } catch {
      await prisma.alert
        .update({ where: { id: alertId }, data: { aiStatus: "FAILED" } })
        .catch(() => {});
    }
  } catch {
    // Guarantees the alert never gets stuck in PENDING/ANALYZING even if
    // the initial update, alert lookup, or telemetry query itself throws.
    await prisma.alert
      .update({ where: { id: alertId }, data: { aiStatus: "FAILED" } })
      .catch(() => {});
  }
}
