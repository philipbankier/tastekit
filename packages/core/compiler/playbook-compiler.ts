import { join } from 'path';
import { writeFileSafe, resolvePlaybooksPath } from '../utils/filesystem.js';
import { stringifyYAML } from '../utils/yaml.js';
import { PlaybookV1, PlaybookStep } from '../schemas/playbook.js';
import { ConstitutionV1 } from '../schemas/constitution.js';
import { SessionState } from '../schemas/workspace.js';

/**
 * Domain playbook definition — what domain playbook files export.
 */
interface DomainPlaybook {
  playbook: PlaybookV1;
}

export interface PlaybookCompilationOptions {
  workspacePath: string;
  session: SessionState;
  constitution: ConstitutionV1;
}

/**
 * Compile playbooks from domain definitions + constitution.
 *
 * Resolves domain-specific playbooks, personalizes them with
 * constitution data, and writes playbook YAML files.
 */
export async function compilePlaybooks(options: PlaybookCompilationOptions): Promise<string[]> {
  const { workspacePath, session, constitution } = options;
  const playbooksPath = resolvePlaybooksPath(workspacePath);
  const artifacts: string[] = [];

  // Resolve domain playbooks
  const domainPlaybooks = await resolveDomainPlaybooks(session.domain_id);
  const allPlaybooks: PlaybookV1[] = [];

  for (const dp of domainPlaybooks) {
    allPlaybooks.push(dp.playbook);
  }

  // If no domain playbooks were found, generate a generic one
  if (allPlaybooks.length === 0) {
    allPlaybooks.push(generateGenericPlaybook(constitution));
  }

  // Write each playbook
  for (const playbook of allPlaybooks) {
    const filename = `${playbook.id}.v1.yaml`;
    writeFileSafe(
      join(playbooksPath, filename),
      stringifyYAML(playbook),
    );
    artifacts.push(`playbooks/${filename}`);
  }

  return artifacts;
}

/**
 * Dynamically resolve domain playbooks by domain_id.
 */
async function resolveDomainPlaybooks(domainId?: string): Promise<DomainPlaybook[]> {
  if (!domainId) return [];

  switch (domainId) {
    case 'content-agent':
      return getContentAgentPlaybooks();
    case 'research-agent':
      return getResearchAgentPlaybooks();
    case 'sales-agent':
      return getSalesAgentPlaybooks();
    case 'support-agent':
      return getSupportAgentPlaybooks();
    case 'general-agent':
      return getGeneralAgentPlaybooks();
    default:
      return [];
  }
}

/**
 * Content agent playbooks — pre-built workflows for content creation.
 */
