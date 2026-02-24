export interface DeadlineSuggestion {
  tier: "quick" | "standard" | "extended";
  label: string;
  seconds: number;
  reasoning: string;
}

const TIERS: Record<string, { label: string; seconds: number }> = {
  quick: { label: "Quick (1 hour)", seconds: 3600 },
  standard: { label: "Standard (24 hours)", seconds: 86400 },
  extended: { label: "Extended (72 hours)", seconds: 259200 },
};

const QUICK_KEYWORDS = [
  "urgent",
  "asap",
  "quick",
  "simple lookup",
  "fast",
  "immediately",
  "right now",
  "price check",
  "balance check",
];

const EXTENDED_KEYWORDS = [
  "monitor",
  "build",
  "deploy",
  "integrate",
  "complex",
  "multi-step",
  "long-running",
  "weekly",
  "daily",
  "continuous",
  "pipeline",
  "infrastructure",
];

const STANDARD_KEYWORDS = [
  "report",
  "scrape",
  "review",
  "audit",
  "analyze",
  "research",
  "summarize",
  "compare",
  "fetch",
  "collect",
];

function matchKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

export function suggestDeadline(description: string): DeadlineSuggestion {
  const quickMatches = matchKeywords(description, QUICK_KEYWORDS);
  if (quickMatches.length > 0) {
    return {
      tier: "quick",
      ...TIERS.quick,
      reasoning: `Matched quick keywords: ${quickMatches.join(", ")}`,
    };
  }

  const extendedMatches = matchKeywords(description, EXTENDED_KEYWORDS);
  if (extendedMatches.length > 0) {
    return {
      tier: "extended",
      ...TIERS.extended,
      reasoning: `Matched extended keywords: ${extendedMatches.join(", ")}`,
    };
  }

  const standardMatches = matchKeywords(description, STANDARD_KEYWORDS);
  if (standardMatches.length > 0) {
    return {
      tier: "standard",
      ...TIERS.standard,
      reasoning: `Matched standard keywords: ${standardMatches.join(", ")}`,
    };
  }

  return {
    tier: "standard",
    ...TIERS.standard,
    reasoning: "No specific keywords matched; defaulting to Standard",
  };
}

export function tierToSeconds(tier: string): number | null {
  return TIERS[tier]?.seconds ?? null;
}
