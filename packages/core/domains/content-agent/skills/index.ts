/**
 * Content Agent Skills Library
 *
 * Pre-built skills for content creation and strategy agents.
 */

import { ResearchTrendsSkill } from './research-trends.js';
import { GeneratePostOptionsSkill } from './generate-post-options.js';
import { ContentReviewSkill } from './content-review.js';

export const ContentAgentSkills = [
  ResearchTrendsSkill,
  GeneratePostOptionsSkill,
  ContentReviewSkill,
];

export {
  ResearchTrendsSkill,
  GeneratePostOptionsSkill,
  ContentReviewSkill,
};
