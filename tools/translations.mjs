/*!
 * Cairn 2e - Tradução para Português (Brasil)
 * 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

/**
 * Keeps this module in step with the Cairn 2e system after the system changes.
 *
 *   node tools/translations.mjs check      what is new, changed or removed upstream, and every
 *                                         translation that breaks a rule (length, HTML, dice…)
 *   node tools/translations.mjs todo       write tools/work/*.json holding only the English that
 *                                         needs translating: translate the values in place
 *   node tools/translations.mjs apply      merge tools/work/*.json into compendium/ and lang/,
 *                                         regenerate the scroll packs, point heading links at the
 *                                         translated headings, update the snapshot
 *   node tools/translations.mjs snapshot   accept the current system source as translated
 *
 * The system is read from ../../systems/cairn2e (its packs/_source and lang/en.json); set
 * CAIRN_SYSTEM_DIR to point elsewhere. tools/snapshot.json records a hash of the English each
 * translation was made from — that is how a changed English text is told apart from an unchanged
 * one, since Babele files only hold the Portuguese.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM_DIR = resolve(process.env.CAIRN_SYSTEM_DIR ?? join(MODULE_DIR, "../../systems/cairn2e"));
const SYSTEM_ID = "cairn2e";
const COMPENDIUM_DIR = join(MODULE_DIR, "compendium");
const LANG_FILE = join(MODULE_DIR, "lang/pt-BR.json");
const WORK_DIR = join(MODULE_DIR, "tools/work");
const SNAPSHOT_FILE = join(MODULE_DIR, "tools/snapshot.json");
const PACK_FOLDERS = "_packs-folders";

// A scroll is its spellbook's text minus the italic flavour paragraph, so scroll packs are built
// from the spellbook translation instead of being translated twice.
const DERIVED = { "scrolls": "spellbooks", "more-scrolls": "more-spellbooks" };
const FLAVOR = /^<p><em>.*?<\/em><\/p>/s;

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const hash = (value) => createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 12);
const packFile = (pack) => join(COMPENDIUM_DIR, `${SYSTEM_ID}.${pack}.json`);

/* -------------------------------------------- */
/*  Reading the system                          */
/* -------------------------------------------- */

function systemPacks() {
  return readJson(join(SYSTEM_DIR, "system.json")).packs.map((p) => p.name);
}

function loadSource(pack) {
  const dir = join(SYSTEM_DIR, "packs/_source", pack);
  const docs = [];
  const folders = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const doc = readJson(join(dir, file));
    if (doc._key?.startsWith("!folders")) folders.push(doc.name);
    else docs.push(doc);
  }
  return { docs, folders };
}

/**
 * The translatable English of one pack, keyed the way the Babele file is keyed: by name, or by
 * `_id` where two documents share a name. Mirrors what Babele reads through the mappings that
 * scripts/main.js registers.
 */
function englishEntries(pack) {
  const { docs, folders } = loadSource(pack);
  const count = {};
  for (const d of docs) count[d.name] = (count[d.name] ?? 0) + 1;
  const entries = {};
  for (const d of docs) {
    const e = { name: d.name };
    const sys = d.system ?? {};
    if (d.description) e.description = d.description;
    if (sys.description) e.description = sys.description;
    if (sys.recharge) e.recharge = sys.recharge;
    if (sys.career) e.career = sys.career;
    if (d.results) {
      const results = {};
      for (const r of d.results) {
        const isText = r.type === "text";
        let key = isText ? `${r.range[0]}-${r.range[1]}` : r._id;
        if (results[key]) key = r._id;
        const re = {};
        if (isText && r.name) re.name = r.name;
        if (r.description) re.description = r.description;
        if (Object.keys(re).length) results[key] = re;
      }
      if (Object.keys(results).length) e.results = results;
    }
    // Babele's default JournalEntry mapping matches a page by `_id`, then by name.
    if (d.pages?.length) {
      e.pages = {};
      for (const pg of d.pages) {
        e.pages[pg.name] = { name: pg.name };
        if (pg.text?.content) e.pages[pg.name].text = pg.text.content;
      }
    }
    if (d.items?.length) {
      e.items = {};
      for (const i of d.items) {
        e.items[i.name] = { name: i.name };
        if (i.system?.description) e.items[i.name].description = i.system.description;
      }
    }
    entries[count[d.name] > 1 ? d._id : d.name] = e;
  }
  return { entries, folders, docs };
}

