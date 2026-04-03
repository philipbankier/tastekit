/**
 * General Agent Rubric
 *
 * 18 domain-specific dimensions for broad, cross-functional agents.
 */

import { DomainRubric } from '../../interview/rubric.js';

export const GeneralAgentRubric: DomainRubric = {
  domain_id: 'general-agent',
  version: '1.0.0',
  interview_goal: 'Capture how the user wants a general-purpose agent to plan, act, communicate, and escalate across mixed workflows.',
  includes_universal: true,
  dimensions: [
    // === QUICK TIER ===
    {
      id: 'mission_scope',
      name: 'Mission Scope and Boundaries',
      description: 'Defines what this agent is primarily responsible for and what is out of scope.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Identify primary jobs-to-be-done and recurring requests.',
        'Clarify what the agent should explicitly decline or defer.',
      ],
      coverage_criteria: [
        'Core mission areas are named with examples.',
        'Out-of-scope categories are explicit.',
      ],
      cascade_to: [
        { dimension_id: 'prioritization_framework', weight: 0.2 },
      ],
    },
    {
      id: 'decision_style',
      name: 'Decision-Making Style',
      description: 'How the agent should reason through tradeoffs and present recommendations.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask if user prefers options-first vs recommendation-first outputs.',
        'Probe tolerance for ambiguity vs decisive recommendations.',
      ],
      coverage_criteria: [
        'Preferred recommendation format is clear.',
        'Decision confidence and uncertainty style is defined.',
      ],
      cascade_to: [
        { dimension_id: 'autonomy_boundaries', weight: 0.2 },
      ],
    },
    {
      id: 'autonomy_boundaries',
      name: 'Autonomy and Approval Boundaries',
      description: 'When the agent should act independently versus ask for confirmation.',
      maps_to: ['tradeoffs', 'taboos', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Capture irreversible actions that always need approval.',
        'Identify safe low-risk actions that can be automated.',
      ],
      coverage_criteria: [
        'Autonomous action envelope is explicitly bounded.',
        'Escalation triggers and approval points are documented.',
      ],
    },
    {
      id: 'communication_contract',
      name: 'Communication Contract',
      description: 'Preferred voice, response structure, and reporting cadence for day-to-day interaction.',
      maps_to: ['tone', 'principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about brevity vs detail and preferred formatting.',
        'Probe how often proactive updates are expected.',
      ],
      coverage_criteria: [
        'Tone and formatting preferences are concrete.',
        'Update cadence and status-report style are specified.',
      ],
    },
    {
      id: 'evidence_rigor',
      name: 'Evidence and Verification Rigor',
      description: 'How strongly the agent should verify claims, cite sources, and annotate uncertainty.',
      maps_to: ['evidence_policy', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Determine citation expectations by task type.',
        'Capture red lines for unsupported claims.',
      ],
      coverage_criteria: [
        'Verification depth expectations are defined.',
        'Citation and uncertainty rules are explicit.',
      ],
      cascade_to: [
        { dimension_id: 'quality_bar', weight: 0.2 },
      ],
    },
    {
      id: 'risk_escalation',
      name: 'Risk and Escalation Policy',
      description: 'Operational and ethical situations that require immediate escalation.',
      maps_to: ['taboos', 'tradeoffs', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Identify legal, financial, reputational, or privacy-sensitive triggers.',
        'Clarify stop/ask/escalate behavior under uncertainty.',
      ],
      coverage_criteria: [
        'High-risk categories are enumerated.',
        'Escalation response and fallback behavior are explicit.',
      ],
    },

    // === GUIDED TIER ===
    {
      id: 'planning_horizon',
      name: 'Planning Horizon and Cadence',
      description: 'How far ahead the agent should plan and how often plans should be revisited.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Capture short-term execution cadence and long-range planning expectations.',
        'Ask how frequently priorities should be re-evaluated.',
      ],
      coverage_criteria: [
        'Near-term vs long-term planning balance is clear.',
        'Review and replanning cadence is specified.',
      ],
    },
    {
      id: 'tooling_preferences',
      name: 'Tooling and Systems Preferences',
      description: 'Preferred tools, integrations, and operational systems for execution.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Identify preferred toolchain and any banned tools.',
        'Capture reliability expectations for external systems.',
      ],
      coverage_criteria: [
        'Must-use and must-avoid tools are listed.',
        'Integration expectations and failure fallback behavior are defined.',
      ],
    },
    {
      id: 'context_window_management',
      name: 'Context Management Strategy',
      description: 'How the agent should retain, summarize, and refresh context across tasks.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask what context should be persisted versus treated as ephemeral.',
        'Probe summarization style when context grows large.',
      ],
      coverage_criteria: [
        'Persistence vs ephemerality expectations are explicit.',
        'Summarization and context refresh behavior is defined.',
      ],
    },
    {
      id: 'output_artifact_preferences',
      name: 'Output Artifact Preferences',
      description: 'Preferred deliverable types, templates, and acceptance format.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Identify expected artifact formats (checklists, plans, memos, diffs, etc.).',
        'Capture structure and completeness expectations per artifact type.',
      ],
      coverage_criteria: [
        'Primary output formats are identified.',
        'Acceptance criteria for output quality and completeness are explicit.',
      ],
    },
    {
      id: 'feedback_loop',
      name: 'Feedback and Iteration Loop',
      description: 'How the user gives feedback and how the agent should adapt over time.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Determine preferred correction granularity and iteration cadence.',
        'Ask how quickly behavior should adapt after feedback.',
      ],
      coverage_criteria: [
        'Feedback intake style and loop timing are clear.',
        'Adaptation expectations after corrections are explicit.',
      ],
    },
    {
      id: 'quality_bar',
      name: 'Quality Bar and Exit Criteria',
      description: 'What “good enough” looks like before the agent reports completion.',
      maps_to: ['principles', 'evidence_policy', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Capture mandatory checks before delivery.',
        'Identify acceptable risk and residual uncertainty thresholds.',
      ],
      coverage_criteria: [
        'Completion criteria are measurable and explicit.',
        'Required validations/checks are listed.',
      ],
    },

    // === OPERATOR TIER ===
    {
      id: 'exception_handling',
      name: 'Exception and Incident Handling',
      description: 'How the agent should respond when workflows break or assumptions fail.',
      maps_to: ['taboos', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe fallback behavior for missing data, tool outages, and contradictory inputs.',
        'Capture incident communication expectations.',
      ],
      coverage_criteria: [
        'Failure-mode fallback behavior is explicit.',
        'Incident reporting and escalation details are defined.',
      ],
    },
    {
      id: 'collaboration_style',
      name: 'Collaboration and Stakeholder Style',
      description: 'How the agent should interact with teammates, reviewers, and decision-makers.',
      maps_to: ['tone', 'principles', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask whether the agent should be neutral facilitator vs assertive advisor.',
        'Capture audience-specific communication adaptations.',
      ],
      coverage_criteria: [
        'Stakeholder communication style is explicit.',
        'Role-based tone and detail adjustments are defined.',
      ],
    },
    {
      id: 'prioritization_framework',
      name: 'Prioritization Framework',
      description: 'Rules for ranking tasks and choosing what to execute first.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Identify ranking factors (impact, urgency, reversibility, effort).',
        'Capture tie-breakers and conflict resolution behavior.',
      ],
      coverage_criteria: [
        'Priority scoring logic is explicit.',
        'Conflict and tie-break handling is documented.',
      ],
    },
    {
      id: 'performance_constraints',
      name: 'Performance and Cost Constraints',
      description: 'Latency, depth, and resource-cost expectations across work types.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe acceptable latency for different classes of work.',
        'Capture cost-vs-thoroughness thresholds.',
      ],
      coverage_criteria: [
        'Performance targets and cost sensitivity are explicit.',
        'Fallback behavior when constraints conflict is defined.',
      ],
    },
    {
      id: 'memory_retention_preferences',
      name: 'Memory and Retention Preferences',
      description: 'What long-term memory is useful, and what should be dropped or redacted.',
      maps_to: ['domain_specific', 'evidence_policy'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Determine retention horizon and salience rules for memory writes.',
        'Capture privacy boundaries for stored context.',
      ],
      coverage_criteria: [
        'Retention and forgetting policy is explicit.',
        'Sensitive-memory handling rules are defined.',
      ],
    },
    {
      id: 'governance_auditability',
      name: 'Governance and Auditability',
      description: 'How actions should be logged, reviewed, and justified for accountability.',
      maps_to: ['evidence_policy', 'taboos', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask what audit trails are required for high-impact actions.',
        'Capture expectations for decision rationale and traceability.',
      ],
      coverage_criteria: [
        'Audit/logging expectations are explicit.',
        'Decision traceability and review workflow are defined.',
      ],
    },
  ],
};
