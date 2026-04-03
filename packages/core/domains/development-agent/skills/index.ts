/**
 * Development Agent Skills Library
 *
 * Pre-built skills for software development agents.
 */

import { CodeReviewSkill } from './code-review.js';
import { RefactorPlanSkill } from './refactor-plan.js';
import { WritingTestsSkill } from './writing-tests.js';
import { DebuggingIssuesSkill } from './debugging-issues.js';
import { DocumentingCodeSkill } from './documenting-code.js';

export const DevelopmentAgentSkills = [
  CodeReviewSkill,
  RefactorPlanSkill,
  WritingTestsSkill,
  DebuggingIssuesSkill,
  DocumentingCodeSkill,
];

export {
  CodeReviewSkill,
  RefactorPlanSkill,
  WritingTestsSkill,
  DebuggingIssuesSkill,
  DocumentingCodeSkill,
};