function systemPackFolders() {
  const names = [];
  const walk = (list) => { for (const f of list ?? []) { names.push(f.name); walk(f.folders); } };
  walk(readJson(join(SYSTEM_DIR, "system.json")).packFolders);
  return names;
}

/** `{ "a.b.c": value }` from a lang file, with the real key path kept for writing back. */
function flatten(obj, path = [], out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") flatten(v, [...path, k], out);
    else out.set([...path, k].join("."), { path: [...path, k], value: v });
  }
  return out;
}

/* -------------------------------------------- */
/*  Rules a translation must keep               */
/* -------------------------------------------- */

const TAG = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
const DICE = /\b\d*d\d+(?:\s*[+-]\s*\d+)?\b/g;
const LINKS = /@[A-Za-z]+\[[^\]]*\]|\[\[[^\]]*\]\]/g;
const PLACEHOLDER = /\{\w+\}/g;
const tags = (s) => [...s.matchAll(TAG)].map((m) => m[0].slice(0, 2) + m[1]).join(" ");
const sorted = (s, re) => (s.match(re) ?? []).map((x) => x.replace(/\s/g, "")).sort().join(" ");
// A link's `#slug` names a heading by its text, so it changes with the translated heading.
const unanchored = (s) => s.replace(/#[^\]]*\]/g, "]");

/** Names are shown in narrow rows and chips: at most 4 characters over the English, or 18. */
const nameBudget = (en) => Math.max(en.length + 4, 18);
// A "name" that is really a sentence (bestiary Features) wraps like body text.
const isSentence = (en) => en.length > 30 && /\s/.test(en);

function compareText(en, pt, where, report) {
  if (typeof pt !== "string" || (en.trim() && !pt.trim())) return report.errors.push(`${where}: missing translation`);
  if (tags(en) !== tags(pt)) report.errors.push(`${where}: HTML tags differ from the English`);
  if (sorted(unanchored(en), LINKS) !== sorted(unanchored(pt), LINKS)) report.errors.push(`${where}: @UUID or [[...]] changed`);
  if (sorted(en, DICE) !== sorted(pt, DICE)) report.warnings.push(`${where}: dice differ (${en.match(DICE) ?? []} → ${pt.match(DICE) ?? []})`);
  if (en.endsWith("*") && !pt.endsWith("*")) report.errors.push(`${where}: lost the trailing *`);
}

function compareName(en, pt, where, report) {
  compareText(en, pt, where, report);
  if (typeof pt === "string" && !isSentence(en) && pt.length > nameBudget(en)) {
    report.warnings.push(`${where}: name too long (${pt.length} > ${nameBudget(en)}) "${pt}"`);
  }
}

function compareEntry(en, pt, where, report) {
  compareName(en.name, pt.name, `${where} name`, report);
  for (const field of ["description", "recharge", "career"]) {
    if (en[field]) compareText(en[field], pt[field], `${where} ${field}`, report);
  }
  for (const [k, r] of Object.entries(en.results ?? {})) {
    const p = pt.results?.[k];
    if (!p) { report.errors.push(`${where} result ${k}: missing`); continue; }
    if (r.name) compareName(r.name, p.name, `${where} result ${k} name`, report);
    if (r.description) compareText(r.description, p.description, `${where} result ${k}`, report);
  }
  for (const [k, pg] of Object.entries(en.pages ?? {})) {
    const p = pt.pages?.[k];
    if (!p) { report.errors.push(`${where} page "${k}": missing`); continue; }
    compareName(pg.name, p.name, `${where} page "${k}" name`, report);
    if (pg.text) compareText(pg.text, p.text, `${where} page "${k}"`, report);
  }
  for (const [k, i] of Object.entries(en.items ?? {})) {
    const p = pt.items?.[k];
    if (!p) { report.errors.push(`${where} item "${k}": missing`); continue; }
    compareName(i.name, p.name, `${where} item "${k}" name`, report);
    if (i.description) compareText(i.description, p.description, `${where} item "${k}"`, report);
  }
}

/* -------------------------------------------- */
/*  Heading links                               */
/* -------------------------------------------- */

// A link may open a journal page at a heading: `@UUID[…JournalEntryPage.<id>#slug]`. Headings
// carry no id here, so Foundry finds one by JournalEntryPage.slugifyHeading of its text, and a
// translated heading has a new slug. String#slugify maps symbols and accented letters through
// its CHAR_MAP ("&" → "and", "ç" → "c"), lowercases, turns runs of spaces and dashes into one
// dash; slugifyHeading then drops quotes and cuts at 64. These are the CHAR_MAP entries Latin
// text can hit; NFD covers the accented letters.
const SLUG_CHARS = { "&": "and", "$": "dollar", "%": "percent", "<": "less", ">": "greater", "|": "or", "ª": "a", "º": "o", "…": "..." };
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", "#39": "'", nbsp: " " };
const ANCHORED_LINK = /(@UUID\[)([^\]#]+)#([^\]]+)\]/g;

function headingSlugs(html) {
  return [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/gs)].map(([, , inner]) => {
    const text = inner.replace(/<[^>]*>/g, "").replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, e) => ENTITIES[e]);
    return [...text].map((c) => SLUG_CHARS[c] ?? c).join("").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .trim().toLowerCase().replace(/[\s-]+/g, "-").replace(/["'‘’“”]/g, "").substring(0, 64);
  });
}

/** Each journal page's heading slugs, English and translated, by the UUID a link names it with. */
function pageAnchors() {
  const anchors = new Map();
  for (const pack of systemPacks()) {
    const { docs } = englishEntries(pack);
    if (!docs.some((d) => d.pages?.length)) continue;
    const pt = existsSync(packFile(pack)) ? readJson(packFile(pack)).entries : {};
    for (const d of docs) for (const pg of d.pages ?? []) {
      const ptText = (pt[d.name] ?? pt[d._id])?.pages?.[pg.name]?.text ?? "";
      anchors.set(`Compendium.${SYSTEM_ID}.${pack}.JournalEntry.${d._id}.JournalEntryPage.${pg._id}`,
        { en: headingSlugs(pg.text?.content ?? ""), pt: headingSlugs(ptText) });
    }
  }
  return anchors;
}

/** The slugs a link into this page may use: the translated headings, or the English while it has none. */
const validSlugs = (anchor) => (anchor.pt.length ? anchor.pt : anchor.en);

const mapStrings = (v, fn) => typeof v === "string" ? fn(v)
  : Array.isArray(v) ? v.map((x) => mapStrings(x, fn))
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)]))
  : v;

