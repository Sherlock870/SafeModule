import type { Alert, Telemetry } from "@prisma/client";
import type { RiskAssessmentResult } from "@/lib/risk-fallback";

export type { RiskAssessmentResult };

// Not wired to a real provider yet — no LLM_API_KEY exists as of the
// hackathon's first day. This seam is the swap-in point once a provider is
// chosen: replace the `return null` below with an actual fetch call that
// parses the provider's response into a RiskAssessmentResult.
export async function tryLlmAssessment(
  _alert: Alert,
  _telemetry: Telemetry[]
): Promise<RiskAssessmentResult | null> {
  if (!process.env.LLM_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
