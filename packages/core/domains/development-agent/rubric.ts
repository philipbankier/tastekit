import { DomainRubric } from '../../interview/rubric.js';

/**
 * Development Agent Domain Rubric (Hybrid)
 *
 * Quick tier: Values-First (deep developer identity)
 * Guided adds: Outcome-Centric (practical, what the agent produces)
 * Operator adds: Workflow-Centric (deep process dives)
 *
 * Combined with 7 universal dimensions, this gives:
 *   quick=9, guided=20, operator=28
 */
export const DevelopmentAgentRubric: DomainRubric = {
  domain_id: 'development-agent',
  version: '0.5.0',
  interview_goal: 'Understand the developer\'s engineering philosophy, code quality standards, workflow preferences, and collaboration style to configure an agent that writes code the way they would.',
  includes_universal: true,

  dimensions: [
    // === QUICK TIER: Values-First (5 dimensions) ===
    {
      id: 'engineering_identity',
      name: 'Engineering Identity',
      description: 'How they see themselves as a developer. Craftsperson, pragmatist, scientist, artist? What kind of engineer are they?',
      maps_to: ['principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how they would describe their engineering style in a sentence',
        'Probe for role models or engineering philosophies they admire',
        'Listen for self-identification: are they a systems thinker, product engineer, infrastructure person?',
        'Understand whether they prioritize shipping or craftsmanship',
      ],
      coverage_criteria: [
        'Engineering identity/archetype captured',
        'Primary motivation understood (shipping, quality, learning, impact)',
      ],
    },
    {
      id: 'core_technical_values',
      name: 'Core Technical Values',
      description: 'Their 3-5 non-negotiable technical values. Simplicity, correctness, velocity, readability, performance, security — what matters most?',
      maps_to: ['principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask what their top 3 non-negotiable values are when writing code',
        'Challenge with tradeoff scenarios: "if you had to choose between readable and fast?"',
        'Ask what annoys them most in a codebase',
        'Listen for implicit values in their complaints and preferences',
      ],
      coverage_criteria: [
        'At least 3 core values identified',
        'Priority ordering established',
        'At least one tradeoff position expressed',
      ],
    },
    {
      id: 'collaboration_style',
      name: 'Collaboration Style',
      description: 'How they work with other developers and how the agent should fit into that. Code review expectations, pair programming mindset.',
      maps_to: ['principles', 'tone'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask if they think of the agent as a pair programmer, junior dev, or tool',
        'Probe for code review preferences: what do they look for?',
        'Understand async vs. sync collaboration preferences',
        'At operator depth: how should the agent handle disagreements?',
      ],
      coverage_criteria: [
        'Agent relationship model established (peer, assistant, tool)',
        'Code review expectations expressed',
      ],
    },
    {
      id: 'learning_philosophy',
      name: 'Learning & Growth Philosophy',
      description: 'How they approach new technology, learning from mistakes, and experimentation in codebases.',
      maps_to: ['tradeoffs', 'principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about their stance on new vs. battle-tested technology',
        'Probe for how they learn best: docs, examples, trial and error?',
        'Understand experimentation tolerance in production codebases',
      ],
      coverage_criteria: [
        'Innovation vs. stability position captured',
        'Learning style understood',
      ],
    },
    {
      id: 'failure_tolerance',
      name: 'Failure & Mistake Philosophy',
      description: 'How they think about bugs, mistakes, and learning from failures. Perfectionist or "fail fast"?',
      maps_to: ['tradeoffs', 'principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask what they do when they find a bug they introduced',
        'Probe their stance on "move fast and break things" vs. careful shipping',
        'Understand how they want the agent to handle its own mistakes',
      ],
      coverage_criteria: [
        'Error tolerance level captured',
        'Agent mistake handling expectation set',
      ],
    },

    // === GUIDED TIER adds: Outcome-Centric (11 dimensions) ===
    {
      id: 'code_quality_bar',
      name: 'Code Quality Bar',
      description: 'What "good code" means to them. Readable? Performant? Minimal? Well-tested? DRY? Pragmatic duplication?',
      maps_to: ['principles'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask what they notice first when reading someone else\'s code',
        'Probe their DRY stance: is duplication sometimes acceptable?',
        'Ask for their definition of "production-ready" code',
        'Understand testing expectations as part of quality',
      ],
      coverage_criteria: [
        'Quality definition captured',
        'Testing expectations as part of quality expressed',
      ],
    },
    {
      id: 'output_format_preferences',
      name: 'Output Format Preferences',
      description: 'How they want the agent to present code. Full files? Diffs? Explanations alongside? Comments in code?',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask if they prefer full file output or targeted diffs',
        'Probe for explanation expectations: inline comments? separate section?',
        'Understand verbosity preference: minimal changes or thorough context?',
      ],
      coverage_criteria: [
        'Output format preference expressed',
        'Explanation style captured',
      ],
    },
    {
      id: 'naming_conventions',
      name: 'Naming Conventions',
      description: 'Variable, function, file, and module naming philosophy. Case style, descriptiveness, abbreviation tolerance.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about naming style: verbose descriptive or terse?',
        'Probe for abbreviation tolerance',
        'Ask about file naming: kebab-case? camelCase?',
        'Understand naming-specific pet peeves',
      ],
      coverage_criteria: [
        'Naming style preference captured',
        'At least one specific convention mentioned',
      ],
    },
    {
      id: 'code_structure_preferences',
      name: 'Code Structure & Organization',
      description: 'Module organization, file size limits, separation of concerns, directory structure opinions.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about preferred file organization patterns',
        'Probe for file size preferences: when is a file too big?',
        'Understand separation of concerns philosophy',
        'Ask about single responsibility at the module level',
      ],
      coverage_criteria: [
        'Organization philosophy captured',
        'File size/complexity threshold expressed',
      ],
    },
    {
      id: 'testing_output_expectations',
      name: 'Testing Philosophy & Output',
      description: 'Test naming, assertion style, what to test vs. skip, TDD vs. test-after, unit vs. integration focus.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask about TDD vs. test-after preference',
        'Probe for unit vs. integration vs. e2e balance',
        'Ask about test naming conventions',
        'Understand coverage expectations: percentage or coverage of critical paths?',
      ],
      coverage_criteria: [
        'Testing approach captured (TDD vs. test-after)',
        'Coverage expectations expressed',
      ],
    },
    {
      id: 'commit_message_format',
      name: 'Commit Message Format',
      description: 'Conventional commits, detail level, scope expectations, squash vs. granular commits.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about commit message format (conventional commits, free-form, etc.)',
        'Probe for commit granularity: atomic or batched?',
        'Understand squash-on-merge vs. clean history preferences',
      ],
      coverage_criteria: [
        'Commit format preference captured',
        'Granularity preference expressed',
      ],
    },
    {
      id: 'pr_description_quality',
      name: 'PR Description Quality',
      description: 'What a good PR description includes. Summary style, test plan, screenshots, linked issues.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask what they always want to see in a PR description',
        'Probe for template usage',
        'Understand review expectations for the agent\'s PRs',
      ],
      coverage_criteria: [
        'PR description expectations captured',
      ],
    },
    {
      id: 'documentation_voice',
      name: 'Documentation Voice',
      description: 'Technical writing style, audience assumptions, when docs are needed, inline vs. external documentation.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask when they think documentation is necessary vs. overkill',
        'Probe for inline comment philosophy: minimal or thorough?',
        'Understand README expectations',
      ],
      coverage_criteria: [
        'Documentation philosophy captured',
        'Comment style preference expressed',
      ],
    },
    {
      id: 'error_message_philosophy',
      name: 'Error Message Philosophy',
      description: 'User-facing vs. developer error messages. Actionable errors, error handling patterns.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about their error handling philosophy: defensive or fail-fast?',
        'Probe for error message quality expectations',
        'Understand logging verbosity preferences',
      ],
      coverage_criteria: [
        'Error handling philosophy captured',
      ],
    },
    {
      id: 'logging_approach',
      name: 'Logging & Observability',
      description: 'What to log, log levels, structured logging opinions, debugging approach.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about logging philosophy: when is a log line warranted?',
        'Probe for structured logging opinions',
        'Understand debugging approach: printf, debugger, or both?',
      ],
      coverage_criteria: [
        'Logging philosophy captured',
      ],
    },
    {
      id: 'type_safety_stance',
      name: 'Type Safety Stance',
      description: 'Strict typing preferences, use of any/unknown, generics philosophy, type inference reliance.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about strict mode, any vs. unknown, generics usage',
        'Probe for type inference tolerance vs. explicit annotations',
        'Understand opinions on type-driven development',
      ],
      coverage_criteria: [
        'Type safety preference captured',
      ],
    },

    // === OPERATOR TIER adds: Workflow-Centric (8 dimensions) ===
    {
      id: 'ci_cd_philosophy',
      name: 'CI/CD Philosophy',
      description: 'Pipeline expectations, deployment safety, rollback approach, branch protection opinions.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about deployment frequency and safety nets',
        'Probe for rollback strategy',
        'Understand branch protection and merge requirements',
      ],
      coverage_criteria: [
        'Deployment philosophy captured',
        'Safety requirements expressed',
      ],
    },
    {
      id: 'incident_response',
      name: 'Incident Response',
      description: 'How the agent should behave during outages or critical bugs. Urgency, communication, rollback authority.',
      maps_to: ['taboos', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how the agent should handle production issues',
        'Probe for escalation procedures',
        'Understand hotfix vs. proper-fix tradeoff tolerance',
      ],
      coverage_criteria: [
        'Incident handling expectations set',
      ],
    },
    {
      id: 'api_design_principles',
      name: 'API Design Principles',
      description: 'REST vs. GraphQL, versioning, error format, endpoint naming, backward compatibility opinions.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about API design opinions',
        'Probe for backward compatibility stance',
        'Understand error response format preferences',
      ],
      coverage_criteria: [
        'API design preferences captured',
      ],
    },
    {
      id: 'technical_debt_management',
      name: 'Technical Debt Management',
      description: 'When to take on debt, when to pay it down, tracking approach, refactoring cadence.',
      maps_to: ['tradeoffs', 'principles'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about their relationship with technical debt',
        'Probe for refactoring triggers and boundaries',
        'Understand boy scout rule adherence',
      ],
      coverage_criteria: [
        'Tech debt philosophy captured',
      ],
    },
    {
      id: 'legacy_code_approach',
      name: 'Legacy Code Approach',
      description: 'How to handle legacy code. Migration strategies, strangler fig, big-bang rewrite opinions.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about their approach to working with legacy codebases',
        'Probe for migration strategy preferences',
        'Understand tolerance for "leave it as-is" vs. "improve as you go"',
      ],
      coverage_criteria: [
        'Legacy code approach captured',
      ],
    },
    {
      id: 'mentoring_voice',
      name: 'Mentoring & Teaching Voice',
      description: 'If the agent is helping less experienced developers, what teaching style to use. Patient, Socratic, direct?',
      maps_to: ['tone', 'principles'],
      depth_tiers: ['operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how they mentor junior developers',
        'Probe for teaching philosophy: explain why or just show how?',
        'Understand when the agent should be pedagogical vs. efficient',
      ],
      coverage_criteria: [
        'Teaching/mentoring style captured',
      ],
    },
    {
      id: 'open_source_etiquette',
      name: 'Open Source Etiquette',
      description: 'Contributing to open source, license awareness, community interaction style.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about open source contribution experience',
        'Probe for license awareness and preference',
        'Understand community engagement expectations',
      ],
      coverage_criteria: [
        'Open source stance captured',
      ],
    },
    {
      id: 'tech_stack_opinions',
      name: 'Tech Stack Opinions',
      description: 'Strong opinions about frameworks, libraries, patterns. What they love, hate, and refuse to use.',
      maps_to: ['domain_specific', 'principles'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about frameworks and libraries they love and hate',
        'Probe for design pattern opinions',
        'Understand "never use" list for technologies',
      ],
      coverage_criteria: [
        'Key tech stack opinions captured',
      ],
    },
  ],
};