/** Point every heading link at the translated heading in the place of the English one it named. */
function retargetAnchors() {
  const anchors = pageAnchors();
  let n = 0;
  const fix = (s) => s.replace(ANCHORED_LINK, (link, at, uuid, slug) => {
    const anchor = anchors.get(uuid);
    if (!anchor || validSlugs(anchor).includes(slug)) return link;
    const translated = anchor.pt[anchor.en.indexOf(slug)];
    if (!translated) return link;
    n++;
    return `${at}${uuid}#${translated}]`;
  });
  for (const pack of systemPacks()) {
    if (!existsSync(packFile(pack))) continue;
    const data = readJson(packFile(pack));
    const before = n;
    data.entries = mapStrings(data.entries, fix);
    if (n > before) writeJson(packFile(pack), data);
  }
  return n ? `${n} heading link(s) pointed at the translated heading` : null;
}

/* -------------------------------------------- */
/*  Commands                                    */
/* -------------------------------------------- */

function loadSnapshot() {
  return existsSync(SNAPSHOT_FILE) ? readJson(SNAPSHOT_FILE) : { packs: {}, lang: {} };
}

/** Everything that differs between the system and this module, per pack and for the lang file. */
function diff() {
  const snapshot = loadSnapshot();
  const result = { packs: {}, lang: null, packFolders: [] };
  const anchors = pageAnchors();
  for (const pack of systemPacks()) {
    const { entries, folders } = englishEntries(pack);
    const file = existsSync(packFile(pack)) ? readJson(packFile(pack)) : { entries: {}, folders: {} };
    const pt = file.entries ?? {};
    const snap = snapshot.packs[pack] ?? {};
    const report = { new: [], changed: [], removed: [], folders: [], errors: [], warnings: [] };
    for (const [key, en] of Object.entries(entries)) {
      if (!pt[key]) { report.new.push(key); continue; }
      if (snap[key] && snap[key] !== hash(en)) report.changed.push(key);
      compareEntry(en, pt[key], `"${key}"`, report);
    }
    report.removed = Object.keys(pt).filter((k) => !entries[k]);
    report.folders = folders.filter((f) => !file.folders?.[f]);
    mapStrings(pt, (s) => {
      for (const [, , uuid, slug] of s.matchAll(ANCHORED_LINK)) {
        const anchor = anchors.get(uuid);
        if (anchor && !validSlugs(anchor).includes(slug)) report.errors.push(`link to #${slug} finds no heading in ${uuid}`);
      }
      return s;
    });
    result.packs[pack] = report;
  }

  const en = flatten(readJson(join(SYSTEM_DIR, "lang/en.json")));
  const pt = flatten(existsSync(LANG_FILE) ? readJson(LANG_FILE) : {});
  const lang = { new: [], changed: [], removed: [], errors: [], warnings: [] };
  for (const [key, { value }] of en) {
    const p = pt.get(key);
    if (!p) { lang.new.push(key); continue; }
    if (snapshot.lang[key] && snapshot.lang[key] !== hash(value)) lang.changed.push(key);
    const enPh = new Set(value.match(PLACEHOLDER) ?? []);
    const ptPh = new Set(String(p.value).match(PLACEHOLDER) ?? []);
    for (const ph of ptPh) if (!enPh.has(ph)) lang.errors.push(`${key}: unknown placeholder ${ph}`);
    // `{article}` carries the English "A"/"An"; the system allows a language to drop it.
    for (const ph of enPh) if (!ptPh.has(ph) && ph !== "{article}") lang.errors.push(`${key}: lost placeholder ${ph}`);
  }
  lang.removed = [...pt.keys()].filter((k) => !en.has(k));
  result.lang = lang;

  const folderFile = join(COMPENDIUM_DIR, `${SYSTEM_ID}.${PACK_FOLDERS}.json`);
  const translated = existsSync(folderFile) ? readJson(folderFile).entries : {};
  result.packFolders = systemPackFolders().filter((n) => !translated[n]);
  return result;
}

