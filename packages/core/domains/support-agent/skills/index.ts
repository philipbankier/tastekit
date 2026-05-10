/**
 * Support Agent Skills Library
 *
 * Pre-built skills for customer support and assistance agents.
 */

import { TicketTriageSkill } from './ticket-triage.js';
import { ResponseDraftSkill } from './response-draft.js';

export const SupportAgentSkills = [
  TicketTriageSkill,
  ResponseDraftSkill,
];

export {
  TicketTriageSkill,
  ResponseDraftSkill,
};
