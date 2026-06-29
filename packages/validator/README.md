# @kairox_ai/tastekit-validator

Pre-1.0 validator for [TasteKit](https://github.com/philipbankier/tastekit) constitution artifacts.

Use this package to validate `.tastekit/constitution.v1.json` from CI, release checks, or agent-skill fallback paths.

## Install

```bash
npm install @kairox_ai/tastekit-validator
```

## CLI

```bash
npx @kairox_ai/tastekit-validator .tastekit/constitution.v1.json
```

The validator checks the canonical Zod schema and JSON Schema parity, then applies deterministic checks for common extraction failures such as duplicate IDs, malformed extension shapes, placeholder keys, and unsafe JSON values.

## Programmatic Usage

```typescript
import { validateConstitutionFile } from '@kairox_ai/tastekit-validator';

const result = await validateConstitutionFile('.tastekit/constitution.v1.json');
if (!result.ok) {
  console.error(result.errors);
}
```

## License

MIT
