# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

The TasteKit team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@tastekit.dev**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

After you submit a report, we will:

1. Confirm receipt of your vulnerability report
2. Investigate and validate the issue
3. Determine the severity and impact
4. Work on a fix and coordinate disclosure timing with you
5. Release a security advisory and patched version
6. Publicly acknowledge your responsible disclosure (if you wish)

## Security Best Practices for Users

When using TasteKit, follow these security best practices:

### Trust Pinning

Always pin MCP servers and skill sources to prevent unauthorized changes:

```bash
tastekit trust pin-mcp <server_name>
tastekit trust pin-skill-source <path_or_url>
```

### Regular Audits

Run trust audits regularly to detect any changes:

```bash
tastekit trust audit
```

### Review Guardrails

Before binding MCP tools, review the automatically generated guardrails:

```bash
tastekit mcp bind --interactive
# Review .tastekit/guardrails.v1.yaml
```

### Trace Analysis

Monitor trace files for suspicious activity:

```bash
# Check recent traces
ls -lt .tastekit/traces/
# Analyze for errors or violations
tastekit drift detect
```

### Skill Source Verification

Only use skills from trusted sources. When using community skills:

1. Review the SKILL.md file thoroughly
2. Check for any suspicious scripts or resources
3. Pin the source after verification
4. Run `tastekit skills lint` to validate structure

## Known Security Considerations

### MCP Server Trust

TasteKit relies on the security of connected MCP servers. A malicious MCP server could:

- Provide false tool metadata
- Execute harmful operations when tools are called
- Exfiltrate data through tool parameters

**Mitigation**: Use trust pinning and only connect to servers you control or trust.

### Skill Packs

Malicious skill packs could contain:

- Scripts that execute harmful commands
- Prompts designed to manipulate agent behavior
- Resource files with embedded exploits

**Mitigation**: Review all skills before use and pin trusted sources.

### Prompt Injection

Retrieved content or user input could contain prompts designed to override agent instructions.

**Mitigation**: TasteKit uses structured artifacts and clear separation of instructions from data. Always validate external content.

### Secrets in Artifacts

Artifacts should never contain secrets directly.

**Mitigation**: TasteKit schemas enforce references only (env var names, secret IDs). Never commit `.tastekit/` directories with sensitive data.

## Security Features

TasteKit includes several built-in security features:

- **Trust Pinning**: Cryptographic fingerprints for servers and sources
- **No Auto-Enable**: New tools never enabled automatically
- **Automated Guardrails**: Generated from MCP metadata
- **Approval Workflows**: Configurable based on risk and autonomy
- **Audit Trail**: Complete trace of all operations
- **Schema Validation**: Runtime validation of all artifacts

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release patches as soon as possible

We aim to disclose vulnerabilities within 90 days of the initial report, or sooner if a fix is available.
