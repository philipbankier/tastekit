# TasteKit: Project Context & Vision

**Version**: 0.5  
**Last Updated**: February 2026  
**Purpose**: Comprehensive context document for developers taking over the project

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Problem & Solution](#core-problem--solution)
3. [Current State (v0.5)](#current-state-v05)
4. [Architecture & Design Principles](#architecture--design-principles)
5. [Competitive Landscape](#competitive-landscape)
6. [Evolution Roadmap](#evolution-roadmap)
7. [Technical Innovations](#technical-innovations)
8. [Business Model](#business-model)
9. [Success Metrics](#success-metrics)
10. [Implementation Priorities](#implementation-priorities)

---

## Project Overview

**TasteKit** is an open-source CLI tool and library for building specialized AI agents with persistent, portable "taste" profiles. It compiles user preferences into versioned artifacts that work across multiple agent runtimes (OpenClaw, Autopilots, Claude Code, Manus).

### The Core Insight

> **Agents without memory are just expensive chatbots. Agents with TasteKit are valuable team members.**

### The Vision

TasteKit becomes the **infrastructure layer for the agent economy**—the "Git for AI Agents" that handles identity, memory, and evolution across any runtime.

---

## Core Problem & Solution

### The Problem

1. **Generic agents are too abstract** - Users don't know how to configure them for specific use cases
2. **Memory is locked to platforms** - Your ChatGPT memory doesn't work in Claude
3. **Agents drift over time** - Behavior changes without user awareness or control
4. **No version control** - Can't rollback, diff, or understand how agents evolved
5. **Trust is binary** - Either full access or nothing; no gradual trust building

### The Solution

TasteKit provides:

1. **Domain-focused onboarding** - Specialized question flows for General, Development, Content, Research, Sales, and Support agents
2. **Portable artifacts** - Taste profiles work across any compatible runtime
3. **Built-in drift detection** - Track and manage how agents evolve
4. **Version control** - Git-like semantics for agent personalities
5. **Trust management** - Explicit pinning and provenance tracking for tools (MCP)

---

## Current State (v0.5)

### What's Implemented

**Core Packages:**
- `@actrun_ai/tastekit-core` - Schemas, compiler, memory, MCP, trust, tracing, drift, eval
- `@actrun_ai/tastekit-cli` - Command-line interface with all major commands
- `@actrun_ai/tastekit-adapters` - Runtime adapters for Claude Code, Manus, OpenClaw, and Autopilots

**Domains:**
- **General Agent** - Mixed technical and non-technical work, planning, synthesis, and decision support
- **Development Agent** - Code review, documentation, debugging, testing, and refactoring
- **Content Agent** - Brand voice, editorial drafting, channel adaptation, and publishing boundaries
- **Research Agent** - Source discovery, evidence grading, synthesis, and competitive analysis
- **Sales Agent** - Account research, qualification, buyer-facing follow-up, and deal-risk escalation
- **Support Agent** - Troubleshooting, customer communication, privacy-safe assistance, and escalation

**Features:**
- ✅ Domain-based initialization
- ✅ Interactive onboarding with resumable sessions
- ✅ Compilation to versioned artifacts
- ✅ Skills system with SKILL.md contract
- ✅ MCP binding architecture and client integration
- ✅ Trust management framework
- ✅ Trace-first logging (JSONL)
- ✅ Drift detection (manual review)
- ✅ Evaluation framework
- ✅ Export to multiple runtimes

### What's Missing

**Critical:**
- Continued MCP client hardening against more real-world servers
- Production testing with actual agents
- Community contributions to domains

**Important:**
- Tiered memory system (Constitution → Preferences → Working Memory)
- Performance tracking and analytics
- Automated drift consolidation
- A/B testing for agent variants

---

## Architecture & Design Principles

### Seven Core Principles

1. **Artifact-First** - Everything compiles to versioned files, not locked in databases
2. **Deterministic Compilation** - Same inputs always produce same outputs
3. **Progressive Disclosure** - Minimal context by default, load Skills on-demand
4. **MCP-First** - Standard protocol for all tool integration
5. **Trust-by-Default** - Explicit pinning, no auto-enable, provenance tracking
6. **Trace-First** - All operations produce structured logs (JSONL)
7. **Maintenance is v1** - Drift detection built-in from day one

### Directory Structure

```
.tastekit/
├── workspace.yaml           # Workspace metadata
├── artifacts/
│   ├── constitution.v1.json # Core identity (immutable)
│   ├── guardrails.v1.json   # Safety rules
│   ├── memory.v1.json       # Memory policy
│   ├── bindings.v1.json     # MCP tool bindings
│   ├── trust.v1.json        # Trust relationships
│   └── playbooks/           # Workflow definitions
├── skills/                  # Agent Skills (SKILL.md format)
├── traces/                  # JSONL execution logs
├── memory/
│   ├── working/             # Recent activity (auto-updating)
│   └── consolidated/        # Long-term preferences
└── evals/                   # Evaluation results
```

### Artifact Versioning

```
constitution.v1.json   → Major version (breaking changes)
constitution.v1.2.json → Minor version (additions)
constitution.v1.2.3.json → Patch version (fixes)
```

### Skills System

Skills use progressive disclosure via `SKILL.md`:

```markdown
# Skill: Research Trends

Brief description here (always loaded)

## Usage
When to use this skill (always loaded)

## Implementation
<details>
<summary>Detailed implementation (load on-demand)</summary>

Full implementation details, code, examples...
</details>
```

---

## Competitive Landscape

### Direct Competitors

| Product | Strength | Weakness | TasteKit Advantage |
|---------|----------|----------|-------------------|
| **Anthropic Contextual Memory** | Built into Claude | Platform-locked | Portable across runtimes |
| **OpenAI Custom Instructions** | Easy to use | No version control | Git-like semantics |
| **Dust.tt** | Enterprise workflows | Not portable | Open source + portable |
| **Langchain Memory** | Developer-friendly | No user onboarding | Domain-focused UX |

### Adjacent Projects

- **AutoGPT/AgentGPT** - Autonomous execution, no persistent taste
- **LangGraph** - State machines, no taste management
- **Semantic Kernel** - Orchestration, no user onboarding

### Paid Products

- **Relevance AI** ($79-299/mo) - Closed ecosystem
- **Voiceflow** ($50-400/mo) - Chatbot-focused
- **Zapier Central** (Beta) - No export capability

### TasteKit's Blue Ocean

**Nobody else is doing:**
1. Portable, versioned taste artifacts
2. Domain-specific onboarding
3. Progressive disclosure for Skills
4. Built-in drift detection from v1
5. MCP-first with trust management

**Market Position**: Infrastructure layer, not application layer. Like Stripe for payments or Auth0 for authentication, TasteKit is infrastructure for agent identity and memory.

---

## Evolution Roadmap

### Phase 1: Foundation (v0.5 - v1.0) — *Current*

**Timeline**: Now - 6 months  
**Focus**: Production readiness

**Key Deliverables:**
- ✅ Domain-based architecture
- ✅ Six-domain production release scope
- ⏳ Continued MCP client hardening
- ⏳ Production testing with real users
- ⏳ Community contributions (2-3 new domains)

**Success Criteria:**
- 100+ GitHub stars
- 10+ production users
- 2+ community-contributed domains

---

### Phase 2: Memory Intelligence (v1.0 - v1.5) — *6-12 months*

**Focus**: Tiered memory system and intelligent drift management

#### Core Feature: Three-Layer Memory Architecture

```
┌─────────────────────────────────────┐
│  CONSTITUTION (Immutable Core)      │  ← Never changes without explicit user action
│  - Brand identity                   │     Requires: tastekit onboard
│  - Core principles                  │     Version: Major (1.0 → 2.0)
│  - Red lines                        │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  PREFERENCES (Semi-Mutable)         │  ← Changes with user approval
│  - Tone preferences                 │     Requires: drift review + accept
│  - Platform strategies              │     Version: Minor (1.0 → 1.1)
│  - Content types                    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  WORKING MEMORY (Auto-Updating)     │  ← Changes automatically
│  - Recent topics (last 30 days)     │     Auto-consolidates to Preferences
│  - Performance data                 │     Cleared on: tastekit memory consolidate
│  - Trending formats                 │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  PERFORMANCE METRICS (Read-Only)    │  ← Informs drift proposals
│  - Engagement rates                 │     Never directly changes taste
│  - Conversion metrics               │     Used for: recommendations
│  - User feedback                    │
└─────────────────────────────────────┘
```

#### New Commands

```bash
# Memory management
tastekit memory status              # Show memory layers and sizes
tastekit memory consolidate         # Merge working → preferences
tastekit memory rollback <version>  # Revert to previous state
tastekit memory diff v1.2 v1.5     # Compare two versions

# Enhanced drift management
tastekit drift detect               # Analyze recent activity
tastekit drift review               # Review proposals with context
tastekit drift accept <proposal-id> # Accept specific changes
tastekit drift reject <proposal-id> # Reject with reason
tastekit drift auto-mode on         # Enable auto-consolidation

# Drift proposals include:
# - What changed (diff)
# - Why it changed (evidence from working memory)
# - Impact prediction (based on similar agents)
# - Recommendation (accept/reject/modify)
```

#### Implementation Details

**Working Memory Structure:**

```json
{
  "period": "2026-01-01 to 2026-01-31",
  "observations": [
    {
      "timestamp": "2026-01-15T10:30:00Z",
      "type": "topic_frequency",
      "data": {
        "topic": "AI safety",
        "mentions": 15,
        "previous_average": 3,
        "change": "+400%"
      }
    },
    {
      "timestamp": "2026-01-20T14:00:00Z",
      "type": "tone_shift",
      "data": {
        "detected_tone": "more technical",
        "confidence": 0.85,
        "examples": ["tweet_123", "tweet_456"]
      }
    }
  ],
  "proposals": [
    {
      "id": "prop_001",
      "type": "add_topic",
      "target": "preferences.content_strategy.topics",
      "change": {
        "add": {
          "name": "AI Safety",
          "priority": "medium",
          "frequency": "weekly"
        }
      },
      "evidence": ["observation_1", "observation_2"],
      "impact_prediction": {
        "engagement": "+12%",
        "confidence": 0.72,
        "based_on": "247 similar agents"
      },
      "recommendation": "accept",
      "reason": "Strong signal, aligns with brand, proven performance"
    }
  ]
}
```

**Success Criteria:**
- Agents can evolve without losing identity
- Users understand exactly what changed and why
- Rollback works reliably
- 80%+ of drift proposals are accepted

---

### Phase 3: Performance & Analytics (v1.5 - v2.0) — *12-18 months*

**Focus**: Closed-loop optimization with data-driven taste evolution

#### Core Feature: Performance Tracking & A/B Testing

**1. Metrics Configuration**

```yaml
# .tastekit/metrics/performance.yaml
metrics:
  - name: engagement_rate
    source: twitter_api
    query: "likes + retweets / impressions"
    target: "> 5%"
    weight: 0.4
    
  - name: conversion_rate
    source: stripe_api
    query: "new_customers / link_clicks"
    target: "> 2%"
    weight: 0.3
    
  - name: response_quality
    source: user_feedback
    query: "avg(rating)"
    target: "> 4.0/5.0"
    weight: 0.3

integrations:
  twitter:
    api_key: ${TWITTER_API_KEY}
    metrics: [engagement_rate, follower_growth]
  
  stripe:
    api_key: ${STRIPE_API_KEY}
    metrics: [conversion_rate, revenue]
```

**2. A/B Testing**

```bash
# Create experimental variant
tastekit experiment create "more-casual-tone" \
  --base-version v1.5 \
  --modify "tone: casual, friendly, emoji-heavy" \
  --traffic 20% \
  --duration 7d

# Monitor in real-time
tastekit experiment status "more-casual-tone"
  Variant A (control): engagement 4.2%, conversion 1.8%
  Variant B (casual):  engagement 5.1%, conversion 2.3%
  Winner: Variant B (+21% engagement, +28% conversion)
  Confidence: 95%

# Promote winner
tastekit experiment promote "more-casual-tone"
  ✓ Updated preferences to v1.6
  ✓ All traffic now using casual tone
  ✓ Previous version saved as v1.5
```

**3. Analytics Dashboard**

```bash
tastekit analytics dashboard
  → Opens localhost:3000 with web UI
```

**Dashboard Features:**
- Performance trends (line charts)
- Drift proposals timeline
- Content type performance (bar charts)
- Platform-specific metrics (comparison)
- Skill usage statistics (heatmap)
- A/B test results (comparison tables)

**Implementation Notes:**
- Use Recharts for visualizations
- Real-time updates via WebSocket
- Export reports as PDF/CSV
- Shareable links for stakeholders

**Success Criteria:**
- Users can prove ROI of TasteKit
- Data-driven decisions replace guesswork
- A/B testing increases performance by 20%+ on average

---

### Phase 4: Collaboration & Teams (v2.0 - v2.5) — *18-24 months*

**Focus**: Multi-agent orchestration for enterprise teams

#### Core Feature: Agent Teams & Workflows

**1. Team Workspace**

```bash
# Create team workspace
tastekit team init "marketing-team"
  ✓ Created team workspace
  ✓ Initialized shared memory pool
  ✓ Set up role-based access control

# Add agents to team
tastekit team add content-agent --role writer
tastekit team add research-agent --role researcher
tastekit team add analytics-agent --role analyst

# View team structure
tastekit team list
  Team: marketing-team
  ├── content-agent (writer)
  ├── research-agent (researcher)
  └── analytics-agent (analyst)
```

**2. Shared Memory Pools**

```yaml
# .tastekit/team/shared-memory.yaml
shared_knowledge:
  brand_guidelines:
    source: ./brand-guide.md
    access: read-only
    updated: 2026-01-15
    
  customer_personas:
    source: ./personas.yaml
    access: read-only
    updated: 2026-01-10
    
  product_updates:
    source: ./product-changelog.md
    access: read-write
    updated: 2026-02-01

agent_handoffs:
  - from: research-agent
    to: content-agent
    format: topic_brief
    schema: ./schemas/topic-brief.json
    
  - from: content-agent
    to: analytics-agent
    format: published_content
    schema: ./schemas/content-metadata.json
```

**3. Workflow Orchestration**

```yaml
# .tastekit/team/workflows/weekly-content-sprint.yaml
name: Weekly Content Sprint
schedule: "0 9 * * MON"  # Every Monday at 9am

steps:
  - name: Research Trends
    agent: research-agent
    skill: research-trends
    output: trend_report
    
  - name: Generate Ideas
    agent: content-agent
    skill: generate-post-options
    input: ${trend_report}
    output: content_ideas
    
  - name: Draft Content
    agent: content-agent
    skill: draft-posts
    input: ${content_ideas}
    output: draft_posts
    
  - name: Human Review
    type: approval
    reviewers: [alice@company.com, bob@company.com]
    timeout: 48h
    
  - name: Publish
    agent: content-agent
    skill: publish-to-platforms
    input: ${approved_posts}
    output: published_urls
    
  - name: Track Performance
    agent: analytics-agent
    skill: track-engagement
    input: ${published_urls}
    schedule: "0 9 * * *"  # Daily at 9am for 7 days
```

**4. Role-Based Access Control**

```bash
# Add team members
tastekit team member add alice@company.com \
  --role editor \
  --agents content-agent,research-agent \
  --permissions read,write,deploy

tastekit team member add bob@company.com \
  --role viewer \
  --agents * \
  --permissions read

# Audit log
tastekit team audit
  2026-02-14 10:30 alice@company.com modified content-agent preferences
  2026-02-14 11:15 bob@company.com viewed research-agent constitution
  2026-02-14 14:00 alice@company.com deployed content-agent v1.7
```

**Success Criteria:**
- 50+ enterprise teams using TasteKit
- Average team size: 3-5 agents
- Workflow automation saves 10+ hours/week per team

---

### Phase 5: Ecosystem & Marketplace (v2.5 - v3.0) — *24-36 months*

**Focus**: Community-driven platform with monetization

#### Core Feature: Domain & Skills Marketplace

**1. Domain Marketplace**

```bash
# Browse domains
tastekit marketplace search domains
  
  Featured Domains:
  ┌─────────────────────────────────────────────────────┐
  │ 🎯 Sales Agent (SaaS)                               │
  │    by @salesexpert · 2,341 installs · ⭐ 4.8       │
  │    Specialized for B2B SaaS sales with proven       │
  │    playbooks from 500+ successful sales teams       │
  │    Price: $29/mo                                    │
  └─────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────┐
  │ 📝 Content Agent (E-commerce)                       │
  │    by @ecomexpert · 1,892 installs · ⭐ 4.9        │
  │    Product descriptions, email campaigns, social    │
  │    Free                                             │
  └─────────────────────────────────────────────────────┘

# Install domain
tastekit marketplace install domain/sales-agent-saas \
  --author @salesexpert \
  --version 2.1.0
  
  ✓ Downloaded domain package
  ✓ Verified signature
  ✓ Installed 15 skills
  ✓ Added 3 playbooks
  ✓ Ready to use: tastekit init --domain sales-agent-saas

# Publish your own domain
tastekit marketplace publish ./my-custom-domain \
  --category "E-commerce" \
  --price free \
  --license MIT
  
  ✓ Validated domain structure
  ✓ Ran quality checks
  ✓ Published to marketplace
  ✓ Live at: tastekit.dev/domains/my-custom-domain
```

**2. Skills Library**

```bash
# Browse skills
tastekit skills search --domain content-agent
  
  Top Skills for Content Agent:
  - viral-thread-generator (by @threadmaster, 5.2k installs)
  - fact-checker (by @journo, 3.8k installs)
  - seo-optimizer (by @seoexpert, 2.1k installs)

# Install skill
tastekit skills install viral-thread-generator \
  --author @threadmaster \
  --trust-level verified
  
  ✓ Installed viral-thread-generator v3.2.0
  ✓ Added to content-agent skills
  ✓ MCP tools: twitter-api, openai-api
  ✓ Trust level: verified (signed by TasteKit)

# Publish skill
tastekit skills publish ./my-skill \
  --domains "content-agent,marketing-agent" \
  --price $5 \
  --revenue-share 70/30
```

**3. Adapter Ecosystem**

```bash
# Community adapters for new runtimes
tastekit marketplace search adapters
  
  Available Adapters:
  - cursor (by @cursor-team, official)
  - replit-agent (by @replit, official)
  - langchain (by @langchain-community, verified)
  - crewai (by @crewai-community, verified)

# Install adapter
tastekit marketplace install adapter/cursor
  ✓ Installed Cursor adapter v1.0.0
  ✓ Export command: tastekit export --target cursor
```

**4. Marketplace Features**

**For Creators:**
- Revenue dashboard
- Usage analytics
- User reviews and ratings
- Version management
- Automated testing

**For Users:**
- Search and discovery
- Reviews and ratings
- Version history
- Security badges (verified, signed, audited)
- Trial periods for paid content

**5. Monetization Structure**

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Core domains, basic skills, community support |
| **Pro** | $19/mo | Advanced analytics, A/B testing, cloud sync |
| **Team** | $49/user/mo | Multi-agent orchestration, shared memory, RBAC |
| **Enterprise** | Custom | On-premise, custom domains, SLA, dedicated support |

**Marketplace Revenue Share:**
- 70% to creator
- 30% to TasteKit
- Verified creators get 75/25 split

**Success Criteria:**
- 1,000+ domains in marketplace
- 10,000+ skills available
- $100k+ monthly marketplace revenue
- 100+ paid creators

---

### Phase 6: Intelligence Layer (v3.0+) — *36+ months*

**Focus**: Meta-learning and collective intelligence

#### Core Feature: Cross-Agent Learning

**1. Anonymous Learning Pool**

```bash
# Opt-in to learning pool
tastekit learning opt-in \
  --share performance \
  --share drift-patterns \
  --privacy anonymous

# TasteKit analyzes patterns across thousands of agents
# Discovers insights like:
# - "Content agents using tone X + platform Y get 2.3x engagement"
# - "Research agents with skill Z complete tasks 40% faster"
# - "Sales agents who consolidate memory weekly close 15% more deals"
```

**2. Personalized Recommendations**

```bash
tastekit recommend
  
  Based on 1,247 similar Content Agents:
  
  ✨ Add skill: fact-checker
     Impact: +18% credibility score
     Used by: 892 similar agents
     Cost: Free
  
  📊 Enable weekly memory consolidation
     Impact: +12% consistency score
     Used by: 1,104 similar agents
  
  🎯 Adjust tone: slightly more casual
     Impact: +8% engagement
     Based on: A/B tests from 234 agents
```

**3. Predictive Drift**

```bash
tastekit drift predict
  
  ⚠️  Predicted Drift (next 30 days):
  
  Your working memory shows increasing focus on "AI safety"
  
  Prediction: This will become a core topic
  Confidence: 87%
  
  Recommendation: Add "AI Safety" to content strategy now
  
  Evidence:
  - 15 mentions in last 30 days (vs. 3 average)
  - Engagement +35% on AI safety posts
  - Similar agents who ignored this drift saw -15% engagement
  
  [Accept Now] [Remind Me in 7 Days] [Ignore]
```

**4. Auto-Generated Domains**

```bash
tastekit domain generate \
  --based-on "I need an agent for podcast production"
  
  🤖 Generating custom domain...
  
  ✓ Analyzed 47 similar use cases
  ✓ Identified 23 relevant skills
  ✓ Created onboarding flow (18 questions)
  ✓ Generated 5 playbooks
  ✓ Added best practices from 12 podcast agents
  
  Domain: Podcast Production Agent
  
  Onboarding includes:
  - Show format and style
  - Target audience
  - Episode frequency
  - Guest management
  - Post-production workflow
  
  Skills included:
  - research-guests
  - generate-questions
  - create-show-notes
  - edit-transcript
  - distribute-to-platforms
  
  [Preview] [Customize] [Use As-Is]
```

**5. Federated Learning**

**Privacy-Preserving Architecture:**

```
┌─────────────────────────────────────┐
│  Your Agent (Local)                 │
│  - Full data stays private          │
│  - Only aggregated insights shared  │
└─────────────────────────────────────┘
           ↓ (encrypted gradients)
┌─────────────────────────────────────┐
│  TasteKit Learning Server           │
│  - Aggregates insights from 1000s   │
│  - No access to individual data     │
│  - Returns collective intelligence  │
└─────────────────────────────────────┘
           ↓ (recommendations)
┌─────────────────────────────────────┐
│  Your Agent (Local)                 │
│  - Receives recommendations         │
│  - Decides what to apply            │
└─────────────────────────────────────┘
```

**Success Criteria:**
- 10,000+ agents in learning pool
- Recommendations increase performance by 25%+ on average
- 95%+ user trust in privacy preservation
- Predictive drift accuracy > 80%

---

## Technical Innovations

### 1. Semantic Versioning for Taste

```
v1.0.0 → Initial onboarding (major)
v1.1.0 → Added new platform: TikTok (minor)
v1.1.1 → Tweaked tone slightly (patch)
v2.0.0 → Major rebrand (breaking change)
```

**Version Compatibility:**
- Patch versions: Always compatible
- Minor versions: Forward compatible
- Major versions: May require migration

### 2. Taste Diff Visualization

```bash
tastekit diff v1.0.0 v2.0.0 --visual
```

Opens web UI showing:
- **What changed**: Red/green diff of artifacts
- **Why it changed**: Drift proposals that led to it
- **Impact**: Performance before/after with charts
- **Timeline**: When each change was made

### 3. Taste Templates

```bash
# Pre-configured templates for common use cases
tastekit init --template saas-founder-twitter
tastekit init --template ecommerce-content
tastekit init --template b2b-sales
tastekit init --template customer-support

# Templates include:
# - Proven onboarding answers
# - Best-practice skills
# - Working playbooks
# - Performance benchmarks
```

### 4. Natural Language Drift Proposals

Instead of technical YAML diffs:

```
TasteKit noticed:

"You've been posting more about AI safety lately (15 times in 
the last month vs. your usual 3). This topic is getting 35% 
higher engagement than your average posts.

Should I update your content strategy to include 'AI safety' 
as a core topic? This would affect about 15% of your future 
content suggestions."

[Yes, add it] [No, keep as-is] [Show me examples first]
```

### 5. Skill Composition

```bash
# Compose complex skills from simpler ones
tastekit skills compose viral-content \
  --from research-trends,generate-post-options,optimize-for-engagement \
  --name viral-content-pipeline
  
# Creates a new skill that chains the three together
```

### 6. Artifact Compression

```bash
# Compress artifacts for faster loading
tastekit artifacts compress
  
  Before: 2.3 MB (constitution + skills + memory)
  After:  0.4 MB (87% reduction)
  
  Compression strategy:
  - Deduplicate common patterns
  - Compress JSONL traces
  - Lazy-load skill details
```

### 7. Offline-First Architecture

```bash
# All operations work offline
tastekit compile --offline
tastekit drift detect --offline
tastekit export --offline

# Sync when online
tastekit sync
  ✓ Pushed local changes
  ✓ Pulled remote updates
  ✓ Resolved conflicts
```

---

## Business Model

### Revenue Streams

**1. Freemium SaaS**
- Free: Core features, local-only
- Pro ($19/mo): Analytics, A/B testing, cloud sync
- Team ($49/user/mo): Multi-agent, shared memory, RBAC
- Enterprise (custom): On-premise, SLA, dedicated support

**2. Marketplace Revenue Share**
- 70/30 split on paid domains/skills
- 75/25 for verified creators
- Transaction fees on marketplace

**3. Enterprise Services**
- Custom domain development
- Training and onboarding
- Consulting and integration
- Priority support contracts

**4. API Access**
- TasteKit Cloud API for programmatic access
- Usage-based pricing for high-volume users
- White-label options for platforms

### Financial Projections (Rough)

**Year 1 (v0.5 - v1.0):**
- Revenue: $0 (open source, community building)
- Users: 1,000
- Focus: Product-market fit

**Year 2 (v1.0 - v2.0):**
- Revenue: $100k (early Pro subscriptions)
- Users: 10,000
- Focus: Memory intelligence + analytics

**Year 3 (v2.0 - v3.0):**
- Revenue: $1M (Pro + Team + Marketplace)
- Users: 50,000
- Focus: Teams + marketplace launch

**Year 4 (v3.0+):**
- Revenue: $5M+ (Full ecosystem)
- Users: 200,000+
- Focus: Intelligence layer + enterprise

---

## Success Metrics

### Product Metrics

**Adoption:**
- GitHub stars
- Weekly active users
- Agent creations per week
- Domain diversity (how many domains are used)

**Engagement:**
- Onboarding completion rate
- Skills installed per agent
- Drift proposals accepted/rejected ratio
- Export frequency (to different runtimes)

**Quality:**
- Agent performance improvement over time
- User satisfaction (NPS)
- Community contributions (PRs, domains, skills)
- Bug reports and resolution time

### Business Metrics

**Revenue:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Marketplace GMV (Gross Merchandise Value)
- Customer acquisition cost (CAC)
- Lifetime value (LTV)

**Growth:**
- User growth rate
- Conversion rate (free → paid)
- Churn rate
- Expansion revenue (upsells)

### Community Metrics

**Contribution:**
- Community-contributed domains
- Community-contributed skills
- Pull requests merged
- Active contributors

**Ecosystem:**
- Third-party adapters
- Integration partnerships
- Content created (tutorials, videos)
- Conference talks and mentions

---

## Implementation Priorities

### Immediate (Next 3 Months)

**1. Harden MCP Client Implementation**
- Expand protocol compatibility coverage
- Support stdio and HTTP transports across more server shapes
- Test with real MCP servers

**2. Production Hardening**
- Error handling and recovery
- Input validation and sanitization
- Performance optimization
- Security audit

**3. Documentation**
- Complete API reference
- Tutorial videos
- Example projects
- Migration guides

**4. Community Building**
- Launch website (already built)
- Create Discord/Slack community
- Write launch blog post
- Submit to Product Hunt, Hacker News

### Short-Term (3-6 Months)

**1. Tiered Memory System (Phase 2)**
- Implement Constitution/Preferences/Working Memory layers
- Build drift proposal system
- Create memory consolidation workflow
- Add natural language explanations

**2. First Community Domains**
- Work with 3-5 domain experts
- Create Research Agent domain
- Create Sales Agent domain
- Document domain creation process

**3. Adapter Completion**
- Finish OpenClaw adapter
- Finish Autopilots adapter
- Test with real runtimes
- Document adapter API

### Medium-Term (6-12 Months)

**1. Performance Tracking (Phase 3)**
- Metrics configuration system
- Integration with common APIs (Twitter, Stripe, etc.)
- Analytics dashboard
- A/B testing framework

**2. First Paid Features**
- Launch Pro tier
- Cloud sync implementation
- Advanced analytics
- Priority support

**3. Enterprise Features**
- Team workspaces
- Shared memory pools
- RBAC implementation
- Audit logging

### Long-Term (12+ Months)

**1. Marketplace Launch (Phase 5)**
- Domain marketplace
- Skills library
- Payment processing
- Creator dashboard

**2. Intelligence Layer (Phase 6)**
- Cross-agent learning
- Predictive drift
- Auto-generated domains
- Federated learning

**3. Platform Partnerships**
- Integrate with major agent platforms
- Official adapters for popular tools
- White-label options
- API partnerships

---

## Key Decisions to Make

### Technical

1. **MCP Client**: Build from scratch or fork existing implementation?
2. **Cloud Sync**: Which backend? (Supabase, Firebase, custom?)
3. **Analytics**: Self-hosted or use service? (PostHog, Mixpanel?)
4. **Marketplace**: Build or use existing? (Gumroad integration?)

### Product

1. **Pricing**: When to introduce paid tiers?
2. **Open Source**: Which parts stay open, which go closed?
3. **Enterprise**: Build enterprise features early or wait for demand?
4. **Mobile**: Native apps or web-only?

### Business

1. **Funding**: Bootstrap or raise venture capital?
2. **Team**: Solo founder or build team early?
3. **Go-to-Market**: Developer-first or end-user-first?
4. **Partnerships**: Which platforms to partner with first?

---

## Risk Mitigation

### Technical Risks

**Risk**: MCP protocol changes break compatibility  
**Mitigation**: Version pinning, adapter abstraction layer

**Risk**: Performance degrades with large memory  
**Mitigation**: Compression, lazy loading, pagination

**Risk**: Security vulnerabilities in Skills  
**Mitigation**: Sandboxing, code review, trust levels

### Market Risks

**Risk**: Major platform (OpenAI, Anthropic) builds this natively  
**Mitigation**: Focus on portability and open source moat

**Risk**: Low adoption due to complexity  
**Mitigation**: Templates, tutorials, onboarding UX

**Risk**: Community doesn't contribute domains  
**Mitigation**: Incentives, revenue share, recognition

### Business Risks

**Risk**: Can't monetize open source project  
**Mitigation**: Freemium model, marketplace, enterprise

**Risk**: High churn rate  
**Mitigation**: Continuous value delivery, lock-in via data

**Risk**: Competitors copy features  
**Mitigation**: Network effects, data moat, brand

---

## Resources & References

### Inspiration

- **Git** - Version control for code → TasteKit is version control for agents
- **Docker** - Portable containers → TasteKit is portable taste profiles
- **Terraform** - Infrastructure as code → TasteKit is taste as code

### Related Projects

- **Model Context Protocol (MCP)** - Tool integration standard
- **AAIF** - Agent-Aware Interface Format
- **Langchain** - Agent framework
- **AutoGPT** - Autonomous agents

### Research Papers

- "Memory Systems in AI Agents" (hypothetical)
- "Drift Detection in Production ML Systems"
- "Federated Learning for Privacy-Preserving AI"

### Community

- GitHub: github.com/philipbankier/tastekit
- Discord: discord.gg/tastekit
- Twitter: @tastekit_dev
- Website: tastekit.dev

---

## Conclusion

TasteKit is positioned to become the **infrastructure layer for the agent economy**. By focusing on portability, version control, and community-driven specialization, it solves problems that no other platform addresses.

The key to success is:

1. **Start narrow** - Content Agent is the wedge
2. **Build community** - Domain experts create value
3. **Stay open** - Open source creates moat
4. **Add intelligence** - Data becomes defensible asset
5. **Enable ecosystem** - Marketplace creates network effects

The vision is ambitious but achievable. Each phase builds on the previous, creating compounding value. The market is ready—agents are everywhere but lack memory and identity. TasteKit provides both.

**The future of AI agents is not generic chatbots. It's specialized, versioned, portable agents with persistent taste. That future is TasteKit.**

---

*This document should be updated as the project evolves. Treat it as a living document that captures the current state and future vision of TasteKit.*
