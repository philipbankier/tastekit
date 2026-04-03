# TasteKit Roadmap

This document outlines the planned development trajectory for TasteKit beyond the v1.0 release.

## Current Status: v1.0 (Released)

The v1.0 release establishes the foundational architecture with all core modules implemented. The system is functional and ready for community contributions, with the MCP client implemented as a well-structured interface stub.

## Current Focus: Test Foundation Wave 0 (In Progress)

Before new feature expansion, TasteKit is hardening reliability with:
- deterministic PR gating under ~10 minutes
- command-surface integration coverage for all CLI commands/subcommands
- v1/v2 layout compatibility regression checks
- adapter compatibility tests across runtime targets
- pre-release-only live Ollama smoke validation

## Short-term Goals (v1.1 - v1.3)

### v1.1: MCP Protocol Implementation

**Goal**: Replace the MCP client stub with a full protocol implementation.

**Key Features**:
- Complete JSON-RPC 2.0 message protocol implementation
- Stdio transport layer for local MCP servers
- HTTP/SSE transport layer for remote MCP servers
- Connection lifecycle management (initialize, capabilities, shutdown)
- Server capability discovery and version negotiation
- Comprehensive error handling and retry logic
- Reference MCP server implementation for testing

**Community Contribution Opportunities**:
- Implement additional transport layers (WebSocket)
- Create example MCP servers for common use cases
- Build MCP server testing utilities

### v1.2: Testing and Quality

**Goal**: Achieve comprehensive test coverage and production-grade reliability.

**Key Features**:
- Unit tests for all core modules (target: 80%+ coverage)
- Integration tests for CLI commands
- End-to-end tests with real MCP servers
- Performance benchmarks for compilation and tracing
- Fuzzing tests for artifact validation
- CI/CD pipeline with automated testing and releases

**Community Contribution Opportunities**:
- Write test cases for edge cases
- Create test fixtures and mock data
- Build testing documentation and guides

### v1.3: Developer Experience

**Goal**: Make TasteKit easier to use and extend.

**Key Features**:
- Interactive TUI (Terminal UI) for onboarding
- Rich CLI output with better formatting and colors
- Artifact visualization tools (render constitution as diagram)
- Skills marketplace/registry concept
- VSCode extension for SKILL.md authoring
- Improved error messages with actionable suggestions
- Auto-completion for CLI commands

**Community Contribution Opportunities**:
- Design and build the VSCode extension
- Create skill templates for common patterns
- Improve documentation with video tutorials

## Medium-term Goals (v2.0)

### v2.0: Runtime Integration and Ecosystem

**Goal**: Deep integration with major agent runtimes and expansion of the adapter ecosystem.

**Key Features**:
- Native runtime integrations (not just export/import)
- Real-time drift detection during agent execution
- Live memory consolidation with runtime feedback
- Bidirectional sync between TasteKit and runtimes
- Skills hot-reloading in supported runtimes
- Web-based dashboard for monitoring and management
- Multi-user/team workspaces with shared artifacts

**New Adapters**:
- LangChain/LangGraph adapter
- AutoGPT adapter
- CrewAI adapter
- Custom runtime adapter SDK

**Community Contribution Opportunities**:
- Build adapters for additional runtimes
- Create runtime-specific skills
- Develop the web dashboard

## Long-term Vision (v3.0+)

### v3.0: AI-Native Features

**Goal**: Leverage AI to make taste management more intelligent and automated.

**Key Features**:
- AI-assisted onboarding (natural conversation instead of forms)
- Automatic drift proposal generation with LLM analysis
- Smart skill generation from task descriptions
- Intelligent guardrail suggestions based on tool usage patterns
- Anomaly detection in traces using ML
- Personalized skill recommendations
- Natural language querying of artifacts and traces

### v4.0: Enterprise and Scale

**Goal**: Support for enterprise deployments and large-scale agent operations.

**Key Features**:
- Multi-tenant architecture
- Role-based access control (RBAC)
- Audit logging and compliance features
- Centralized artifact management
- Policy enforcement across agent fleets
- Integration with enterprise identity providers
- Advanced analytics and reporting
- Cost tracking and optimization

## Research Areas

These are exploratory areas that may influence future versions:

### Formal Verification
- Mathematical proofs of artifact consistency
- Formal specification of taste profiles
- Automated verification of guardrail completeness

### Distributed Taste
- Federated learning for taste profiles
- Privacy-preserving taste sharing
- Collaborative taste refinement across organizations

### Taste Transfer Learning
- Learn from existing agent behaviors
- Extract taste profiles from logs/traces
- Cross-domain taste adaptation

## Community Priorities

The roadmap is flexible and responsive to community needs. We track community priorities through:

- GitHub issue voting (👍 reactions)
- Community surveys (quarterly)
- RFC discussions in `community/RFC/`
- Contributor feedback

## How to Influence the Roadmap

1. **Vote on Issues**: Add 👍 to issues you care about
2. **Submit RFCs**: Propose major changes in `community/RFC/`
3. **Join Discussions**: Participate in GitHub Discussions
4. **Contribute**: PRs are the strongest signal of what matters

## Release Cadence

- **Patch releases** (v1.0.x): As needed for bug fixes
- **Minor releases** (v1.x.0): Every 2-3 months
- **Major releases** (vX.0.0): Annually or when breaking changes are necessary

## Breaking Changes Policy

We take backward compatibility seriously. Breaking changes will:

- Only occur in major version releases
- Be clearly documented in CHANGELOG.md
- Include migration guides
- Be discussed in RFCs before implementation
- Provide deprecation warnings in advance when possible

---

**Last Updated**: 2026-02-13  
**Next Review**: 2026-05-13