function check() {
  const { packs, lang, packFolders } = diff();
  let pending = 0;
  const list = (label, items, max = 20) => {
    if (!items.length) return;
    console.log(`  ${label} (${items.length})`);
    for (const i of items.slice(0, max)) console.log(`    - ${i}`);
    if (items.length > max) console.log(`    … ${items.length - max} more`);
  };
  for (const [pack, r] of Object.entries(packs)) {
    const todo = r.new.length + r.changed.length + r.removed.length + r.folders.length + r.errors.length;
    pending += todo;
    if (!todo && !r.warnings.length) continue;
    console.log(`\n${pack}${DERIVED[pack] ? ` (built from ${DERIVED[pack]})` : ""}`);
    list("new", r.new); list("English changed", r.changed); list("removed upstream", r.removed);
    list("untranslated folders", r.folders); list("errors", r.errors); list("warnings", r.warnings, 10);
  }
  const langTodo = lang.new.length + lang.changed.length + lang.removed.length + lang.errors.length;
  pending += langTodo + packFolders.length;
  if (langTodo) {
    console.log("\nlang/pt-BR.json");
    list("new keys", lang.new); list("English changed", lang.changed);
    list("keys gone from en.json", lang.removed); list("errors", lang.errors);
  }
  if (packFolders.length) { console.log("\ncompendium sidebar folders"); list("untranslated", packFolders); }
  console.log(pending ? `\n${pending} item(s) to handle. Run "todo" to extract what needs translating.` : "\nEverything is translated and in step with the system.");
  process.exitCode = pending ? 1 : 0;
}

