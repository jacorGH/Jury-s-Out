#!/usr/bin/env node
/*
 * Regenerates content/manifest.json from whatever is actually in content/.
 *
 * Static hosting can't list a directory, so the game can only load pack files
 * that are registered in the manifest. Maintaining that list by hand is the
 * single most common reason a pack silently does nothing. This removes the
 * step.
 *
 *   node tools/build-manifest.js            rewrite the manifest
 *   node tools/build-manifest.js --check    don't write; exit 1 if stale (CI)
 *   node tools/build-manifest.js --quiet    only report problems
 *
 * No dependencies.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const MANIFEST = path.join(CONTENT, 'manifest.json');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const QUIET = args.includes('--quiet');

const problems = [];
const notes = [];
function say(msg) { if (!QUIET) console.log(msg); }

/* ---------- classification ---------- */

// Folder name decides the kind; a file loose in content/ is sniffed by shape.
function classify(relPath, data) {
  const dir = relPath.split('/')[0].toLowerCase();
  if (dir === 'cases') return 'cases';
  if (dir === 'names') return 'names';
  if (dir === 'phrases') return 'phrases';

  const sample = Array.isArray(data) ? data[0] : data;
  if (!sample || typeof sample !== 'object') return null;
  if (sample.defendants || sample.evidence) return 'cases';
  if (sample.firsts || sample.lasts) return 'names';
  if (sample.general || sample.roles || sample.categories) return 'phrases';
  return null;
}

/* ---------- validation (mirrors the game's own rules) ---------- */

function validateCase(c, label) {
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  need(typeof c.title === 'string' && c.title.trim(), 'missing "title"');
  need(typeof c.summary === 'string' && c.summary.trim(), 'missing "summary"');
  need(typeof c.prosecutionStatement === 'string' && c.prosecutionStatement.trim(), 'missing "prosecutionStatement"');
  need(typeof c.defenseStatement === 'string' && c.defenseStatement.trim(), 'missing "defenseStatement"');
  need(Array.isArray(c.defendants) && c.defendants.length > 0, 'needs at least one defendant');

  (c.defendants || []).forEach((d, i) => {
    need(typeof d.name === 'string' && d.name.trim(), `defendants[${i}] missing "name"`);
    const hasOutcome = d.trueOutcomeEnc || d.trueOutcomeRev ||
      d.trueOutcome === 'guilty' || d.trueOutcome === 'not_guilty';
    need(hasOutcome, `defendants[${i}] needs trueOutcome / trueOutcomeRev / trueOutcomeEnc`);
  });

  need(Array.isArray(c.evidence) && c.evidence.length > 0, 'needs at least one evidence item');
  (c.evidence || []).forEach((e, i) => {
    need(typeof e.description === 'string' && e.description.trim(), `evidence[${i}] missing "description"`);
    need(['prosecution', 'defense', 'neutral'].includes(e.favors), `evidence[${i}] "favors" must be prosecution/defense/neutral`);
    need(['public', 'private'].includes(e.visibility), `evidence[${i}] "visibility" must be public/private`);
  });

  // Not fatal, but worth flagging: a case nobody has to argue about.
  const pub = (c.evidence || []).filter(e => e.visibility === 'public');
  const pro = pub.filter(e => e.favors === 'prosecution').length;
  const def = pub.filter(e => e.favors === 'defense').length;
  if (errs.length === 0 && Math.abs(pro - def) > 1) {
    notes.push(`${label}: public evidence leans ${pro > def ? 'prosecution' : 'defense'} (${pro} vs ${def}) — the AI jurors will drift that way together`);
  }
  if ((c.evidence || []).filter(e => e.trueOutcome === undefined && e.insiderOnly).length > 1) {
    errs.push('more than one item marked insiderOnly');
  }
  return errs;
}

const VALID_ROLES = ['truth_seeker', 'bought', 'vendetta', 'bleeding_heart', 'hardliner', 'holdout', 'last_word', 'insider'];
const VALID_CATEGORIES = ['press', 'doubt', 'back', 'accuse', 'stall', 'react', 'close'];