function getContentAgentPlaybooks(): DomainPlaybook[] {
  return [
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'simple-post',
        name: 'Simple Post Creation',
        description: 'Quick workflow: research optional, generate options, user picks, publish.',
        triggers: [
          { type: 'manual' },
        ],
        inputs: [
          { name: 'topic', type: 'string', required: true, description: 'Topic or subject for the post' },
          { name: 'platform', type: 'string', required: true, description: 'Target platform (twitter, linkedin, etc.)' },
          { name: 'tone_override', type: 'string', required: false, description: 'Override default voice tone' },
        ],
        steps: [
          {
            step_id: 'understand-context',
            type: 'think',
            outputs: ['context_summary'],
          },
          {
            step_id: 'generate-options',
            type: 'tool',
            tool_ref: 'skill:generate-post-options',
            params_template: {
              topic: '{{topic}}',
              platform: '{{platform}}',
              num_options: 3,
            },
            outputs: ['post_options'],
          },
          {
            step_id: 'user-selects',
            type: 'approval_gate',
            params_template: {
              message: 'Choose a post option or request modifications.',
              options: '{{post_options}}',
            },
            outputs: ['selected_post'],
          },
          {
            step_id: 'finalize',
            type: 'write',
            params_template: {
              content: '{{selected_post}}',
              format: '{{platform}}_post',
            },
            outputs: ['final_post'],
          },
        ],
        checks: [
          {
            check_id: 'voice-match',
            type: 'taste',
            condition: 'Post matches constitution voice_keywords and avoids forbidden_phrases',
          },
          {
            check_id: 'platform-fit',
            type: 'format',
            condition: 'Post fits platform character limits and format requirements',
          },
        ],
        stop_conditions: [
          {
            condition: 'User cancels or rejects all options',
            reason: 'User does not want to proceed with any variation',
          },
        ],
        escalations: [
          {
            escalation_id: 'sensitive-topic',
            trigger: 'Topic involves controversy, politics, or sensitive subjects',
            approval_ref: 'guardrails.approval_rules.content_review',
          },
        ],
      },
    },
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'research-and-post',
        name: 'Research-Driven Post',
        description: 'Full workflow: research trends, generate ideas informed by research, create and review.',
        triggers: [
          { type: 'manual' },
        ],
        inputs: [
          { name: 'niche', type: 'string', required: true, description: 'Topic area or industry' },
          { name: 'platform', type: 'string', required: true, description: 'Target platform' },
          { name: 'timeframe', type: 'string', required: false, description: 'Trend timeframe (default: past week)' },
        ],
        steps: [
          {
            step_id: 'research-trends',
            type: 'tool',
            tool_ref: 'skill:research-trends',
            params_template: {
              niche: '{{niche}}',
              platform: '{{platform}}',
              timeframe: '{{timeframe || "past week"}}',
            },
            outputs: ['trend_data'],
          },
          {
            step_id: 'analyze-findings',
            type: 'think',
            params_template: {
              research: '{{trend_data}}',
              instruction: 'Identify the best angle based on research findings and user principles',
            },
            outputs: ['selected_angle'],
          },
          {
            step_id: 'generate-options',
            type: 'tool',
            tool_ref: 'skill:generate-post-options',
            params_template: {
              topic: '{{selected_angle}}',
              platform: '{{platform}}',
              num_options: 3,
            },
            outputs: ['post_options'],
          },
          {
            step_id: 'user-review',
            type: 'approval_gate',
            params_template: {
              message: 'Review options based on trend research. Choose or request changes.',
              options: '{{post_options}}',
              context: '{{trend_data}}',
            },
            outputs: ['selected_post'],
          },
          {
            step_id: 'finalize',
            type: 'write',
            params_template: {
              content: '{{selected_post}}',
              format: '{{platform}}_post',
            },
            outputs: ['final_post'],
          },
        ],
        checks: [
          {
            check_id: 'voice-match',
            type: 'taste',
            condition: 'Post matches constitution voice_keywords and avoids forbidden_phrases',
          },
          {
            check_id: 'trend-relevance',
            type: 'facts',
            condition: 'Post is informed by actual research findings, not generic advice',
          },
          {
            check_id: 'platform-fit',
            type: 'format',
            condition: 'Post fits platform character limits and format requirements',
          },
        ],
        stop_conditions: [
          {
            condition: 'No relevant trends found in research',
            reason: 'Research did not yield actionable insights',
          },
          {
            condition: 'User cancels',
            reason: 'User does not want to proceed',
          },
        ],
        escalations: [
          {
            escalation_id: 'sensitive-topic',
            trigger: 'Research reveals sensitive or controversial trending topics',
            approval_ref: 'guardrails.approval_rules.content_review',
          },
        ],
      },
    },
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'content-calendar',
        name: 'Content Calendar Planning',
        description: 'Plan a week of content: research trends, map to themes, schedule posts.',
        triggers: [
          { type: 'manual' },
          { type: 'cron', schedule: '0 9 * * 1' }, // Monday at 9am
        ],
        inputs: [
          { name: 'niche', type: 'string', required: true, description: 'Topic area' },
          { name: 'platforms', type: 'string', required: true, description: 'Target platforms (comma-separated)' },
          { name: 'posts_per_week', type: 'number', required: false, description: 'Posts per week (default: 5)' },
        ],
        steps: [
          {
            step_id: 'research-trends',
            type: 'tool',
            tool_ref: 'skill:research-trends',
            params_template: {
              niche: '{{niche}}',
              platform: '{{platforms}}',
              timeframe: 'past week',
            },
            outputs: ['trend_data'],
          },
          {
            step_id: 'plan-themes',
            type: 'think',
            params_template: {
              research: '{{trend_data}}',
              instruction: 'Map trends to daily themes for {{posts_per_week || 5}} posts across {{platforms}}',
            },
            outputs: ['theme_plan'],
          },
          {
            step_id: 'review-plan',
            type: 'approval_gate',
            params_template: {
              message: 'Review the proposed content calendar. Approve or adjust.',
              plan: '{{theme_plan}}',
            },
            outputs: ['approved_plan'],
          },
          {
            step_id: 'write-calendar',
            type: 'write',
            params_template: {
              content: '{{approved_plan}}',
              format: 'content_calendar_md',
            },
            outputs: ['calendar_file'],
          },
        ],
        checks: [
          {
            check_id: 'variety',
            type: 'taste',
            condition: 'Calendar has varied topics and formats, not repetitive',
          },
          {
            check_id: 'coverage',
            type: 'format',
            condition: 'All target platforms are represented in the calendar',
          },
        ],
        stop_conditions: [
          {
            condition: 'No research data available',
            reason: 'Cannot plan without trend data',
          },
        ],
        escalations: [
          {
            escalation_id: 'high-volume',
            trigger: 'Posts per week exceeds 10',
            approval_ref: 'guardrails.approval_rules.resource_usage',
          },
        ],
      },
    },
  ];
}

