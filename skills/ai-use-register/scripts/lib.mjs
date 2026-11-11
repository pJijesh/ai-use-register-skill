// Validation for an AI system register. Zero dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';

export const ENUMS = {
  status: ['idea', 'pilot', 'production', 'retired'],
  users: ['staff', 'customers', 'candidates', 'public', 'other'],
  hosting: ['vendor_api', 'self_hosted', 'embedded', 'unknown'],
  autonomy: ['suggests', 'human_decides', 'acts_with_approval', 'acts_autonomously'],
  tier: ['prohibited', 'high_risk', 'transparency', 'minimal', 'gpai_provider', 'needs_assessment'],
  role: ['provider', 'deployer', 'both', 'not_assessed'],
  confidence: ['low', 'medium', 'high'],
  likelihood: ['low', 'medium', 'high'],
  impact: ['low', 'medium', 'high'],
  lawful_basis: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
  dpia: ['not_required', 'required_not_started', 'in_progress', 'complete'],
  annex_iii_area: ['biometrics', 'critical_infrastructure', 'education', 'employment', 'essential_services', 'law_enforcement', 'migration_border', 'justice_democracy'],
};

export const RULES = JSON.parse(readFileSync(new URL('./rules.json', import.meta.url), 'utf8')).rules;
export const CONTROLS = JSON.parse(readFileSync(new URL('./controls.json', import.meta.url), 'utf8')).controls;
const SEV = Object.fromEntries(RULES.map((r) => [r.id, r.severity]));

export function isRealDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const present = (v) => v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && v.length === 0);
const get = (o, path) => path.split('.').reduce((x, k) => (x === undefined || x === null ? undefined : x[k]), o);

export function checkQuote(root, ev) {
  const base = resolve(root);
  const abs = resolve(base, ev.file);
  const rel = relative(base, abs);
  if (isAbsolute(ev.file) || rel.startsWith('..') || rel.split(sep)[0] === '..') return { rule: 'REG018', message: `evidence path "${ev.file}" escapes the scanned folder` };
  if (!existsSync(abs)) return { rule: 'REG017', message: `evidence file "${ev.file}" does not exist` };
  const lines = readFileSync(abs, 'utf8').split('\n');
  const start = ev.start_line;
  const end = ev.end_line === undefined ? ev.start_line : ev.end_line;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > lines.length) return { rule: 'REG016', message: `${ev.file}: lines ${start}-${end} are outside the file (${lines.length} lines)` };
  const block = lines.slice(start - 1, end).join('\n');
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  if (!norm(block).includes(norm(ev.quote || ''))) return { rule: 'REG016', message: `${ev.file}:${start}-${end}: quoted text is not in the file at those lines` };
  return null;
}

