# TasteKit Live Full Taste Composition E2E Report

Result: **pass**

## Run Metadata

- output_dir: /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758
- workspace_dir: /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace
- domain: general-agent
- depth: Full Taste Composition
- internal_depth: operator
- openai_model: grok-4.3
- zai_model: glm-5.1
- persona_path: docs/validation/live/full-composition-persona.md
- persona_sha256: 4d9c7b7c21f0863f402219f1ce42b38e927a21174f4de576fd327050fc37807b
- judge_rubric_path: docs/validation/live/full-composition-judge-rubric.md
- judge_rubric_sha256: be7dc91c7d512a5de8044271f49440acf4545c7f51ee0075ca3af861e6f2a1f3
- canonical_persona_sha256: 4d9c7b7c21f0863f402219f1ce42b38e927a21174f4de576fd327050fc37807b
- canonical_judge_rubric_sha256: be7dc91c7d512a5de8044271f49440acf4545c7f51ee0075ca3af861e6f2a1f3
- provider_mode: subscription-live-demo
- package_version: 1.1.0
- git_commit: af9455ef2e875b2a1564b07905282c44c68b4ac9
- git_dirty: true
- git_dirty_fingerprint: 7e296e7568369804e60edf8234b8d37651c631eb28e7a03b8b790271db4b8898
- credential_env_file: docs/validation/live/tastekit-live.env
- credential_env_file_loaded_keys: OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL,ZAI_API_KEY,ZAI_BASE_URL,ZAI_MODEL,ZAI_THINKING
- credential_env_file_skipped_keys: none
- credential_openai_key: present
- credential_openai_key_source: OPENAI_API_KEY_FILE
- credential_zai_key: present
- credential_zai_key_source: ZAI_API_KEY_FILE
- max_turns: 90
- started_at: 2026-05-17T22:07:58.608Z
- ended_at: 2026-05-17T22:16:44.165Z

## Interview Shape

- turn_count: 30
- stop_reason: tastekit-complete
- fatigue_events: 0
- conflicts: 0
- confirmation_checkpoints: 3

## Taste Extracted

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

## Deterministic Assertions

| Status | Severity | Name | Evidence |
| --- | --- | --- | --- |
| pass | critical | provider-preflight | grok-4.3 and glm-5.1 reachable |
| pass | critical | live-interview-complete | 30 turns |
| pass | critical | constitution-extensions | /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/.tastekit/constitution.v1.json |
| pass | critical | validator | ok=true issues=0 |
| pass | critical | export-artifacts-present | 7 files |
| pass | critical | runtime-markdown-safe | 3 files |
| pass | critical | managed-region-rerun-balanced | CLAUDE.md, SOUL.md, and AGENTS.md each have one TasteKit managed region after rerun |
| pass | critical | managed-region-manual-content-preserved | Manual sections outside TasteKit regions were preserved in CLAUDE.md, SOUL.md, and AGENTS.md |

## Artifact Inventory

- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/.tastekit/session.json
  - bytes: 93759
  - sha256: 36cee6d3b09f93e94efe09101a676e97a0b3b0350a5c55d40569136d45908252
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/.tastekit/constitution.v1.json
  - bytes: 40434
  - sha256: 7a0fe5c4c6b5703c7f36c1056bd0accf08fb56d78e518e839ccfba5e71769396
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/.tastekit/evals/live-e2e-evalpack.json
  - bytes: 211504
  - sha256: 3500de3aac45f082876d11b689f92b7ebaae6151e28014503d1dd919b8f7823e
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/.tastekit/traces/live-e2e-drift.trace.v1.jsonl
  - bytes: 1393
  - sha256: 4bc7e4e6f6aeba8ed042d488c1cdb23f399de79a585dde71fadd0ca99b50acfd
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/.tastekit/traces/live-e2e-clean-replay.trace.v1.jsonl
  - bytes: 294
  - sha256: f70cf17e42ac86288e2d39f1397fbe621e1672b8257cb165755b69c592e4f668
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/CLAUDE.md
  - bytes: 5695
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
       _Without targeted critique the agent produces dangerous consensus that feels productive while ignoring internal contradictions, or adds noise by questioning every minor point equally._
    3. **[use_verified_primary_sources_for_researc]** Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.
       _Relying on secondary repetition or unexamined sources produces confidently presented but unsupported conclusions
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/SOUL.md
  - bytes: 4555
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
    1. **Detect whether user input is the subject of reasoning versus settled direction to execute.** — Missing this distinction causes either blind execution of flawed plans that waste hours in high-stakes incidents or unnecessary second-guessing of explicit instructions, breaking collaboration in operator workflows.
    2. **Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.** — Without targeted critique the agent produces dangerous consensus that feels productive while ignoring internal contradictions, or adds noise by questioning every minor point equally.
    3. **Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.** — Relying on secondary repetition or unexamined sources produces confidently presented but unsupported conclusions that cascade into bad decisions.
    4. **Lead with a recommendation when
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/workspace/AGENTS.md
  - bytes: 3146
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
    - **use_verified_primary_sources_for_researc**: Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.
    - **lead_with_a_recommendation_when_convicti**: Lead with a recommendation when conviction exists, always accompanied by the reasoning chain, explicit confidence level, and honest tradeoffs.
    - **exercise_calibrated_autonomy_act_indepen**: Exercise calibrated autonomy: act independently on research and internal drafting but pause for explicit approval on irreversible, external, or high-blast-radius actions.
    - **run_a_self_coherence_check_before_delive**: Run a self-coherence check before d
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/claude-code/CLAUDE.md
  - bytes: 5638
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
       _Relying on secondary repetition or unexamined sources produces confidently presented but unsupported conclusions that cascade into bad decisions._
    4. **[lead_with_a_re
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/openclaw/SOUL.md
  - bytes: 4466
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
  - bytes: 3089
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
    - **exercise_calibrated_autonomy_act_indepen**: Exercise calibrated autonomy: act independently on research and internal drafting but pause for explicit approval on irreversible, external, or high-blast-radius actions.
    - **run_a_self_coherence_check_before_delive**: Run a self-coherence check before delivery: answer the exact question, surface assumptions
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/openclaw/openclaw.config.json
  - bytes: 7218
  - sha256: f42b0237df637d6aee46fa3fb70bd84d874fba85def77e98c0255e05613395d6
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/manus/README.md
  - bytes: 1348
  - sha256: d76ea45276d3eb94a41970ccd45d7cf10abc9cfb841b3a2b3c588db82cea29ca
  - excerpt:
    # TasteKit Skills for Manus
    This directory contains skills exported from TasteKit.
    ## Principles
    1. Detect whether user input is the subject of reasoning versus settled direction to execute.
    2. Deliver targeted direct critique only on real gaps, contradictions, or missing information rather than empty consensus or performative contrarianism.
    3. Use verified primary sources for research claims and explicitly flag thin, contested, circular, or unverifiable evidence.
    4. Lead with a recommendation when conviction exists, always accompanied by the reasoning chain, explicit confidence level, and honest tradeoffs.
    5. Exercise calibrated autonomy: act independently on research and internal drafting but pause for explicit approval on irreversible, external, or high-blast-radius actions.
    6. Run a self-coherence check before delivery: answer the exact question, surface assumptions visibly, eliminate generic filler, and flag internal contradictions or overconfident language.
    ## Tone
    Voice: direct, precise, honest about uncertainty
    ## Usage
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/agents-md/AGENTS.md
  - bytes: 3720
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
    - **exercise_calibrated_autonomy_act_indepen**: Exercise calibrated autonomy: act independently on research and internal drafting but pause for explicit approval on irreversible, external, or high-blast-radius actions.
    - **run_a_self_coherence_check_before_delive**: Run a self-coherence check before delivery: answer the exact question, surface assumptions
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports/agent-file/agent.af
  - bytes: 4112
  - sha256: 9ff22fa6be928ac67f2102c8054c45f4bc74a881c66251242944440d69374869
- /Users/philipbankier/Development/OSS/Taste OSS/tastekit-standalone-release/docs/validation/live/subscription-demo-grok-glm-20260517-180758/exports

## Judge Results

Average: 4.78
Passed: true
- Depth: 5 - Mode-awareness as load-bearing distinction, nuanced judgment rules, feedback persistence, and cost calibration surfaced through iterative corrections.
- Specificity: 5 - Principles include concrete good/bad examples, extracted facts map directly to behaviors, and runtime files contain actionable guardrails and voice rules.
- Tension capture: 4 - Tradeoffs like concise vs deep reasoning, autonomy vs risk, and critique without theater are preserved in constitution and tradeoffs section.
- Autonomy boundaries: 5 - Calibrated autonomy with explicit must-escalate list, gray-area judgment heuristics (90% low-cost vs 60% high-blast), and reversibility triggers clearly defined.
- Challenge style: 5 - Targeted direct critique on real gaps only, mode-aware distinction, rejection of performative contrarianism and sycophancy with precise examples.
- Evidence behavior: 5 - Primary sources required, circular/thin evidence flagged upfront, assumptions labeled by task type, and citations policy for load-bearing claims.
- Metacognition: 4 - Self-coherence check principle, fatigue signals in transcript, persistent corrections, and assumption surfacing are captured though some elements inferred.
- Runtime usability: 5 - CLAUDE.md, SOUL.md, AGENTS.md ready for immediate agent use with principles, guardrails, voice rules, and managed regions preserved.
- Drift/eval readiness: 5 - Full trace_map, session JSON, passing drift/eval checks, and multi-file artifacts support regression and maintenance.

## Drift And Eval Results

- skills graph: pass - nodes=2 edges=1 missing_refs=0; source: generated workspace skill graph
- trust audit: pass - passed=true violations=0; source: generated workspace trust policy
- drift detect: pass - proposals=3 signals=assertion_mismatch,principle_violation,repeated_edit; source: synthetic drift trace fixture
- eval run: pass - results=4 passed=4 avg=1.00/1.00; source: generated profile eval pack
- eval replay: pass - passed=true violations=0; source: clean replay trace fixture

## Verification Commands

- `pnpm test:live-e2e:subscription-demo`
- `npx @actrun_ai/tastekit-validator .tastekit/constitution.v1.json --json`
- `tastekit export --target claude-code --out .`
- `tastekit export --target openclaw --out exports/openclaw`
- `tastekit export --target manus --out exports/manus`
- `tastekit skills graph --json`
- `tastekit trust audit --json`
- `tastekit drift detect --json`
- `tastekit eval run --pack .tastekit/evals/live-e2e-evalpack.json --format json`
- `tastekit eval replay --trace .tastekit/traces/live-e2e-clean-replay.trace.v1.jsonl --json`

## Release Interpretation

Subscription-backed live demo passed with qualitative judge evidence. This is real-world harness evidence, but official release evidence still requires the strict GPT-5.5 + GLM-5.1 release sequence.

## Follow-Ups

- Subscription-backed live demos are real-world evidence, but not official release evidence. Run `pnpm test:live-e2e:release` with official provider keys before publishing.
