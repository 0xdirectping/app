import type { Skill } from "./skills/types.js";

const THRESHOLD = 0.3;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

export function matchSkill(
  description: string,
  skills: Skill[],
): Skill | null {
  const words = new Set(normalize(description).split(/\s+/).filter(Boolean));
  let bestSkill: Skill | null = null;
  let bestScore = 0;

  for (const skill of skills) {
    const matched = skill.keywords.filter((kw) => words.has(kw)).length;
    const score = matched / skill.keywords.length;
    if (score > bestScore) {
      bestScore = score;
      bestSkill = skill;
    }
  }

  if (bestScore >= THRESHOLD && bestSkill) {
    console.log(
      `[matcher] Matched skill "${bestSkill.name}" (score: ${(bestScore * 100).toFixed(0)}%)`,
    );
    return bestSkill;
  }

  return null;
}