/**
 * Research agent playbooks — workflows for information gathering and analysis.
 */
function getResearchAgentPlaybooks(): DomainPlaybook[] {
  return [
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'quick-lookup',
        name: 'Quick Lookup',
        description: 'Simple fact-finding: research a question, synthesize findings, present answer.',
        triggers: [{ type: 'manual' }],
        inputs: [
          { name: 'question', type: 'string', required: true, description: 'The question to research' },
          { name: 'source_preferences', type: 'string', required: false, description: 'Preferred source types' },
        ],
        steps: [
          {
            step_id: 'research',
            type: 'tool',
            tool_ref: 'skill:web-research',
            params_template: {
              topic: '{{question}}',
              scope: 'narrow',
              max_sources: 5,
            },
            outputs: ['research_findings'],
          },
          {
            step_id: 'synthesize',
            type: 'think',
            params_template: {
              findings: '{{research_findings}}',
              instruction: 'Synthesize findings into a concise answer',
            },
            outputs: ['answer'],
          },
          {
            step_id: 'format-output',
            type: 'write',
            params_template: {
              content: '{{answer}}',
              format: 'research_summary',
            },
            outputs: ['final_answer'],
          },
        ],
        checks: [
          {
            check_id: 'source-quality',
            type: 'facts',
            condition: 'Answer is supported by credible sources',
          },
          {
            check_id: 'completeness',
            type: 'taste',
            condition: 'Answer addresses the original question fully',
          },
        ],
        stop_conditions: [
          {
            condition: 'No relevant sources found',
            reason: 'Cannot answer without credible sources',
          },
        ],
        escalations: [],
      },
    },
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'deep-dive-analysis',
        name: 'Deep Dive Analysis',
        description: 'Multi-source research: plan scope, gather sources, cross-reference, synthesize, and review.',
        triggers: [{ type: 'manual' }],
        inputs: [
          { name: 'topic', type: 'string', required: true, description: 'Research topic' },
          { name: 'scope', type: 'string', required: false, description: 'Research scope and boundaries' },
          { name: 'output_format', type: 'string', required: false, description: 'Desired output format' },
        ],
        steps: [
          {
            step_id: 'plan-scope',
            type: 'think',
            params_template: {
              topic: '{{topic}}',
              instruction: 'Define research scope, key questions, and source strategy',
            },
            outputs: ['research_plan'],
          },
          {
            step_id: 'gather-sources',
            type: 'tool',
            tool_ref: 'skill:web-research',
            params_template: {
              topic: '{{topic}}',
              scope: 'broad',
              max_sources: 15,
            },
            outputs: ['raw_findings'],
          },
          {
            step_id: 'cross-reference',
            type: 'think',
            params_template: {
              findings: '{{raw_findings}}',
              instruction: 'Cross-reference findings, identify consensus and conflicts',
            },
            outputs: ['verified_findings'],
          },
          {
            step_id: 'synthesize',
            type: 'think',
            params_template: {
              findings: '{{verified_findings}}',
              plan: '{{research_plan}}',
              instruction: 'Synthesize into structured analysis with citations',
            },
            outputs: ['analysis'],
          },
          {
            step_id: 'review',
            type: 'approval_gate',
            params_template: {
              message: 'Review the research analysis. Approve or request deeper investigation.',
              analysis: '{{analysis}}',
            },
            outputs: ['approved_analysis'],
          },
          {
            step_id: 'finalize',
            type: 'write',
            params_template: {
              content: '{{approved_analysis}}',
              format: '{{output_format || "detailed_report"}}',
            },
            outputs: ['final_report'],
          },
        ],
        checks: [
          {
            check_id: 'multi-source',
            type: 'facts',
            condition: 'Key claims supported by multiple independent sources',
          },
          {
            check_id: 'bias-check',
            type: 'taste',
            condition: 'Analysis presents balanced perspectives where applicable',
          },
          {
            check_id: 'citation-quality',
            type: 'format',
            condition: 'All claims properly cited per user citation standards',
          },
        ],
        stop_conditions: [
          {
            condition: 'Insufficient credible sources on the topic',
            reason: 'Cannot produce reliable analysis without adequate sourcing',
          },
        ],
        escalations: [
          {
            escalation_id: 'sensitive-research',
            trigger: 'Research involves confidential, proprietary, or ethically sensitive data',
            approval_ref: 'guardrails.approval_rules.research_ethics',
          },
        ],
      },
    },
  ];
}

