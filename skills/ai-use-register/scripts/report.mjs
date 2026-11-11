#!/usr/bin/env node
// Build a deterministic Markdown register from register.json. Zero dependencies.
//   report.mjs register.json [--today YYYY-MM-DD] [--out FILE]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRealDate, CONTROLS } from './lib.mjs';

const TIER_ORDER = ['prohibited', 'high_risk', 'transparency', 'gpai_provider', 'needs_assessment', 'minimal'];
const label = (s) => String(s).replace(/_/g, ' ');
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function render(data, today = null) {
  const systems = [...data.systems].sort((a, b) => a.id.localeCompare(b.id));
  const byTier = (t) => systems.filter((s) => s.eu_ai_act.tier === t).length;
  const byStatus = (t) => systems.filter((s) => s.status === t).length;
  const titles = Object.fromEntries(CONTROLS.map((c) => [c.id, c.title]));
  const out = [];
  out.push(`# AI system register${data.organisation ? `: ${data.organisation}` : ''}`);
  out.push('');
  out.push(`Register as of ${data.as_of || 'unknown date'}. Generated from \`register.json\`; do not edit by hand. Tiers are working assessments, not legal advice.`);
  out.push('');
  out.push(`${systems.length} system(s): ${['production', 'pilot', 'idea', 'retired'].map((s) => `${byStatus(s)} ${s}`).join(', ')}.`);
  out.push('');
  out.push('## Summary');
  out.push('');
  out.push('| Id | System | Status | Owner | Tier | Confidence | Next review |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of systems) out.push(`| ${s.id} | ${cell(s.name)} | ${s.status} | ${cell(s.owner)} | ${label(s.eu_ai_act.tier)} | ${s.eu_ai_act.confidence} | ${s.next_review} |`);
  out.push('');
  out.push('## Tiers');
  out.push('');
  out.push(TIER_ORDER.map((t) => `${label(t)}: ${byTier(t)}`).join('; ') + '.');
  out.push('');
  const attention = [];
  for (const s of systems) {
    if (s.eu_ai_act.tier === 'prohibited') attention.push(`${s.id} ${s.name}: assessed as prohibited. Stop and record the decision.`);
    if (s.eu_ai_act.tier === 'high_risk') attention.push(`${s.id} ${s.name}: high-risk (${label(s.eu_ai_act.annex_iii_area || 'area missing')}); DPIA ${label(s.dpia?.status || 'not recorded')}.`);
    if (s.status === 'production' && s.eu_ai_act.tier === 'needs_assessment') attention.push(`${s.id} ${s.name}: in production but the tier is still needs assessment.`);
    if (today && s.status !== 'retired' && s.next_review < today) attention.push(`${s.id} ${s.name}: review was due ${s.next_review}.`);
    for (const g of s.iso42001?.gaps || []) attention.push(`${s.id} ${s.name}: gap, ${g}`);
  }
  out.push('## Needs attention');
  out.push('');
  if (attention.length) for (const a of attention) out.push(`- ${a}`); else out.push('Nothing flagged.');
  out.push('');
  out.push('## Systems');
  for (const s of systems) {
    out.push('');
    out.push(`### ${s.id} ${s.name}`);
    out.push('');
    out.push(`- Purpose: ${s.purpose}`);
    out.push(`- Status: ${s.status}; owner: ${s.owner}; users: ${s.users.map(label).join(', ')}`);
    out.push(`- Models: ${s.models.map((m) => `${m.name} (${m.provider || 'provider not recorded'}, ${label(m.hosting)})`).join('; ')}`);
    out.push(`- Data: ${s.data.categories.join(', ')}; personal data ${s.data.personal_data ? 'yes' : 'no'}; special category ${s.data.special_category ? 'yes' : 'no'}; leaves the organisation ${s.data.leaves_organisation ? 'yes' : 'no'}`);
    if (s.lawful_basis) out.push(`- Lawful basis: ${label(s.lawful_basis)}; DPIA: ${label(s.dpia?.status || 'not recorded')}`);
    out.push(`- Autonomy: ${label(s.autonomy)}${s.human_oversight ? `; oversight: ${s.human_oversight}` : ''}`);
    const ai = s.eu_ai_act;
    out.push(`- EU AI Act: ${label(ai.tier)}${ai.annex_iii_area ? ` (${label(ai.annex_iii_area)})` : ''}, role ${label(ai.role)}, confidence ${ai.confidence}, assessed ${ai.assessed_on}`);
    out.push(`- Rationale: ${ai.rationale}`);
    if (s.iso42001?.controls?.length) out.push(`- ISO/IEC 42001 controls: ${s.iso42001.controls.map((c) => `${c} ${titles[c] || ''}`.trim()).join('; ')}`);
    if (s.risks?.length) { out.push('- Risks:'); for (const r of s.risks) out.push(`  - ${r.description} (likelihood ${r.likelihood}, impact ${r.impact}). Mitigation: ${r.mitigation}`); }
    if (s.evidence?.length) out.push(`- Evidence: ${s.evidence.map((e) => `\`${e.file}:${e.start_line}${e.end_line && e.end_line !== e.start_line ? `-${e.end_line}` : ''}\``).join(', ')}`);
    out.push(`- Last reviewed ${s.last_reviewed}; next review ${s.next_review}`);
  }
  return out.join('\n') + '\n';
}

const USAGE = 'usage: report.mjs register.json [--today YYYY-MM-DD] [--out FILE]\nexit codes: 0 ok, 2 usage error';
export function main(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--today' || argv[i] === '--out') { flags[argv[i].slice(2)] = argv[i + 1]; i += 1; } else if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = true;
    else pos.push(argv[i]);
  }
  if (flags.help) { console.log(USAGE); return 0; }
  if (pos.length !== 1) { console.error(USAGE); return 2; }
  if (flags.today && !isRealDate(flags.today)) { console.error('--today must be a real YYYY-MM-DD date'); return 2; }
  let data;
  try { data = JSON.parse(readFileSync(resolve(pos[0]), 'utf8')); } catch (e) { console.error(`cannot read ${pos[0]}: ${e.message}`); return 2; }
  if (!Array.isArray(data.systems)) { console.error('expected a "systems" array'); return 2; }
  const text = render(data, flags.today || null);
  if (flags.out) writeFileSync(resolve(flags.out), text); else process.stdout.write(text);
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