function validatePhrases(data, label) {
  const errs = [];
  let count = 0;
  const checkList = (list, where) => {
    if (!Array.isArray(list)) { errs.push(`${where} must be an array`); return; }
    list.forEach((p, i) => {
      if (!p || typeof p.text !== 'string' || !p.text.trim()) errs.push(`${where}[${i}] missing "text"`);
      else count++;
      if (p && p.style && !['flow', 'slam', 'sarcasm'].includes(p.style)) {
        errs.push(`${where}[${i}] style "${p.style}" is not flow/slam/sarcasm`);
      }
    });
  };
  if (data.general) checkList(data.general, 'general');
  if (data.roles) {
    Object.keys(data.roles).forEach(r => {
      if (!VALID_ROLES.includes(r)) errs.push(`unknown role "${r}" (expected one of ${VALID_ROLES.join(', ')})`);
      else checkList(data.roles[r], `roles.${r}`);
    });
  }
  if (data.categories) {
    Object.keys(data.categories).forEach(c => {
      if (!VALID_CATEGORIES.includes(c)) errs.push(`unknown category "${c}" (expected one of ${VALID_CATEGORIES.join(', ')})`);
      else checkList(data.categories[c], `categories.${c}`);
    });
  }
  if (!data.general && !data.roles && !data.categories) errs.push('expected "general", "roles" or "categories"');
  if (errs.length === 0) notes.push(`${label}: ${count} phrase(s)`);
  return errs;
}

function validateNames(data, label) {
  const errs = [];
  const f = Array.isArray(data.firsts) ? data.firsts.length : 0;
  const l = Array.isArray(data.lasts) ? data.lasts.length : 0;
  if (!f && !l) errs.push('expected "firsts" and/or "lasts" arrays');
  else notes.push(`${label}: ${f} first, ${l} last name(s)`);
  return errs;
}

/* ---------- scan ---------- */

function walk(dir, base) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return out; }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = base ? base + '/' + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) out.push(rel);
  }
  return out;
}

if (!fs.existsSync(CONTENT)) {
  console.error(`No content/ folder at ${CONTENT}. Nothing to do.`);
  process.exit(0);
}

const found = { cases: [], names: [], phrases: [] };
const files = walk(CONTENT, '').filter(f => f.toLowerCase() !== 'manifest.json');

say(`Scanning ${path.relative(ROOT, CONTENT)}/ — ${files.length} JSON file(s)\n`);

for (const rel of files) {
  const abs = path.join(CONTENT, rel);
  let raw, data;
  try { raw = fs.readFileSync(abs, 'utf8'); } catch (e) {
    problems.push(`${rel}: could not read (${e.message})`);
    continue;
  }
  try { data = JSON.parse(raw); } catch (e) {
    // Curly quotes from a chat assistant are the usual culprit.
    const repaired = raw
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/,(\s*[}\]])/g, '$1');
    try {
      data = JSON.parse(repaired);
      notes.push(`${rel}: parsed after fixing curly quotes / trailing commas — consider saving it cleaned up`);
    } catch (e2) {
      problems.push(`${rel}: invalid JSON (${e.message})`);
      continue;
    }
  }

  const kind = classify(rel, data);
  if (!kind) {
    problems.push(`${rel}: can't tell what this is. Put it in content/cases, content/names or content/phrases`);
    continue;
  }

  let errs = [];
  if (kind === 'cases') {
    const items = Array.isArray(data) ? data : [data];
    items.forEach((c, i) => {
      const label = items.length > 1 ? `${rel}[${i}]` : rel;
      const e = validateCase(c, label);
      if (e.length) errs.push(...e.map(x => `${label}: ${x}`));
      else notes.push(`${label}: "${c.title}"`);
    });
  } else if (kind === 'names') {
    errs = validateNames(data, rel).map(x => `${rel}: ${x}`);
  } else {
    errs = validatePhrases(data, rel).map(x => `${rel}: ${x}`);
  }

  if (errs.length) {
    problems.push(...errs);
    say(`  SKIP  ${rel}`);
  } else {
    found[kind].push(rel);
    say(`  ok    ${rel}  (${kind})`);
  }
}

/* ---------- write ---------- */

const manifest = {
  cases: found.cases.sort(),
  names: found.names.sort(),
  phrases: found.phrases.sort()
};
const output = JSON.stringify(manifest, null, 2) + '\n';

let existing = null;
try { existing = fs.readFileSync(MANIFEST, 'utf8'); } catch (e) { /* no manifest yet */ }
const changed = existing !== output;

if (notes.length && !QUIET) {
  console.log('\nNotes:');
  notes.forEach(n => console.log('  - ' + n));
}
if (problems.length) {
  console.log('\nProblems (these files were left out of the manifest):');
  problems.forEach(p => console.log('  ! ' + p));
}

console.log(`\n${manifest.cases.length} case, ${manifest.names.length} name, ${manifest.phrases.length} phrase pack(s)`);

if (CHECK) {
  if (changed) {
    console.error('\nmanifest.json is out of date. Run: node tools/build-manifest.js');
    process.exit(1);
  }
  console.log('manifest.json is up to date.');
  process.exit(problems.length ? 1 : 0);
}

if (!changed) {
  console.log('manifest.json already up to date — not rewritten.');
} else {
  fs.writeFileSync(MANIFEST, output);
  console.log(`Wrote ${path.relative(ROOT, MANIFEST)}`);
}

// A bad pack file shouldn't fail the whole run, but it should be visible.
process.exit(0);