/**
 * Sales agent playbooks — workflows for lead management and deal progression.
 */
function getSalesAgentPlaybooks(): DomainPlaybook[] {
  return [
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'lead-outreach',
        name: 'Lead Outreach',
        description: 'Initial outreach to a new lead: research, qualify, draft email, review, send.',
        triggers: [{ type: 'manual' }],
        inputs: [
          { name: 'lead_data', type: 'string', required: true, description: 'Lead information (name, company, role, context)' },
          { name: 'outreach_type', type: 'string', required: false, description: 'Type of outreach (cold, warm, referral)' },
        ],
        steps: [
          {
            step_id: 'qualify-lead',
            type: 'tool',
            tool_ref: 'skill:lead-qualification',
            params_template: {
              lead_data: '{{lead_data}}',
            },
            outputs: ['qualification'],
          },
          {
            step_id: 'assess-fit',
            type: 'think',
            params_template: {
              qualification: '{{qualification}}',
              instruction: 'Determine if lead is worth pursuing and best approach',
            },
            outputs: ['approach_decision'],
          },
          {
            step_id: 'draft-email',
            type: 'tool',
            tool_ref: 'skill:outreach-email',
            params_template: {
              recipient: '{{lead_data}}',
              purpose: '{{outreach_type || "cold_outreach"}}',
              context: '{{approach_decision}}',
              sequence_position: 1,
            },
            outputs: ['draft_email'],
          },
          {
            step_id: 'review-email',
            type: 'approval_gate',
            params_template: {
              message: 'Review outreach email before sending.',
              email: '{{draft_email}}',
              qualification: '{{qualification}}',
            },
            outputs: ['approved_email'],
          },
          {
            step_id: 'send',
            type: 'tool',
            tool_ref: 'email-sender',
            params_template: {
              email: '{{approved_email}}',
            },
            outputs: ['send_result'],
          },
        ],
        checks: [
          {
            check_id: 'qualification-check',
            type: 'taste',
            condition: 'Lead meets minimum qualification criteria before outreach',
          },
          {
            check_id: 'compliance-check',
            type: 'safety',
            condition: 'Email complies with CAN-SPAM/GDPR regulations',
          },
          {
            check_id: 'tone-check',
            type: 'taste',
            condition: 'Email matches sales communication style from constitution',
          },
        ],
        stop_conditions: [
          {
            condition: 'Lead scores D or is disqualified',
            reason: 'Lead does not meet minimum qualification criteria',
          },
        ],
        escalations: [
          {
            escalation_id: 'high-value-lead',
            trigger: 'Lead is enterprise-tier or strategic account',
            approval_ref: 'guardrails.approval_rules.strategic_outreach',
          },
        ],
      },
    },
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'proposal-workflow',
        name: 'Proposal Workflow',
        description: 'Create and deliver a sales proposal: gather requirements, draft, review, deliver.',
        triggers: [{ type: 'manual' }],
        inputs: [
          { name: 'prospect', type: 'string', required: true, description: 'Prospect information and deal context' },
          { name: 'requirements', type: 'string', required: true, description: 'Gathered requirements and pain points' },
          { name: 'proposal_format', type: 'string', required: false, description: 'Desired format (doc, deck, email)' },
        ],
        steps: [
          {
            step_id: 'analyze-requirements',
            type: 'think',
            params_template: {
              prospect: '{{prospect}}',
              requirements: '{{requirements}}',
              instruction: 'Analyze requirements and map to solution components',
            },
            outputs: ['solution_mapping'],
          },
          {
            step_id: 'draft-proposal',
            type: 'write',
            params_template: {
              content: '{{solution_mapping}}',
              format: '{{proposal_format || "detailed_document"}}',
            },
            outputs: ['draft_proposal'],
          },
          {
            step_id: 'review-proposal',
            type: 'approval_gate',
            params_template: {
              message: 'Review proposal before delivering to prospect.',
              proposal: '{{draft_proposal}}',
              context: '{{requirements}}',
            },
            outputs: ['approved_proposal'],
          },
          {
            step_id: 'deliver',
            type: 'write',
            params_template: {
              content: '{{approved_proposal}}',
              format: 'final_proposal',
            },
            outputs: ['delivered_proposal'],
          },
        ],
        checks: [
          {
            check_id: 'requirements-coverage',
            type: 'taste',
            condition: 'Proposal addresses all stated requirements',
          },
          {
            check_id: 'pricing-check',
            type: 'safety',
            condition: 'Pricing is within approved ranges and discount policies',
          },
          {
            check_id: 'brand-consistency',
            type: 'format',
            condition: 'Proposal follows brand guidelines and formatting standards',
          },
        ],
        stop_conditions: [
          {
            condition: 'Requirements are unclear or contradictory',
            reason: 'Cannot create proposal without clear requirements',
          },
        ],
        escalations: [
          {
            escalation_id: 'custom-pricing',
            trigger: 'Proposal requires pricing outside standard range',
            approval_ref: 'guardrails.approval_rules.pricing_override',
          },
        ],
      },
    },
  ];
}

