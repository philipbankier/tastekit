# Content Agent Domain

The Content Agent domain is a first-class domain for building AI agents that create, adapt, and review written content while preserving voice, audience fit, and evidence discipline.

## Overview

The Content Agent domain covers launch posts, founder updates, README-to-social adaptation, editorial review, campaign drafts, and newsletter-style workflows. It is part of the six-domain release surface alongside general, development, research, sales, and support.

## What You Get

When you choose the Content Agent domain during `tastekit init`, you receive:

### Specialized Onboarding

The onboarding process includes over 20 domain-specific questions organized into six sections:

**Brand Identity**
- Brand type (personal, business, AI influencer)
- Brand name and archetypes
- Voice adjectives and example posts
- Forbidden topics and phrases

**Target Platforms**
- Platform selection (Twitter, LinkedIn, TikTok, Instagram, YouTube, Facebook, Blog, Newsletter)
- Primary platform focus
- Posting frequency

**Content Strategy**
- Content types (short-form, long-form, images, videos, threads, stories)
- Primary goals (traffic, engagement, leads, thought leadership, promotion, entertainment)
- Target audience description

**Workflow Preferences**
- Workflow mode (Simple, Assisted, Autopilot)
- Research autonomy settings
- Approval requirements

**Tools and Integrations**
- Image generation access
- Social media scheduler integration
- Tool-specific configuration

**Performance and Learning**
- Success metrics (views, engagement, followers, CTR, conversions, watch time)
- Performance-based learning preferences

### Pre-Built Skills

The Content Agent domain includes specialized skills:

#### content-voice-brief
Turns taste preferences and source material into an editorial brief that captures audience, voice, claim boundaries, and channel expectations.

**When to use:** Before drafting, adapting, or reviewing content where voice and evidence discipline matter.

**Inputs:** Source material, audience, channel, objective
**Outputs:** Voice brief, claim boundaries, content angle, review checklist

#### content-draft-options
Drafts multiple content options from the brief while enforcing voice, channel fit, and unsupported-claim rules.

**When to use:** When you need several publishable directions or want to compare tone and framing.

**Inputs:** Editorial brief, source material, target channel, number of options
**Outputs:** Draft variants with rationale and review notes

### Workflow Modes

The Content Agent supports three distinct workflow modes based on your preferences:

**Simple Mode**
You provide a topic, the agent generates 3 options, you choose one. Perfect for quick, hands-on content creation.

**Assisted Mode**
The agent researches trends, proposes ideas, and you approve and refine. Collaborative approach with agent doing the heavy lifting.

**Autopilot Mode**
The agent ideates, plans, creates, and schedules autonomously. You review before posting. Maximum automation with human oversight.

## Supported Platforms

The Content Agent has built-in understanding of platform-specific constraints and best practices:

| Platform | Content Types | Key Features |
| :--- | :--- | :--- |
| **Twitter** | Short-form text, threads, images | Character limits, thread formatting, hashtag strategy |
| **LinkedIn** | Long-form articles, carousels, videos | Professional tone, thought leadership, engagement hooks |
| **TikTok** | Short-form videos, image slideshows | Trending audio, hooks, captions, hashtags |
| **Instagram** | Images, carousels, stories, reels | Visual-first, caption style, hashtag strategy |
| **YouTube** | Long-form videos, shorts | Titles, descriptions, thumbnails, tags |
| **Facebook** | Mixed content, groups | Community engagement, link sharing |
| **Blog** | Long-form articles | SEO, structure, internal linking |
| **Newsletter** | Email content | Subject lines, formatting, CTAs |

## Brand Archetypes

The Content Agent uses brand archetypes to guide tone and style:

- **Professional**: Corporate, formal, authoritative
- **Casual**: Friendly, approachable, conversational
- **Edgy**: Bold, provocative, boundary-pushing
- **Humorous**: Funny, entertaining, lighthearted
- **Educational**: Teaching, informative, helpful
- **Inspirational**: Motivational, uplifting, aspirational
- **Technical**: Expert, detailed, precise

You can select multiple archetypes to create a nuanced brand voice.

## Recommended Tool Integrations

The Content Agent works best with the following MCP tool integrations:

- **Image Generation**: DALL-E, Midjourney, Stable Diffusion for creating visuals
- **Social Media Scheduler**: Postiz, Buffer, Hootsuite for automated posting
- **Web Search**: For trend research and competitive analysis
- **Analytics APIs**: Platform-specific metrics for performance tracking
- **File System**: For managing content assets and media files

## Example Use Cases

### Personal Brand (Founder)

A young founder in Washington DC wants a "brash, edgy" personal brand on Twitter and LinkedIn. The Content Agent is configured with:
- Brand archetype: Edgy + Professional
- Primary platform: Twitter
- Workflow mode: Assisted
- Skills: content-voice-brief, content-draft-options

The agent turns source notes into a voice brief, proposes tweet or LinkedIn options with clear claim boundaries, and highlights where human approval is needed.

### Business Account (SaaS Product)

A software product called "Autopilot" needs consistent brand presence on Twitter and LinkedIn. The Content Agent is configured with:
- Brand archetype: Professional + Technical
- Primary platform: LinkedIn
- Workflow mode: Autopilot
- Skills: content-voice-brief, content-draft-options

The agent drafts product updates and educational content from approved source material. The founder reviews before publishing.

### AI Influencer

An autonomous AI persona creating TikTok content. The Content Agent is configured with:
- Brand archetype: Humorous + Casual
- Primary platform: TikTok
- Workflow mode: Autopilot
- Skills: content-voice-brief, content-draft-options

The agent adapts source material into platform-specific scripts and captions while preserving the defined persona and escalation boundaries.

## Getting Started

To create a Content Agent:

```bash
# Initialize with Content Agent domain
tastekit init
? What type of agent are you building? Content Agent

# Run specialized onboarding
tastekit onboard --depth guided

# Compile artifacts
tastekit compile

# Add MCP tools (image generation, scheduler, etc.)
tastekit mcp add <tool-url>
tastekit mcp bind --interactive

# Use skills
tastekit skills list
# Run a skill manually or via playbook
```

Your Content Agent is now ready to create content that matches your brand voice and strategy.
