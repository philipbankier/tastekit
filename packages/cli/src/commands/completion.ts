/**
 * Shell completion command.
 *
 * Generates shell completion scripts for bash, zsh, and fish.
 * Usage: eval "$(tastekit completion bash)"
 */

import { Command } from 'commander';

const COMMANDS = [
  'init', 'onboard', 'compile', 'simulate',
  'mcp', 'trust', 'skills', 'drift',
  'eval', 'export', 'import', 'completion',
];

const SUBCOMMANDS: Record<string, string[]> = {
  mcp: ['add', 'list', 'inspect', 'bind'],
  trust: ['init', 'pin-mcp', 'pin-skill-source', 'audit'],
  skills: ['list', 'lint', 'pack'],
  drift: ['detect', 'apply', 'memory-consolidate'],
  eval: ['run', 'replay'],
};

const GLOBAL_OPTIONS = ['--json', '--verbose', '--help', '--version'];

const EXPORT_TARGETS = ['claude-code', 'manus', 'openclaw', 'autopilots', 'agents-md', 'agent-file'];
const IMPORT_TARGETS = ['claude-code', 'manus', 'openclaw', 'autopilots', 'soul-md', 'agent-file'];
const DEPTHS = ['quick', 'guided', 'operator'];

function bashCompletion(): string {
  const subCommandCases = Object.entries(SUBCOMMANDS)
    .map(([cmd, subs]) => `      ${cmd}) COMPREPLY=($(compgen -W "${subs.join(' ')}" -- "$cur")) ;;`)
    .join('\n');

  return `# tastekit bash completion
# eval "$(tastekit completion bash)"

_tastekit_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="${COMMANDS.join(' ')}"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "$commands ${GLOBAL_OPTIONS.join(' ')}" -- "$cur"))
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
${subCommandCases}
      export)
        if [[ "$prev" == "--target" ]]; then
          COMPREPLY=($(compgen -W "${EXPORT_TARGETS.join(' ')}" -- "$cur"))
        else
          COMPREPLY=($(compgen -W "--target --out" -- "$cur"))
        fi
        ;;
      import)
        if [[ "$prev" == "--target" ]]; then
          COMPREPLY=($(compgen -W "${IMPORT_TARGETS.join(' ')}" -- "$cur"))
        else
          COMPREPLY=($(compgen -W "--target --source" -- "$cur"))
        fi
        ;;
      init)
        if [[ "$prev" == "--depth" ]]; then
          COMPREPLY=($(compgen -W "${DEPTHS.join(' ')}" -- "$cur"))
        else
          COMPREPLY=($(compgen -W "--domain --depth" -- "$cur"))
        fi
        ;;
      onboard)
        if [[ "$prev" == "--depth" ]]; then
          COMPREPLY=($(compgen -W "${DEPTHS.join(' ')}" -- "$cur"))
        else
          COMPREPLY=($(compgen -W "--depth --resume --provider" -- "$cur"))
        fi
        ;;
  esac
}

complete -F _tastekit_completions tastekit
`;
}

function zshCompletion(): string {
  const subcmdLines = Object.entries(SUBCOMMANDS)
    .map(([cmd, subs]) => {
      const items = subs.map(s => `'${s}:${s} subcommand'`).join(' ');
      return `    ${cmd}) _values 'subcommand' ${items} ;;`;
    })
    .join('\n');

  return `#compdef tastekit
# tastekit zsh completion
# eval "$(tastekit completion zsh)"

_tastekit() {
  local -a commands
  commands=(
    'init:Initialize a new TasteKit workspace'
    'onboard:Run the LLM-driven onboarding interview'
    'compile:Compile taste artifacts'
    'simulate:Run simulation with dry-run mode'
    'mcp:Manage MCP server bindings'
    'trust:Manage trust and provenance'
    'skills:Manage skills library'
    'drift:Manage drift detection and memory'
    'eval:Run evaluations'
    'export:Export to runtime adapter format'
    'import:Import from runtime format'
    'completion:Generate shell completions'
  )

  _arguments -C \\
    '--json[Output in JSON format]' \\
    '--verbose[Enable verbose logging]' \\
    '1:command:->command' \\
    '*::arg:->args'

  case $state in
    command)
      _describe -t commands 'tastekit command' commands
      ;;
    args)
      case \${words[1]} in
${subcmdLines}
        export) _arguments '--target[Target adapter]:target:(${EXPORT_TARGETS.join(' ')})' '--out[Output directory]:directory:_directories' ;;
        import) _arguments '--target[Source format]:target:(${IMPORT_TARGETS.join(' ')})' '--source[Source path]:path:_files' ;;
        init) _arguments '--domain[Domain ID]:domain:' '--depth[Onboarding depth]:depth:(${DEPTHS.join(' ')})' ;;
        onboard) _arguments '--depth[Override depth]:depth:(${DEPTHS.join(' ')})' '--resume[Resume session]' '--provider[LLM provider]:provider:(anthropic openai ollama)' ;;
      esac
      ;;
  esac
}

_tastekit "$@"
`;
}

function fishCompletion(): string {
  const lines = [
    '# tastekit fish completion',
    '# tastekit completion fish | source',
    '',
    '# Disable file completion by default',
    'complete -c tastekit -f',
    '',
    '# Commands',
  ];

  const cmdDescs: Record<string, string> = {
    init: 'Initialize a new TasteKit workspace',
    onboard: 'Run the LLM-driven onboarding interview',
    compile: 'Compile taste artifacts',
    simulate: 'Run simulation with dry-run mode',
    mcp: 'Manage MCP server bindings',
    trust: 'Manage trust and provenance',
    skills: 'Manage skills library',
    drift: 'Manage drift detection and memory',
    eval: 'Run evaluations',
    export: 'Export to runtime adapter format',
    import: 'Import from runtime format',
    completion: 'Generate shell completions',
  };

  for (const [cmd, desc] of Object.entries(cmdDescs)) {
    lines.push(`complete -c tastekit -n '__fish_use_subcommand' -a ${cmd} -d '${desc}'`);
  }

  lines.push('');
  lines.push('# Subcommands');
  for (const [cmd, subs] of Object.entries(SUBCOMMANDS)) {
    for (const sub of subs) {
      lines.push(`complete -c tastekit -n '__fish_seen_subcommand_from ${cmd}' -a ${sub}`);
    }
  }

  lines.push('');
  lines.push('# Global options');
  lines.push("complete -c tastekit -l json -d 'Output in JSON format'");
  lines.push("complete -c tastekit -l verbose -d 'Enable verbose logging'");

  return lines.join('\n') + '\n';
}

export const completionCommand = new Command('completion')
  .description('Generate shell completion script')
  .argument('[shell]', 'Shell type: bash, zsh, or fish', 'bash')
  .action((shell: string) => {
    switch (shell) {
      case 'bash':
        process.stdout.write(bashCompletion());
        break;
      case 'zsh':
        process.stdout.write(zshCompletion());
        break;
      case 'fish':
        process.stdout.write(fishCompletion());
        break;
      default:
        console.error(`Unknown shell: ${shell}. Use bash, zsh, or fish.`);
        process.exit(1);
    }
  });
