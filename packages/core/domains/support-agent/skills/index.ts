/**
 * Support Agent Skills Library
 *
 * Pre-built skills for customer support and helpdesk work.
 */

import { TroubleshootingSkill } from './troubleshooting.js';
import { ResponseCraftingSkill } from './response-crafting.js';
import { KnowledgeBaseUpdateSkill } from './knowledge-base-update.js';

export const SupportAgentSkills = [
  TroubleshootingSkill,
  ResponseCraftingSkill,
  KnowledgeBaseUpdateSkill,
];

export {
  TroubleshootingSkill,
  ResponseCraftingSkill,
  KnowledgeBaseUpdateSkill,
};