/**
 * Support agent playbooks — workflows for customer support and ticket resolution.
 */
function getSupportAgentPlaybooks(): DomainPlaybook[] {
  return [
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'standard-ticket',
        name: 'Standard Ticket Resolution',
        description: 'Standard ticket flow: triage, research, draft response, review, send.',
        triggers: [
          { type: 'manual' },
          { type: 'event', event_pattern: 'ticket.created' },
        ],
        inputs: [
          { name: 'ticket', type: 'string', required: true, description: 'Ticket content and customer info' },
          { name: 'channel', type: 'string', required: false, description: 'Support channel (email, chat, etc.)' },
        ],
        steps: [
          {
            step_id: 'triage',
            type: 'tool',
            tool_ref: 'skill:ticket-triage',
            params_template: {
              ticket: '{{ticket}}',
            },
            outputs: ['triage_result'],
          },
          {
            step_id: 'research-solution',
            type: 'think',
            params_template: {
              ticket: '{{ticket}}',
              triage: '{{triage_result}}',
              instruction: 'Research the issue and identify the best resolution',
            },
            outputs: ['resolution'],
          },
          {
            step_id: 'draft-response',
            type: 'tool',
            tool_ref: 'skill:response-draft',
            params_template: {
              ticket: '{{ticket}}',
              channel: '{{channel || "email"}}',
              triage: '{{triage_result}}',
              resolution: '{{resolution}}',
            },
            outputs: ['draft_response'],
          },
          {
            step_id: 'review',
            type: 'approval_gate',
            params_template: {
              message: 'Review response before sending to customer.',
              response: '{{draft_response}}',
              triage: '{{triage_result}}',
            },
            outputs: ['approved_response'],
          },
          {
            step_id: 'send',
            type: 'write',
            params_template: {
              content: '{{approved_response}}',
              format: '{{channel}}_response',
            },
            outputs: ['sent_response'],
          },
        ],
        checks: [
          {
            check_id: 'tone-match',
            type: 'taste',
            condition: 'Response matches support tone and empathy requirements',
          },
          {
            check_id: 'resolution-quality',
            type: 'taste',
            condition: 'Response actually resolves the issue or clearly explains next steps',
          },
          {
            check_id: 'channel-format',
            type: 'format',
            condition: 'Response is appropriate for the support channel',
          },
        ],
        stop_conditions: [
          {
            condition: 'Ticket requires escalation based on triage',
            reason: 'Issue is beyond agent capability or requires human intervention',
          },
        ],
        escalations: [
          {
            escalation_id: 'angry-customer',
            trigger: 'Customer sentiment is very negative or threatening',
            approval_ref: 'guardrails.approval_rules.escalation',
          },
          {
            escalation_id: 'billing-dispute',
            trigger: 'Ticket involves billing, refunds, or financial matters',
            approval_ref: 'guardrails.approval_rules.financial',
          },
        ],
      },
    },
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'escalation-workflow',
        name: 'Escalation Workflow',
        description: 'Escalation flow: assess severity, gather context, create escalation package, hand off.',
        triggers: [{ type: 'manual' }],
        inputs: [
          { name: 'ticket', type: 'string', required: true, description: 'Ticket requiring escalation' },
          { name: 'reason', type: 'string', required: true, description: 'Reason for escalation' },
          { name: 'target_team', type: 'string', required: false, description: 'Target team for escalation' },
        ],
        steps: [
          {
            step_id: 'assess-severity',
            type: 'think',
            params_template: {
              ticket: '{{ticket}}',
              reason: '{{reason}}',
              instruction: 'Assess severity and determine appropriate escalation level',
            },
            outputs: ['severity_assessment'],
          },
          {
            step_id: 'gather-context',
            type: 'think',
            params_template: {
              ticket: '{{ticket}}',
              assessment: '{{severity_assessment}}',
              instruction: 'Compile all relevant context, customer history, and attempted resolutions',
            },
            outputs: ['escalation_context'],
          },
          {
            step_id: 'create-package',
            type: 'write',
            params_template: {
              content: '{{escalation_context}}',
              format: 'escalation_package',
            },
            outputs: ['escalation_package'],
          },
          {
            step_id: 'notify-customer',
            type: 'tool',
            tool_ref: 'skill:response-draft',
            params_template: {
              ticket: '{{ticket}}',
              channel: 'email',
              resolution: 'escalation_notification',
            },
            outputs: ['customer_notification'],
          },
          {
            step_id: 'approve-handoff',
            type: 'approval_gate',
            params_template: {
              message: 'Review escalation package and customer notification before handoff.',
              package: '{{escalation_package}}',
              notification: '{{customer_notification}}',
            },
            outputs: ['approved_handoff'],
          },
        ],
        checks: [
          {
            check_id: 'context-completeness',
            type: 'taste',
            condition: 'Escalation package includes all relevant context and attempted resolutions',
          },
          {
            check_id: 'customer-communication',
            type: 'taste',
            condition: 'Customer is notified about the escalation with appropriate empathy',
          },
        ],
        stop_conditions: [
          {
            condition: 'Issue is resolved during escalation preparation',
            reason: 'Resolution found, escalation no longer needed',
          },
        ],
        escalations: [
          {
            escalation_id: 'critical-severity',
            trigger: 'Severity is critical (data loss, security breach, complete outage)',
            approval_ref: 'guardrails.approval_rules.critical_escalation',
          },
        ],
      },
    },
  ];
}

