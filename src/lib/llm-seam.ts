import "server-only";
import type { Alert, Telemetry } from "@prisma/client";
import type { RiskAssessmentResult, RiskLevel } from "@/lib/risk-fallback";

export type { RiskAssessmentResult };

// flash-lite, not flash: the plain "flash" tier defaults to an internal
// "thinking" pass that alone takes ~5-20s, far outside the alert-lifecycle
// timeout budget below. flash-lite skips that and responds in ~1-2s.
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 3000;

const VALID_RISK_LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function buildPrompt(
  triggerType: "MANUAL_SOS" | "VOICE_DISTRESS",
  heartRates: number[]
): string {
  const triggerDescription =
    triggerType === "MANUAL_SOS"
      ? "The wearer pressed a physical SOS button."
      : "The wearer spoke a distress phrase, triggering a voice-activated alert.";

  const telemetryDescription = heartRates.length
    ? `Recent heart-rate readings (most recent first, bpm): ${heartRates.join(", ")}.`
    : "No recent heart-rate telemetry is available for this device.";

  return `You are the risk-assessment engine for SafeModule, a real-time women's safety wearable alert system. An alert has just been raised. Assess it and respond with ONLY a single valid JSON object (no markdown, no code fences, no extra text) with exactly these fields:

{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "riskConfidence": number between 0 and 1,
  "triggeringSignals": array of short snake_case string tags (e.g. "manual_sos", "elevated_heart_rate"),
  "rationale": a short 1-2 sentence explanation grounded in the event data below,
  "recommendedAction": a short, actionable instruction for a human guardian responding to this alert
}

Event data:
- Trigger: ${triggerDescription}
- ${telemetryDescription}

A manual SOS or voice-distress trigger is always a deliberate, serious signal on its own — never assess below MEDIUM risk. Elevated or erratic heart rate should increase the risk level and confidence.`;
}

function validate(parsed: unknown): RiskAssessmentResult | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;

  if (
    typeof p.riskLevel !== "string" ||
    !VALID_RISK_LEVELS.includes(p.riskLevel as RiskLevel)
  ) {
    return null;
  }
  if (typeof p.riskConfidence !== "number" || Number.isNaN(p.riskConfidence)) {
    return null;
  }
  if (
    !Array.isArray(p.triggeringSignals) ||
    !p.triggeringSignals.every((s) => typeof s === "string")
  ) {
    return null;
  }
  if (typeof p.rationale !== "string" || !p.rationale.trim()) {
    return null;
  }
  if (typeof p.recommendedAction !== "string" || !p.recommendedAction.trim()) {
    return null;
  }

  return {
    riskLevel: p.riskLevel as RiskLevel,
    riskConfidence: Math.min(1, Math.max(0, p.riskConfidence)),
    triggeringSignals: p.triggeringSignals as string[],
    rationale: p.rationale,
    recommendedAction: p.recommendedAction,
  };
}

// Server-only: reads GEMINI_API_KEY directly and is never imported by a
// client component, so the key never reaches the browser bundle.
export async function tryLlmAssessment(
  alert: Alert,
  telemetry: Telemetry[]
): Promise<RiskAssessmentResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const heartRates = telemetry.map((t) => t.heartRate);
  const prompt = buildPrompt(alert.triggerType, heartRates);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return null;

    return validate(JSON.parse(text));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
