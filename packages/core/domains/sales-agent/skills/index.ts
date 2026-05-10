/**
 * Sales Agent Skills Library
 *
 * Pre-built skills for sales and deal management agents.
 */

import { LeadQualificationSkill } from './lead-qualification.js';
import { OutreachEmailSkill } from './outreach-email.js';

export const SalesAgentSkills = [
  LeadQualificationSkill,
  OutreachEmailSkill,
];

export {
  LeadQualificationSkill,
  OutreachEmailSkill,
};
