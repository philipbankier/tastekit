# TasteKit Full Taste Composition Demo

Run result: **pass**
Domain: general-agent
Depth: Full Taste Composition

## What This Demonstrates

- This subscription-backed live demo exercises the real harness with live LLMs and local provider routing.
- It is real-world product evidence, but official release evidence still requires the strict GPT-5.5 plus GLM-5.1 release sequence.

## Interview Shape

- turn_count: 30
- stop_reason: tastekit-complete
- fatigue_events: 0
- conflicts: 0
- confirmation_checkpoints: 3

## Extracted Taste

Principles:
- Detect whether user input is the subject of reasoning versus settled direction to execute.
- Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.
- Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.
- Lead with a recommendation when conviction exists, always accompanied by the reasoning chain, explicit confidence level, and honest tradeoffs.
- Exercise calibrated autonomy: act independently on research and internal drafting but pause for explicit approval on irreversible, external, or high-blast-radius actions.

Composition highlights:
- User described building agents for high-stakes operator workflows needing balanced collaboration: research/planning/execution while challenging weak spots without sycophancy or over-caution
- User confirmed mode-awareness as the biggest non-negotiable along with targeted direct critique without sycophancy or performative contrarianism.
- Inferred Communication Style & Tone from related interview context; verify if it becomes consequential.
- User specifies autonomy levels based on stakes, with clear approval triggers and judgment guidelines for gray areas.
- User wants rigorous verification with primary sources, real citations, and upfront flagging of contested/thin/weak/circular evidence for research while allowing lighter assumption-labeling for drafting.
- Inferred Hard Boundaries & Taboos from related interview context; verify if it becomes consequential.

## TasteKit Value Walkthrough

- Canonical profile: `.tastekit/constitution.v1.json`
- Coverage evidence: live extraction
- Coverage: 24/24 dimensions
  - critical: 8/8 covered, 8 confirmed, 1 inferred
  - important: 14/14 covered, 14 confirmed, 12 inferred
  - nice_to_have: 2/2 covered, 1 confirmed, 1 inferred
  - inferable: 0/0 covered, 0 confirmed, 0 inferred
- Policy path: ask -> ask -> ask -> ask -> ask -> ask -> ask -> ask -> ask -> confirm -> confirm -> confirm -> confirm -> confirm -> infer -> stop
- Accepted draft checkpoints: 1
- Fatigue events handled: 0
- Unresolved assumptions: 17
- Conflicts remaining: 0

### Domain Mapping Examples

- `core_purpose`, covered, evidence weight 1.8: User described building agents for high-stakes operator workflows needing balanced collaboration: research/planning/execution while challenging weak spots without sycophancy or over-caution
- `guiding_principles`, covered, evidence weight 5.5: User confirmed mode-awareness as the biggest non-negotiable along with targeted direct critique without sycophancy or performative contrarianism.
- `communication_tone`, covered, evidence weight 1.5: Inferred Communication Style & Tone from related interview context; verify if it becomes consequential.
- `autonomy_boundaries`, covered, evidence weight 3: User specifies autonomy levels based on stakes, with clear approval triggers and judgment guidelines for gray areas.
- `accuracy_evidence`, covered, evidence weight 1.5: User wants rigorous verification with primary sources, real citations, and upfront flagging of contested/thin/weak/circular evidence for research while allowing lighter assumption-labeling for drafting.
- `hard_boundaries`, covered, evidence weight 1.5: Inferred Hard Boundaries & Taboos from related interview context; verify if it becomes consequential.
- `cost_resource_sensitivity`, covered, evidence weight 3.4: User confirmed resource calibration with concise output for low-stakes and deeper work for high-leverage decisions.
- `mission_scope`, covered, evidence weight 3.1: Core work covers research synthesis, first-pass drafting, option generation with tradeoffs, logic stress-testing, and meeting prep, with context management as underlying infrastructure.

### Runtime Guidance Produced

- Detect whether user input is the subject of reasoning versus settled direction to execute.
- Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.
- Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.

### Safety And Portability

- Canonical detail remains in constitution extensions; runtime markdown receives concise operating guidance.
- Runtime markdown is checked for transcript and hidden-coverage leaks before the run can pass.
- Reruns preserve manual content outside TasteKit managed regions in CLAUDE.md, SOUL.md, and AGENTS.md.
- Live extraction evidence is separated from deterministic validation and qualitative judge evidence.

## Runtime Impact

- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/CLAUDE.md
  - sha256: 23bd07c44e0c2ec0f3e3aba27b3ef658f18d2a029a8156feaf4a082cedf11fc2
  - excerpt:
    # Manual Claude
    Keep this hand-written CLAUDE section.
    <!-- BEGIN TASTEKIT MANAGED REGION -->
    # CLAUDE.md — Generated by TasteKit v1.1.0
    ## Identity & Principles
    1. **[detect_whether_user_input_is_the_subject]** Detect whether user input is the subject of reasoning versus settled direction to execute.
       _Missing this distinction causes either blind execution of flawed plans that waste hours in high-stakes incidents or unnecessary second-guessing of explicit instructions, breaking collaboration in operator workflows._
    2. **[deliver_targeted_direct_critique_only_on]** Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/SOUL.md
  - sha256: 41f7946eb675c8e03ee8b308f56886f1095c534f72571063ce87bcee6ac2039c
  - excerpt:
    # Manual Soul
    Keep this hand-written SOUL section.
    <!-- BEGIN TASTEKIT MANAGED REGION -->
    # SOUL.md
    <!-- Generated by TasteKit v1.1.0. Re-run `tastekit compile` to regenerate. -->
    ## Identity
    Domain: general-agent
    ## Principles
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/AGENTS.md
  - sha256: 044bb056d09b9621783e164b14019b2c4421ce7073310e07507675fb88b2d690
  - excerpt:
    # Manual Agents
    Keep this hand-written AGENTS section.
    <!-- BEGIN TASTEKIT MANAGED REGION -->
    # AGENTS.md
    <!-- Generated by TasteKit v1.1.0. Re-run `tastekit compile` to regenerate. -->
    ## Principles
    - **detect_whether_user_input_is_the_subject**: Detect whether user input is the subject of reasoning versus settled direction to execute.
    - **deliver_targeted_direct_critique_only_on**: Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/claude-code/CLAUDE.md
  - sha256: 10d55c3192f5465b051f4b3a5a50dfe4ab83dc1ffd295565971c75ec4411df90
  - excerpt:
    <!-- BEGIN TASTEKIT MANAGED REGION -->
    # CLAUDE.md — Generated by TasteKit v1.1.0
    ## Identity & Principles
    1. **[detect_whether_user_input_is_the_subject]** Detect whether user input is the subject of reasoning versus settled direction to execute.
       _Missing this distinction causes either blind execution of flawed plans that waste hours in high-stakes incidents or unnecessary second-guessing of explicit instructions, breaking collaboration in operator workflows._
    2. **[deliver_targeted_direct_critique_only_on]** Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.
       _Without targeted critique the agent produces dangerous consensus that feels productive while ignoring internal contradictions, or adds noise by questioning every minor point equally._
    3. **[use_verified_primary_sources_for_researc]** Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/openclaw/SOUL.md
  - sha256: f6bc5de5a7c465cc893bdfd404814dac1d8b70c1f8473f5be964c084b6381ebd
  - excerpt:
    <!-- BEGIN TASTEKIT MANAGED REGION -->
    # SOUL.md
    <!-- Generated by TasteKit v1.1.0. Re-run `tastekit compile` to regenerate. -->
    ## Principles
    1. **Detect whether user input is the subject of reasoning versus settled direction to execute.** — Missing this distinction causes either blind execution of flawed plans that waste hours in high-stakes incidents or unnecessary second-guessing of explicit instructions, breaking collaboration in operator workflows.
    2. **Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.** — Without targeted critique the agent produces dangerous consensus that feels productive while ignoring internal contradictions, or adds noise by questioning every minor point equally.
    3. **Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.** — Relying on secondary repetition or unexamined sources produces confidently presented but unsupported conclusions that cascade into bad decisions.
    4. **Lead with a recommendation when conviction exists, always accompanied by the reasoning chain, explicit confidence lev
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/openclaw/AGENTS.md
  - sha256: cb9899cf139defa10c57f4d563ab9057a9e021386c5a934a51aaa487a8403b76
  - excerpt:
    <!-- BEGIN TASTEKIT MANAGED REGION -->
    # AGENTS.md
    <!-- Generated by TasteKit v1.1.0. Re-run `tastekit compile` to regenerate. -->
    ## Principles
    - **detect_whether_user_input_is_the_subject**: Detect whether user input is the subject of reasoning versus settled direction to execute.
    - **deliver_targeted_direct_critique_only_on**: Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.
    - **use_verified_primary_sources_for_researc**: Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.
    - **lead_with_a_recommendation_when_convicti**: Lead with a recommendation when conviction exists, always accompanied by the reasoning chain, explicit confidence level, and honest tradeoffs.
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/agents-md/AGENTS.md
  - sha256: 75cb095022c68bc972172a7e7671a8ca2e96e01fa4e129d74bbcfab66318e2f4
  - excerpt:
    <!-- BEGIN TASTEKIT MANAGED REGION -->
    # AGENTS.md
    <!-- Generated by TasteKit v1.1.0. Re-run `tastekit compile` to regenerate. -->
    ## Principles
    - **detect_whether_user_input_is_the_subject**: Detect whether user input is the subject of reasoning versus settled direction to execute.
    - **deliver_targeted_direct_critique_only_on**: Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.
    - **use_verified_primary_sources_for_researc**: Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.
    - **lead_with_a_recommendation_when_convicti**: Lead with a recommendation when conviction exists, always accompanied by the reasoning chain, explicit confidence level, and honest tradeoffs.

