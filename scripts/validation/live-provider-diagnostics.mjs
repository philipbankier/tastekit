#!/usr/bin/env node
import { findEnvFileArg, loadEnvFile } from './lib/live-e2e/env-file.mjs';
import { createChatClient, preflightChatClient, redactSecrets } from './lib/live-e2e/chat-client.mjs';
import { parseArgs, resolveProviderKeys, usage } from './lib/live-e2e/options.mjs';

async function main(argv) {
  let options;
  let envFileLoad = { path: undefined, loaded: [], skipped: [] };
  const json = hasJsonFlag(argv);
  const harnessArgs = argv.filter(arg => arg !== '--json');
  try {
    const envFile = findEnvFileArg(harnessArgs);
    if (envFile) envFileLoad = loadEnvFile(envFile);
    options = parseArgs(harnessArgs);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error(usage());
    return 1;
  }

  if (options.help) {
    console.log([
      'Usage: node scripts/validation/live-provider-diagnostics.mjs [options]',
      '',
      'Runs independent provider reachability checks without starting a Full Taste Composition run.',
      'Accepts the same --env-file, --openai-base-url, --openai-model, --zai-base-url, --zai-model, and --zai-thinking options as the live harness.',
      'Add --json for machine-readable status output.',
    ].join('\n'));
    return 0;
  }

  const providerKeys = resolveProviderKeys(process.env, options);
  const secrets = [providerKeys.openaiKey, providerKeys.zaiKey].filter(Boolean);
  const results = [];
  const diagnostics = {
    ok: false,
    env_file: envFileLoad.path,
    env_loaded_keys: envFileLoad.loaded,
    env_skipped_keys: envFileLoad.skipped,
    providers: {},
  };

  if (!json) {
    console.log('TasteKit live provider diagnostics');
    console.log(`env_file: ${envFileLoad.path ?? 'none'}`);
    console.log(`env_loaded_keys: ${envFileLoad.loaded.length ? envFileLoad.loaded.join(',') : 'none'}`);
    console.log(`env_skipped_keys: ${envFileLoad.skipped.length ? envFileLoad.skipped.join(',') : 'none'}`);
  }

  results.push(await diagnoseProvider({
    label: 'openai',
    missingMessage: 'missing OPENAI_API_KEY',
    key: providerKeys.openaiKey,
    clientConfig: {
      name: 'openai-diagnostics',
      apiKey: providerKeys.openaiKey,
      baseUrl: options.openaiBaseUrl,
      model: options.openaiModel,
      systemRole: options.openaiSystemRole,
    },
    secrets,
    extra: providerKeys.openaiSource ? `source=${providerKeys.openaiSource}` : undefined,
    json,
  }));

  results.push(await diagnoseProvider({
    label: 'zai',
    missingMessage: 'missing ZAI_API_KEY or Z_AI_API_KEY',
    key: providerKeys.zaiKey,
    clientConfig: {
      name: 'zai-diagnostics',
      apiKey: providerKeys.zaiKey,
      baseUrl: options.zaiBaseUrl,
      model: options.zaiModel,
      thinking: options.zaiThinking,
    },
    secrets,
    extra: providerKeys.zaiSource ? `source=${providerKeys.zaiSource}` : undefined,
    json,
  }));

  for (const result of results) diagnostics.providers[result.label] = result;
  const hasFailure = results.some(result => result.status !== 'pass');
  diagnostics.ok = !hasFailure;
  const nextSteps = buildNextSteps(results, envFileLoad.path, options);
  if (nextSteps.length) diagnostics.next_steps = nextSteps;
  if (!json && nextSteps.length) {
    console.log('Next steps:');
    nextSteps.forEach((step, index) => console.log(`${index + 1}. ${step}`));
  }
  if (json) console.log(JSON.stringify(redactSecrets(diagnostics, secrets), null, 2));
  return hasFailure ? 1 : 0;
}

function hasJsonFlag(argv) {
  return argv.includes('--json');
}

async function diagnoseProvider({ label, missingMessage, key, clientConfig, secrets, extra, json = false }) {
  if (!key) {
    if (!json) console.log(`${label}: ${missingMessage}`);
    return {
      label,
      status: 'missing',
      model: clientConfig.model,
      base_url: clientConfig.baseUrl,
      message: missingMessage,
    };
  }

  try {
    const client = createChatClient(clientConfig);
    await preflightChatClient(client);
    if (!json) console.log(`${label}: pass model=${client.model} endpoint=${client.url}${extra ? ` ${extra}` : ''}`);
    return {
      label,
      status: 'pass',
      model: client.model,
      base_url: client.baseUrl,
      endpoint: client.url,
      extra,
    };
  } catch (error) {
    const message = redactSecrets(error instanceof Error ? error.message : String(error), secrets);
    if (!json) console.log(`${label}: fail ${message}`);
    return {
      label,
      status: 'fail',
      model: clientConfig.model,
      base_url: clientConfig.baseUrl,
      message,
      extra,
    };
  }
}

function buildNextSteps(results, envFile, options = {}) {
  const target = envFile || 'docs/validation/live/tastekit-live.env or shell environment';
  const steps = [];
  if (results.some(result => result.label === 'openai' && result.status === 'missing')) {
    steps.push(`Fill OPENAI_API_KEY in ${target}, or pass --openai-key-file /path/to/key for local proxy-backed demos`);
  }
  if (results.some(result => result.label === 'zai' && result.status === 'missing')) {
    steps.push(`Fill ZAI_API_KEY in ${target}`);
  }
  if (steps.length) {
    steps.push(options.cliproxyOpenai ? 'Re-run pnpm test:live-e2e:subscription-demo' : 'Re-run pnpm test:live-e2e:release');
  }
  return steps;
}

main(process.argv.slice(2)).then(code => {
  process.exitCode = code;
});
