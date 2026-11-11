// Generates the per-agent adapters from skills/ai-use-register/core.md.
// Run: node scripts/build.mjs   Check only: node scripts/build.mjs --check
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = join(ROOT, 'skills', 'ai-use-register');
export const BLOCK_START = '<!-- ai-use-register:start -->';
export const BLOCK_END = '<!-- ai-use-register:end -->';
const core = readFileSync(join(SKILL, 'core.md'), 'utf8').trimEnd() + '\n';

export function cursorRule() {
  return `---
description: Find where a codebase uses AI and build a checked AI system register with a working EU AI Act tier and ISO/IEC 42001 mapping
globs:
alwaysApply: false
---

# AI use register

${core}`;
}

export function agentsBlock() {
  return `${BLOCK_START}
## AI use register

Use when asked to find, inventory or register the AI systems used in a codebase or organisation.

${core.trimEnd()}
${BLOCK_END}
`;
}

export function outputs() {
  return {
    [join(ROOT, 'adapters', 'cursor', 'ai-use-register.mdc')]: cursorRule(),
    [join(ROOT, 'adapters', 'AGENTS.block.md')]: agentsBlock(),
  };
}

export function main(argv) {
  const check = argv.includes('--check');
  let stale = 0;
  for (const [path, text] of Object.entries(outputs())) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current === text) continue;
    if (check) { console.error(`stale: ${path.slice(ROOT.length + 1)}`); stale += 1; continue; }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    console.log(`wrote ${path.slice(ROOT.length + 1)}`);
  }
  if (check) console.log(stale ? `${stale} generated file(s) out of date; run: node scripts/build.mjs` : 'generated files are current');
  return stale ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
