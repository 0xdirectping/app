import type { Skill } from "./types.js";
import { gasReportSkill } from "./gas-report.js";
import { threadWriterSkill } from "./thread-writer.js";
import { scriptGeneratorSkill } from "./script-generator.js";
import { comparisonTableSkill } from "./comparison-table.js";

export const skills: Skill[] = [
  gasReportSkill,
  threadWriterSkill,
  scriptGeneratorSkill,
  comparisonTableSkill,
];

export type { Skill, SkillContext } from "./types.js";