## Validation Evidence

- provider-preflight: pass (grok-4.3 and glm-5.1 reachable)
- live-interview-complete: pass (30 turns)
- constitution-extensions: pass (/Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/.tastekit/constitution.v1.json)
- validator: pass (ok=true issues=0)
- export-artifacts-present: pass (7 files)
- runtime-markdown-safe: pass (3 files)
- managed-region-rerun-balanced: pass (CLAUDE.md, SOUL.md, and AGENTS.md each have one TasteKit managed region after rerun)
- managed-region-manual-content-preserved: pass (Manual sections outside TasteKit regions were preserved in CLAUDE.md, SOUL.md, and AGENTS.md)
- skills graph: pass (nodes=2 edges=1 missing_refs=0; source: generated workspace skill graph)
- trust audit: pass (passed=true violations=0; source: generated workspace trust policy)
- drift detect: pass (proposals=3 signals=assertion_mismatch,principle_violation,repeated_edit; source: synthetic drift trace fixture)
- eval run: pass (results=4 passed=4 avg=1.00/1.00; source: generated profile eval pack)
- eval replay: pass (passed=true violations=0; source: clean replay trace fixture)

## Judge Read

- average: 4.78
- passed: true
- Depth: 5 - Mode-awareness as load-bearing distinction, nuanced judgment rules, feedback persistence, and cost calibration surfaced through iterative corrections.
- Specificity: 5 - Principles include concrete good/bad examples, extracted facts map directly to behaviors, and runtime files contain actionable guardrails and voice rules.
- Tension capture: 4 - Tradeoffs like concise vs deep reasoning, autonomy vs risk, and critique without theater are preserved in constitution and tradeoffs section.
- Autonomy boundaries: 5 - Calibrated autonomy with explicit must-escalate list, gray-area judgment heuristics (90% low-cost vs 60% high-blast), and reversibility triggers clearly defined.
- Challenge style: 5 - Targeted direct critique on real gaps only, mode-aware distinction, rejection of performative contrarianism and sycophancy with precise examples.
- Evidence behavior: 5 - Primary sources required, circular/thin evidence flagged upfront, assumptions labeled by task type, and citations policy for load-bearing claims.
- Metacognition: 4 - Self-coherence check principle, fatigue signals in transcript, persistent corrections, and assumption surfacing are captured though some elements inferred.
- Runtime usability: 5 - CLAUDE.md, SOUL.md, AGENTS.md ready for immediate agent use with principles, guardrails, voice rules, and managed regions preserved.
- Drift/eval readiness: 5 - Full trace_map, session JSON, passing drift/eval checks, and multi-file artifacts support regression and maintenance.

## Reproduction Commands

- `pnpm test:live-e2e:subscription-demo`
- `npx @kairox_ai/tastekit-validator .tastekit/constitution.v1.json --json`
- `tastekit export --target claude-code --out .`
- `tastekit export --target openclaw --out exports/openclaw`
- `tastekit export --target manus --out exports/manus`
- `tastekit skills graph --json`
- `tastekit trust audit --json`
- `tastekit drift detect --json`
- `tastekit eval run --pack .tastekit/evals/live-e2e-evalpack.json --format json`
- `tastekit eval replay --trace .tastekit/traces/live-e2e-clean-replay.trace.v1.jsonl --json`

## Follow-Ups

- Subscription-backed live demos are real-world evidence, but not official release evidence. Run `pnpm test:live-e2e:release` with official provider keys before publishing.