function todo() {
  const { packs, lang, packFolders } = diff();
  rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true });
  const written = [];
  for (const [pack, r] of Object.entries(packs)) {
    const keys = [...r.new, ...r.changed];
    if (DERIVED[pack]) {
      // Only what cannot be derived from its spellbook reaches the translator.
      const book = englishEntries(DERIVED[pack]).entries;
      const own = englishEntries(pack).entries;
      keys.splice(0, keys.length, ...keys.filter((k) => !derivable(own[k], book[k])));
    }
    if (!keys.length && !r.folders.length) continue;
    const { entries } = englishEntries(pack);
    const out = {};
    if (r.folders.length) out._folders = Object.fromEntries(r.folders.map((f) => [f, f]));
    for (const k of keys) out[k] = entries[k];
    writeJson(join(WORK_DIR, `${pack}.json`), out);
    written.push(`${pack}.json (${keys.length})`);
  }
  const enLang = flatten(readJson(join(SYSTEM_DIR, "lang/en.json")));
  const langKeys = [...lang.new, ...lang.changed];
  if (langKeys.length) {
    writeJson(join(WORK_DIR, "lang.json"), Object.fromEntries(langKeys.map((k) => [k, enLang.get(k).value])));
    written.push(`lang.json (${langKeys.length})`);
  }
  if (packFolders.length) {
    writeJson(join(WORK_DIR, `${PACK_FOLDERS}.json`), Object.fromEntries(packFolders.map((n) => [n, n])));
    written.push(`${PACK_FOLDERS}.json (${packFolders.length})`);
  }
  console.log(written.length ? `Wrote to tools/work/:\n  ${written.join("\n  ")}\nTranslate every value in place (never the keys), then run "apply".` : "Nothing to translate.");
}

function derivable(scroll, book) {
  if (!scroll || !book) return false;
  return scroll.description === book.description || scroll.description === book.description?.replace(FLAVOR, "");
}

function apply() {
  if (!existsSync(WORK_DIR)) return console.log("No tools/work/ folder. Run \"todo\" first.");
  const snapshot = loadSnapshot();
  const applied = [];
  for (const file of readdirSync(WORK_DIR).filter((f) => f.endsWith(".json"))) {
    const name = file.replace(/\.json$/, "");
    const work = readJson(join(WORK_DIR, file));
    if (name === "lang") { applyLang(work, snapshot); applied.push(`lang (${Object.keys(work).length})`); continue; }
    if (name === PACK_FOLDERS) {
      const target = join(COMPENDIUM_DIR, `${SYSTEM_ID}.${PACK_FOLDERS}.json`);
      const data = existsSync(target) ? readJson(target) : { entries: {} };
      Object.assign(data.entries, work);
      writeJson(target, data);
      applied.push(`${PACK_FOLDERS} (${Object.keys(work).length})`);
      continue;
    }
    const target = packFile(name);
    const data = existsSync(target) ? readJson(target) : { label: name, entries: {} };
    const { entries } = englishEntries(name);
    if (work._folders) data.folders = { ...(data.folders ?? {}), ...work._folders };
    let n = 0;
    for (const [key, entry] of Object.entries(work)) {
      if (key === "_folders") continue;
      data.entries[key] = entry;
      (snapshot.packs[name] ??= {})[key] = hash(entries[key]);
      n++;
    }
    writeJson(target, data);
    applied.push(`${name} (${n})`);
  }
  for (const [pack, from] of Object.entries(DERIVED)) applied.push(deriveScrolls(pack, from, snapshot));
  applied.push(prune(snapshot));
  applied.push(retargetAnchors());
  if (!existsSync(join(WORK_DIR, "lang.json"))) applyLang({}, snapshot);
  writeJson(SNAPSHOT_FILE, snapshot);
  rmSync(WORK_DIR, { recursive: true, force: true });
  console.log(`Applied:\n  ${applied.filter(Boolean).join("\n  ")}\nRun "check" to confirm.`);
}

