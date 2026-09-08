export function getAiSourceLabel(aiSource: string | null): string | null {
  switch (aiSource) {
    case "fallback":
      return "SafeModule's rule-based triage engine";
    case "llm":
      return "AI risk assessment";
    default:
      return null;
  }
}
