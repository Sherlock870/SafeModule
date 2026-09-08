export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskAssessmentResult = {
  riskLevel: RiskLevel;
  riskConfidence: number;
  triggeringSignals: string[];
  rationale: string;
  recommendedAction: string;
};

const RISK_ORDER: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function escalate(level: RiskLevel, steps: number): RiskLevel {
  const index = Math.min(RISK_ORDER.length - 1, RISK_ORDER.indexOf(level) + steps);
  return RISK_ORDER[index];
}

function recommendedActionFor(level: RiskLevel): string {
  switch (level) {
    case "CRITICAL":
      return "Immediate dispatch — treat as active life-threatening emergency.";
    case "HIGH":
      return "Dispatch nearest guardian immediately and attempt contact.";
    case "MEDIUM":
      return "Attempt contact with the user; prepare to escalate if unreachable.";
    case "LOW":
      return "Monitor; no immediate action required.";
  }
}

export function computeFallbackAssessment(
  triggerType: "MANUAL_SOS" | "VOICE_DISTRESS",
  recentHeartRates: number[]
): RiskAssessmentResult {
  const signals: string[] = [];
  let level: RiskLevel;

  if (triggerType === "MANUAL_SOS") {
    level = "HIGH";
    signals.push("manual_sos");
  } else {
    level = "MEDIUM";
    signals.push("voice_distress");
  }

  const readings = recentHeartRates.slice(0, 10);
  const avgHr = readings.length
    ? readings.reduce((a, b) => a + b, 0) / readings.length
    : null;
  const maxHr = readings.length ? Math.max(...readings) : null;

  let confidence = 0.6;

  if (avgHr !== null) {
    if (avgHr >= 130 || (maxHr !== null && maxHr >= 160)) {
      signals.push("critically_elevated_heart_rate");
      level = "CRITICAL";
      confidence = 0.85;
    } else if (avgHr >= 100) {
      signals.push("elevated_heart_rate");
      level = escalate(level, 1);
      confidence = 0.7;
    }
  }

  const rationale = `${
    triggerType === "MANUAL_SOS"
      ? "Manual SOS button pressed"
      : "Voice distress phrase detected"
  }${
    avgHr !== null
      ? `; recent heart rate averaging ${Math.round(avgHr)}bpm (peak ${maxHr}bpm)`
      : "; no recent heart-rate telemetry available"
  }.`;

  return {
    riskLevel: level,
    riskConfidence: confidence,
    triggeringSignals: signals,
    rationale,
    recommendedAction: recommendedActionFor(level),
  };
}