export function validate(data, { root = null, today = null } = {}) {
  const findings = [];
  const add = (id, rule, message) => findings.push({ system: id, rule, severity: SEV[rule], message });
  if (!data || typeof data !== 'object' || !Array.isArray(data.systems)) {
    add('(file)', 'REG001', 'expected an object with a "systems" array');
    return findings;
  }
  const seen = new Set();
  const controlIds = new Set(CONTROLS.map((c) => c.id));
  data.systems.forEach((s, idx) => {
    const id = typeof s?.id === 'string' ? s.id : `(system #${idx + 1})`;
    if (!s || typeof s !== 'object') { add(id, 'REG001', 'system entry is not an object'); return; }
    if (!/^AI-\d{3,}$/.test(s.id || '')) add(id, 'REG003', `id "${s.id}" must look like AI-001`);
    else if (seen.has(s.id)) add(id, 'REG003', `id ${s.id} is used more than once`);
    seen.add(s.id);
    for (const f of ['name', 'owner', 'purpose', 'status', 'users', 'models', 'data.categories', 'data.personal_data', 'data.special_category', 'data.leaves_organisation', 'autonomy', 'eu_ai_act.tier', 'eu_ai_act.role', 'eu_ai_act.rationale', 'eu_ai_act.confidence', 'eu_ai_act.assessed_on', 'last_reviewed', 'next_review']) {
      const v = get(s, f);
      if (!present(v) && !(typeof v === 'boolean')) add(id, 'REG002', `missing required field "${f}"`);
    }
    const enumCheck = (value, key, label = key) => { if (present(value) && !ENUMS[key].includes(value)) add(id, 'REG004', `${label} "${value}" is not one of ${ENUMS[key].join(', ')}`); };
    enumCheck(s.status, 'status');
    for (const u of Array.isArray(s.users) ? s.users : []) enumCheck(u, 'users', 'users');
    for (const m of Array.isArray(s.models) ? s.models : []) { enumCheck(m.hosting, 'hosting', 'models.hosting'); if (!present(m.name)) add(id, 'REG002', 'a model entry has no name'); }
    enumCheck(s.autonomy, 'autonomy');
    const ai = s.eu_ai_act || {};
    enumCheck(ai.tier, 'tier', 'eu_ai_act.tier');
    enumCheck(ai.role, 'role', 'eu_ai_act.role');
    enumCheck(ai.confidence, 'confidence', 'eu_ai_act.confidence');
    enumCheck(s.lawful_basis, 'lawful_basis');
    enumCheck(s.dpia?.status, 'dpia', 'dpia.status');
    for (const r of Array.isArray(s.risks) ? s.risks : []) {
      enumCheck(r.likelihood, 'likelihood', 'risk likelihood');
      enumCheck(r.impact, 'impact', 'risk impact');
      for (const f of ['description', 'mitigation']) if (!present(r[f])) add(id, 'REG002', `a risk has no ${f}`);
    }
    for (const f of ['last_reviewed', 'next_review', 'eu_ai_act.assessed_on']) { const v = get(s, f); if (present(v) && !isRealDate(v)) add(id, 'REG005', `${f} "${v}" is not a real YYYY-MM-DD date`); }
    if (isRealDate(s.last_reviewed) && isRealDate(s.next_review) && s.next_review <= s.last_reviewed) add(id, 'REG006', 'next_review must be after last_reviewed');
    const live = ['pilot', 'production'].includes(s.status);
    if (live && (!present(s.owner) || /^(unknown|tbc|tbd|n\/a)$/i.test(String(s.owner).trim()))) add(id, 'REG007', `${s.status} system has no named owner`);
    if (ai.tier === 'minimal' && !(ai.prohibited_checked === true && ai.annex_iii_checked === true)) add(id, 'REG008', 'minimal needs eu_ai_act.prohibited_checked and eu_ai_act.annex_iii_checked both true');
    if (ai.tier === 'high_risk') {
      if (!ENUMS.annex_iii_area.includes(ai.annex_iii_area)) add(id, 'REG009', `high_risk needs eu_ai_act.annex_iii_area, one of ${ENUMS.annex_iii_area.join(', ')}`);
      if (!present(s.human_oversight)) add(id, 'REG014', 'high_risk system has no human_oversight description');
      if (s.autonomy === 'acts_autonomously') add(id, 'REG020', 'high-risk system acts autonomously; record how human oversight is still effective');
    }
    if (ai.tier === 'prohibited' && live) add(id, 'REG010', 'a system assessed as prohibited must not be pilot or production; stop it and record the decision');
    if (s.data?.personal_data === true && !present(s.lawful_basis)) add(id, 'REG011', 'personal data is processed but lawful_basis is missing');
    if ((s.data?.special_category === true || ai.tier === 'high_risk') && (!present(s.dpia?.status) || s.dpia.status === 'not_required')) add(id, 'REG012', 'special category data or a high-risk tier needs a DPIA status other than not_required');
    if (s.status === 'production' && !(Array.isArray(s.risks) && s.risks.length)) add(id, 'REG013', 'production system has no recorded risks');
    if (s.status === 'production' && ai.tier === 'needs_assessment') add(id, 'REG019', 'production system is still needs_assessment');
    const controls = s.iso42001?.controls;
    for (const c of Array.isArray(controls) ? controls : []) if (!controlIds.has(c)) add(id, 'REG015', `"${c}" is not a known ISO/IEC 42001 Annex A control id`);
    if (s.status === 'production' && !(Array.isArray(controls) && controls.length)) add(id, 'REG022', 'production system maps to no ISO/IEC 42001 controls');
    if (!(Array.isArray(s.evidence) && s.evidence.length)) add(id, 'REG023', 'no evidence entries; cite the code or configuration that shows the AI use');
    if (!(Array.isArray(s.models) && s.models.length)) add(id, 'REG024', 'no models listed');
    if (today && isRealDate(s.next_review) && s.next_review < today && s.status !== 'retired') add(id, 'REG021', `review was due ${s.next_review}`);
    if (root) {
      for (const ev of Array.isArray(s.evidence) ? s.evidence : []) {
        const bad = checkQuote(root, ev);
        if (bad) add(id, bad.rule, bad.message);
      }
    }
  });
  findings.sort((a, b) => a.system.localeCompare(b.system) || a.rule.localeCompare(b.rule) || a.message.localeCompare(b.message));
  return findings;
}
