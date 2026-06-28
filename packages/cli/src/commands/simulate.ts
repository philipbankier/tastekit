import { Command } from 'commander';
import chalk from 'chalk';

export const simulateCommand = new Command('simulate')
  .description('Dry-run a skill or playbook against your taste profile (planned for a future pre-1.0 release)')
  .option('--skill <id>', 'Skill to simulate')
  .option('--playbook <id>', 'Playbook to simulate')
  .option('--no-side-effects', 'Disable side effects')
  .action(async () => {
    console.log(
      chalk.cyan('Simulation is planned for a future TasteKit pre-1.0 release.') + '\n\n' +
      'This feature will let you dry-run skills and playbooks against your\n' +
      'taste profile to preview outputs without side effects.\n\n' +
      chalk.dim('Track progress: https://github.com/philipbankier/tastekit/issues')
    );
  });