/**
 * General agent playbooks — reusable workflows for broad, mixed workloads.
 */
function getGeneralAgentPlaybooks(): DomainPlaybook[] {
  return [
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'general-task-execution',
        name: 'General Task Execution',
        description: 'Synthesize context, orchestrate execution, and close with a concise delivery summary.',
        triggers: [{ type: 'manual' }],
        inputs: [
          { name: 'goal', type: 'string', required: true, description: 'Desired outcome to achieve' },
          { name: 'context_sources', type: 'string', required: false, description: 'Relevant files/notes/links to ground the task' },
          { name: 'constraints', type: 'string', required: false, description: 'Policy, timeline, budget, or tooling constraints' },
        ],
        steps: [
          {
            step_id: 'synthesize-context',
            type: 'tool',
            tool_ref: 'skill:context-synthesis',
            params_template: {
              question: '{{goal}}',
              sources: '{{context_sources}}',
            },
            outputs: ['context_brief'],
          },
          {
            step_id: 'plan-work',
            type: 'think',
            params_template: {
              goal: '{{goal}}',
              constraints: '{{constraints}}',
              context: '{{context_brief}}',
            },
            outputs: ['execution_plan'],
          },
          {
            step_id: 'execute-work',
            type: 'tool',
            tool_ref: 'skill:task-orchestration',
            params_template: {
              goal: '{{goal}}',
              constraints: '{{constraints}}',
              context_snapshot: '{{context_brief}}',
            },
            outputs: ['execution_result'],
          },
          {
            step_id: 'approval-checkpoint',
            type: 'approval_gate',
            params_template: {
              message: 'Review execution summary before final delivery.',
              summary: '{{execution_result}}',
            },
            outputs: ['approved_result'],
          },
          {
            step_id: 'finalize',
            type: 'write',
            params_template: {
              content: '{{approved_result}}',
              format: 'operator_summary',
            },
            outputs: ['final_output'],
          },
        ],
        checks: [
          {
            check_id: 'goal-alignment',
            type: 'taste',
            condition: 'Execution result directly addresses the user goal and operating principles',
          },
          {
            check_id: 'risk-compliance',
            type: 'safety',
            condition: 'No taboo or high-risk action was executed without required escalation',
          },
          {
            check_id: 'evidence-quality',
            type: 'facts',
            condition: 'Claims in the final output reflect context synthesis confidence and citation expectations',
          },
        ],
        stop_conditions: [
          {
            condition: 'Critical context gaps remain unresolved after synthesis',
            reason: 'Cannot continue safely without additional user input',
          },
        ],
        escalations: [
          {
            escalation_id: 'high-risk-action',
            trigger: 'Execution requires destructive, irreversible, legal, or financial actions',
            approval_ref: 'guardrails.approval_rules.approve_high_risk',
          },
        ],
      },
    },
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'research-then-act',
        name: 'Research Then Act',
        description: 'Gather context, choose an execution path, and deliver an evidence-backed recommendation or action plan.',
        triggers: [{ type: 'manual' }],
        inputs: [
          { name: 'question', type: 'string', required: true, description: 'Decision or task question to resolve' },
          { name: 'sources', type: 'string', required: false, description: 'Optional initial sources to bootstrap synthesis' },
          { name: 'decision_deadline', type: 'string', required: false, description: 'Optional timing constraint for recommendation' },
        ],
        steps: [
          {
            step_id: 'capture-context',
            type: 'tool',
            tool_ref: 'skill:context-synthesis',
            params_template: {
              question: '{{question}}',
              sources: '{{sources}}',
            },
            outputs: ['brief', 'confidence_map', 'open_questions'],
          },
          {
            step_id: 'select-path',
            type: 'think',
            params_template: {
              brief: '{{brief}}',
              confidence_map: '{{confidence_map}}',
              deadline: '{{decision_deadline}}',
              instruction: 'Select a recommended path with two alternatives and explicit tradeoffs.',
            },
            outputs: ['recommended_path'],
          },
          {
            step_id: 'execute-path',
            type: 'tool',
            tool_ref: 'skill:task-orchestration',
            params_template: {
              goal: '{{question}}',
              context_snapshot: '{{brief}}',
              constraints: '{{decision_deadline}}',
            },
            outputs: ['path_result'],
          },
          {
            step_id: 'deliver',
            type: 'write',
            params_template: {
              content: '{{path_result}}',
              include: ['recommended_path', 'confidence_map', 'open_questions'],
            },
            outputs: ['delivery_packet'],
          },
        ],
        checks: [
          {
            check_id: 'traceability',
            type: 'facts',
            condition: 'Recommendation and actions are traceable to synthesized context and confidence markers',
          },
          {
            check_id: 'format-quality',
            type: 'format',
            condition: 'Delivery packet clearly separates facts, assumptions, risks, and next actions',
          },
        ],
        stop_conditions: [
          {
            condition: 'No viable path can be recommended from available evidence',
            reason: 'Insufficient confidence to proceed responsibly',
          },
        ],
        escalations: [
          {
            escalation_id: 'policy-or-risk-blocker',
            trigger: 'Recommended path conflicts with trust/guardrail policy or crosses high-risk thresholds',
            approval_ref: 'guardrails.approval_rules.approve_high_risk',
          },
        ],
      },
    },
  ];
}