/** Drop entries and folders the system no longer has. (Lang keys are pruned by applyLang's rebuild.) */
function prune(snapshot) {
  let n = 0;
  for (const pack of systemPacks()) {
    if (!existsSync(packFile(pack))) continue;
    const data = readJson(packFile(pack));
    const { entries, folders } = englishEntries(pack);
    for (const key of Object.keys(data.entries)) {
      if (entries[key]) continue;
      delete data.entries[key];
      delete snapshot.packs[pack]?.[key];
      n++;
    }
    for (const f of Object.keys(data.folders ?? {})) if (!folders.includes(f)) { delete data.folders[f]; n++; }
    writeJson(packFile(pack), data);
  }
  return n ? `removed ${n} entr(ies)/folder(s) gone from the system` : null;
}

/** Rebuild a scroll pack from its spellbook translation; a scroll that is not derivable keeps its own. */
function deriveScrolls(pack, from, snapshot) {
  if (!existsSync(packFile(from))) return null;
  const book = readJson(packFile(from));
  const bookEn = englishEntries(from).entries;
  const { entries: own } = englishEntries(pack);
  // Folders are not copied: scroll packs have their own (their prices differ from the books').
  const data = existsSync(packFile(pack)) ? readJson(packFile(pack)) : { label: pack, entries: {} };
  let n = 0;
  for (const [key, en] of Object.entries(own)) {
    const pt = book.entries[key];
    if (!pt || !derivable(en, bookEn[key])) continue;
    const stripped = en.description !== bookEn[key].description;
    data.entries[key] = { name: pt.name, description: stripped ? pt.description.replace(FLAVOR, "") : pt.description };
    (snapshot.packs[pack] ??= {})[key] = hash(en);
    n++;
  }
  writeJson(packFile(pack), data);
  return `${pack} (${n} rebuilt from ${from})`;
}

/** Write translated keys back into pt-BR.json, laid out in en.json's order and nesting. */
function applyLang(work, snapshot) {
  const enRaw = readJson(join(SYSTEM_DIR, "lang/en.json"));
  const en = flatten(enRaw);
  const pt = flatten(existsSync(LANG_FILE) ? readJson(LANG_FILE) : {});
  const build = (node, path) => Object.fromEntries(Object.entries(node).map(([k, v]) => {
    const p = [...path, k];
    if (v && typeof v === "object") return [k, build(v, p)];
    const key = p.join(".");
    return [k, work[key] ?? pt.get(key)?.value ?? v];
  }));
  writeJson(LANG_FILE, build(enRaw, []));
  for (const key of Object.keys(work)) if (en.has(key)) snapshot.lang[key] = hash(en.get(key).value);
}

function snapshot() {
  const snap = { packs: {}, lang: {} };
  for (const pack of systemPacks()) {
    snap.packs[pack] = Object.fromEntries(Object.entries(englishEntries(pack).entries).map(([k, e]) => [k, hash(e)]));
  }
  for (const [key, { value }] of flatten(readJson(join(SYSTEM_DIR, "lang/en.json")))) snap.lang[key] = hash(value);
  writeJson(SNAPSHOT_FILE, snap);
  console.log("Snapshot written: the current system source is recorded as translated.");
}

const commands = { check, todo, apply, snapshot };
const command = commands[process.argv[2]];
if (!command) {
  console.log("Usage: node tools/translations.mjs <check|todo|apply|snapshot>");
  process.exitCode = 2;
} else if (!existsSync(join(SYSTEM_DIR, "system.json"))) {
  console.error(`Cairn 2e system not found at ${SYSTEM_DIR}. Set CAIRN_SYSTEM_DIR.`);
  process.exitCode = 2;
} else {
  command();
}
