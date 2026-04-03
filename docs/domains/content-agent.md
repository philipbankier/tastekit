# Content Agent Domain

The Content Agent domain is a comprehensive, production-ready solution for building AI agents that create and manage social media content, brand presence, and audience engagement.

## Overview

The Content Agent domain was designed based on real-world requirements from successful AI content creators, including analysis of autonomous agents that have achieved millions of views on platforms like TikTok. It provides deep specialization for content creation workflows, from simple "give me 3 tweet options" tasks to fully autonomous content campaigns.

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

The Content Agent domain includes a growing library of specialized skills:

#### research-trends
Analyzes what content is currently performing well in your niche or on your target platform. Uses web search to identify trending topics, winning formats, and effective hooks.

**When to use:** Before planning a content calendar, when needing fresh ideas, or when performance is declining.

**Inputs:** Niche, platform, timeframe  
**Outputs:** Trending topics, winning formats, example posts, actionable insights

#### generate-post-options
Creates multiple distinct variations of a social media post based on a topic, allowing you to choose the best option.

**When to use:** Quick content creation for immediate posting, A/B testing different approaches.

**Inputs:** Topic, platform, tone, number of options  
**Outputs:** 3-5 post variations with different hook styles and rationales

#### Coming Soon
- `generate-hooks`: Create attention-grabbing opening lines
- `write-thread`: Compose multi-tweet threads or LinkedIn carousels
- `write-long-form`: Draft blog posts or LinkedIn articles
- `create-content-calendar`: Plan posts over time
- `analyze-performance`: Review metrics and suggest improvements
- `adapt-for-platform`: Reformat content for different social media
- `generate-image-prompt`: Create prompts for image generation tools

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
- Skills: research-trends, generate-post-options, write-thread

The agent researches trending topics in the startup/tech space, proposes tweet ideas with bold takes, and generates thread options for deeper dives on LinkedIn.

### Business Account (SaaS Product)

A software product called "Autopilot" needs consistent brand presence on Twitter and LinkedIn. The Content Agent is configured with:
- Brand archetype: Professional + Technical
- Primary platform: LinkedIn
- Workflow mode: Autopilot
- Skills: Full suite including content calendar and scheduling

The agent autonomously creates a weekly content calendar, drafts product updates, generates educational content, and schedules posts. The founder reviews and approves before publishing.

### AI Influencer

An autonomous AI persona creating TikTok content. The Content Agent is configured with:
- Brand archetype: Humorous + Casual
- Primary platform: TikTok
- Workflow mode: Autopilot
- Skills: research-trends, generate-hooks, analyze-performance

The agent researches winning TikTok formats, generates video scripts with trending hooks, creates image slideshows, and learns from performance data to improve over time.

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