/**
 * Generate a generic playbook when no domain playbooks are available.
 * Uses constitution data to personalize the workflow.
 */
function generateGenericPlaybook(constitution: ConstitutionV1): PlaybookV1 {
  const autonomyLevel = constitution.tradeoffs.autonomy_level;

  // If low autonomy, always include approval gate
  const approvalStep = autonomyLevel < 0.5;

  const steps: PlaybookStep[] = [
    {
      step_id: 'understand-task',
      type: 'think',
      outputs: ['task_analysis'],
    },
    {
      step_id: 'execute-task',
      type: 'tool',
      params_template: {
        instruction: 'Execute the task based on analysis',
      },
      outputs: ['task_result'],
    },
  ];

  if (approvalStep) {
    steps.push({
      step_id: 'review-result',
      type: 'approval_gate',
      params_template: {
        message: 'Review the result before finalizing.',
      },
      outputs: ['approved_result'],
    });
  }

  steps.push({
    step_id: 'finalize',
    type: 'write',
    params_template: {
      content: approvalStep ? '{{approved_result}}' : '{{task_result}}',
    },
    outputs: ['final_output'],
  });

  return {
    schema_version: 'playbook.v1',
    id: 'general-task',
    name: 'General Task Execution',
    description: 'Generic task workflow that follows user principles and tone preferences.',
    triggers: [{ type: 'manual' }],
    inputs: [
      { name: 'task', type: 'string', required: true, description: 'The task to perform' },
      { name: 'context', type: 'string', required: false, description: 'Additional context' },
    ],
    steps,
    checks: [
      {
        check_id: 'principles-check',
        type: 'taste',
        condition: 'Output follows user constitution principles',
      },
      {
        check_id: 'safety-check',
        type: 'safety',
        condition: 'No taboo actions taken, escalation rules respected',
      },
    ],
    stop_conditions: [
      {
        condition: 'Task cannot be completed with available tools',
        reason: 'Required capabilities not available',
      },
    ],
    escalations: [
      {
        escalation_id: 'irreversible-action',
        trigger: 'Task involves irreversible actions (delete, publish, send)',
        approval_ref: 'guardrails.approval_rules.irreversible',
      },
    ],
  };
}
