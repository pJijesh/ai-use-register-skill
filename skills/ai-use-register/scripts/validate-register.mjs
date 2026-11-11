#!/usr/bin/env node
// Validate an AI system register. Zero dependencies.
//   validate-register.mjs register.json [--root DIR] [--today YYYY-MM-DD] [--strict] [--json]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, isRealDate, RULES } from './lib.mjs';

const USAGE = `usage: validate-register.mjs register.json [--root DIR] [--today YYYY-MM-DD] [--strict] [--json]
       validate-register.mjs --rules
  --root DIR     also check that every evidence quote is in the file at those lines
  --today DATE   flag reviews that are overdue on that date
  --strict       warnings also fail
exit codes: 0 ok, 1 problems found, 2 usage error`;
const VALUE = new Set(['--root', '--today']);

export function main(argv, out = console.log, err = console.error) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (VALUE.has(argv[i])) { flags[argv[i].slice(2)] = argv[i + 1]; i += 1; } else if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = true;
    else pos.push(argv[i]);
  }
  if (flags.help) { out(USAGE); return 0; }
  if (flags.rules) { for (const r of RULES) out(`${r.id}  ${r.severity.padEnd(7)}  ${r.summary}`); return 0; }
  if (pos.length !== 1 || (argv.includes('--root') && !flags.root)) { err(USAGE); return 2; }
  if (flags.today && !isRealDate(flags.today)) { err('--today must be a real YYYY-MM-DD date'); return 2; }
  let data;
  let findings;
  try { data = JSON.parse(readFileSync(resolve(pos[0]), 'utf8')); } catch (e) {
    if (e.code === 'ENOENT') { err(`no such file: ${pos[0]}`); return 2; }
    findings = [{ system: '(file)', rule: 'REG001', severity: 'error', message: `not valid JSON: ${e.message}` }];
  }
  findings = findings || validate(data, { root: flags.root || null, today: flags.today || null });
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;
  const count = Array.isArray(data?.systems) ? data.systems.length : 0;
  if (flags.json) out(JSON.stringify({ systems: count, errors, warnings, findings }, null, 2));
  else {
    for (const f of findings) out(`${f.system}  ${f.rule}  ${f.severity}  ${f.message}`);
    out(`${count} system(s): ${errors} error(s), ${warnings} warning(s)`);
  }
  return errors > 0 || (flags.strict && warnings > 0) ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
