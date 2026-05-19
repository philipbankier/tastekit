# Interview Strategy

TasteKit interviews for operating taste, not biographical trivia. Prefer concrete recent examples, disliked past agent behavior, tradeoffs under pressure, and counterexamples that reveal boundaries.

## Questioning Frameworks

- Funnel: start broad, narrow into a real scenario, then extract a reusable rule.
- GROW: goal, reality, options, will. Use it for planning style, project taste, and long-horizon preferences.
- SPIN: situation, problem, implication, need-payoff. Use it when the user describes friction, failures, or workflows they want the agent to improve.
- Contrast pairs: ask "what would a bad agent do here?" beside "what would an excellent one do?"
- Artifact projection: ask how a preferred answer, plan, diff, review, or status update should look.

## Full Taste Composition

Full mode covers every applicable universal and domain dimension. It should feel like a careful onboarding and operating-system design session.

- Build a working hypothesis after each cluster.
- Confirm values before encoding them as principles.
- Push for examples when words are generic: "thorough", "strategic", "fast", "clear", "senior".
- Ask how preferences change by risk level, reversibility, audience, deadline, and confidence.
- Capture planning and ideation taste: how they explore options, kill weak ideas, sequence work, handle unknowns, and decide when something is ready.
- Capture metacognition: desired self-checks, uncertainty language, assumptions, reflection cadence, and when the agent should challenge the user.
- Capture emotional and cognitive load signals: terse replies, impatience, looping, or fatigue. Offer pause, summary, or narrower questioning.

## Metacognitive Policy

Use `why-skill` as an influence, not a dependency: ask the fewest questions that prevent the most downstream damage. Use social-science framing only for practical onboarding quality, not clinical claims.

- Self-determination lens: preserve user agency, competence, and trust. Ask before encoding high-impact assumptions.
- Motivational interviewing lens: partner with the user, reflect what you heard, evoke examples, and summarize before asking for more.
- Cognitive-load lens: reduce extraneous burden. When fatigue appears, summarize, batch low-risk assumptions, and let the user correct the draft.
- Priority lens: always ask critical unknowns; ask important unknowns when not safely inferable; infer nice-to-have and inferable items transparently.
- Stop only when coverage is sufficient, critical dimensions are confirmed, conflicts are handled, and the user has accepted a late draft checkpoint. Full mode is not time-boxed.

## Coverage And Inference

Use cascade only as a hypothesis. If a dimension strongly implies another, mark the second inferred and confirm it before final output. Interview answers override prior files and model guesses.

Coverage states:

- `unseen`: no evidence.
- `hypothesized`: inferred from prior files or nearby answers.
- `answered`: user supplied direct evidence.
- `confirmed`: user accepted the profile wording.
- `conflict`: prior file and user answer disagree, or two answers pull apart.

At roughly 70% answered or confirmed coverage, show the draft as a question. Ask what is missing, wrong, overfit, too generic, or too timid. Full mode may repeat this after deeper clusters.

## Extraction Safeguards

Extract into the constitution schema in passes:

1. Principles and rationale.
2. Tone and formatting.
3. Tradeoffs and autonomy.
4. Evidence policy.
5. Taboos split into `never_do` and `must_escalate`.
6. Domain-specific extensions when useful.

Retry only failed slices. Watch for known failures: duplicate principle IDs, duplicate priorities, gapped priorities, repeated rationales, identical examples, escalation rules placed in `never_do`, and generic filler that cannot guide an agent.
