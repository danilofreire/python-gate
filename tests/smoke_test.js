// Runs the quiz (content.js) and the popup (popup.js) against a fake page and a
// fake chrome.storage, and checks the behaviour end to end: retry, minutes,
// countdown, daily limit, schedule, harder questions, the 5-in-a-row challenge
// and backups. Needs only Node. Run from anywhere: node tests/smoke_test.js
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const ext = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(`${ext}/${f}`, "utf8");

function fakeEl(tag) {
  const e = {
    tag, children: [], handlers: {}, hidden: false, textContent: "", value: "", className: "", style: {},
    append(...kids) { e.children.push(...kids); },
    attachShadow() { return fakeEl("shadow"); },
    addEventListener(type, fn) { (e.handlers[type] = e.handlers[type] || []).push(fn); },
    fire(type, ev = {}) { for (const fn of e.handlers[type] || []) fn({ preventDefault() {}, stopPropagation() {}, ...ev }); },
    focus() {}, select() {},
  };
  return e;
}

function makeEnv(store, extra = {}) {
  const listeners = [], byId = {}, created = [];
  let clock = 1_000_000_000_000, intervals = [];
  const env = {
    console, Math, Number, String, Array, Object, Set, Symbol, URL, JSON, Promise,
    Date: class extends Date { constructor(...a) { a.length ? super(...a) : super(clock); } static now() { return clock; } },
    location: { hostname: "www.youtube.com" },
    window: { addEventListener() {}, close() { env.closed = true; } },
    document: {
      visibilityState: "visible", documentElement: fakeEl("html"),
      createElement(tag) { const e = fakeEl(tag); created.push(e); return e; },
      getElementById(id) { return (byId[id] = byId[id] || fakeEl(id)); },
      querySelectorAll() { return []; },
    },
    setInterval(fn) { intervals.push(fn); },
    chrome: {
      storage: {
        local: {
          async get(defaults) { return JSON.parse(JSON.stringify({ ...defaults, ...store })); },
          async set(patch) {
            const changes = {};
            for (const k in patch) { store[k] = JSON.parse(JSON.stringify(patch[k])); changes[k] = { newValue: store[k] }; }
            listeners.forEach((fn) => fn(changes));
          },
        },
        onChanged: { addListener(fn) { listeners.push(fn); } },
      },
      tabs: {
        async query() { return [{ id: 1, url: extra.url || "https://www.youtube.com/watch" }]; },
        reload() { env.reloaded = true; },
        create({ url }) { env.opened = url; },
      },
      runtime: { getURL: (file) => `chrome-extension://test/${file}` },
    },
    ...extra.globals,
  };
  env.advance = (ms) => { clock += ms; intervals.forEach((fn) => fn()); };
  env.created = created; env.byId = byId; env.store = store;
  return vm.createContext(env);
}
const load = (env, files) => files.forEach((f) => vm.runInContext(read(f), env, { filename: f }));
const settle = () => new Promise((r) => setImmediate(r));

(async () => {
  // ---------- content.js ----------
  const store = { minutes: 3 };
  const env = makeEnv(store);
  load(env, ["sites.js", "questions.js", "content.js"]);
  await settle();
  const find = (tag, cls) => env.created.filter((e) => e.tag === tag && (!cls || e.className === cls));
  const overlay = find("div", "overlay")[0], pill = find("div", "pill")[0];
  const form = find("form")[0], input = find("input")[0], feedback = find("p", "feedback")[0] || env.created.find((e) => e.tag === "p" && e.className.startsWith("feedback"));
  const spend = find("button", "spend")[0], code = find("pre")[0];
  const fb = () => env.created.find((e) => e.tag === "p" && e.className.startsWith("feedback"));
  assert(overlay && !overlay.hidden && pill.hidden, "locked at start");
  assert(code.textContent.length > 0, "question shown");
  const topicLine = find("p", "topic")[0];
  assert(require(`${ext}/questions.js`).TOPICS.includes(topicLine.textContent), "topic shown: " + topicLine.textContent);

  // answer correctly using the question's own accepted answer
  const current = () => vm.runInContext("typeof __q === 'undefined' ? null : __q", env);
  // expose makeQuestion results by wrapping it
  vm.runInContext("const __orig = makeQuestion; var __q; makeQuestion = (...a) => (__q = __orig(...a));", env);
  form.fire("submit"); // empty input: ignored
  // force a fresh question through the wrapper: answer wrong twice, then next
  input.value = "definitely wrong"; form.fire("submit");
  assert(/Try once more/.test(fb().textContent), "retry offered: " + fb().textContent);
  assert.equal(store.bank || 0, 0);
  input.value = "still wrong"; form.fire("submit");
  assert(/Not quite, /.test(fb().textContent), "answer revealed");
  form.fire("submit"); // next question (now tracked in __q)
  let q = vm.runInContext("__q", env);
  input.value = q.accept[0]; form.fire("submit");
  assert(/Correct, \+3 min/.test(fb().textContent), fb().textContent);
  assert.equal(store.bank, 3);
  const today = Object.keys(store.stats.days)[0];
  assert.deepEqual(store.stats.days[today], [1, 2]);

  // retry that succeeds earns nothing
  form.fire("submit"); q = vm.runInContext("__q", env);
  input.value = "nope"; form.fire("submit");
  input.value = q.accept[0]; form.fire("submit");
  assert(/second try earns no minutes/.test(fb().textContent));
  assert.equal(store.bank, 3);

  // spend the bank: overlay goes, time counts down only while visible
  spend.fire("click");
  assert(overlay.hidden && !pill.hidden, "unlocked after spending");
  assert.equal(store.sessionLeft, 180000);
  for (let i = 0; i < 10; i++) env.advance(1000);
  assert(store.sessionLeft <= 171000 && store.sessionLeft >= 170000, "10s charged: " + store.sessionLeft);
  env.document.visibilityState = "hidden";
  for (let i = 0; i < 60; i++) env.advance(1000);
  assert(store.sessionLeft >= 170000, "hidden tab not charged");
  env.document.visibilityState = "visible";
  for (let i = 0; i < 5; i++) env.advance(1000);
  assert(store.sessionLeft >= 165000 && store.sessionLeft <= 167000, "resumed: " + store.sessionLeft);
  assert(/^2:4\d$/.test(pill.textContent), "pill: " + pill.textContent);
  for (let i = 0; i < 200; i++) env.advance(1000);
  assert.equal(store.sessionLeft, 0);
  assert(!overlay.hidden && pill.hidden, "locked again when time runs out");

  // daily limit: 1 minute cap already exceeded today -> cannot spend
  await env.chrome.storage.local.set({ dailyCap: 1, bank: 6 });
  env.advance(1000);
  assert(spend.disabled && /Daily limit/.test(spend.textContent), "cap reached: " + spend.textContent);
  await env.chrome.storage.local.set({ dailyCap: 0 });
  env.advance(1000);
  assert(!spend.disabled && spend.textContent === "Use 6 min");

  // schedule: a window that excludes the current time opens the site
  const now = new env.Date(), h = now.getHours();
  const hh = (x) => String((x + 24) % 24).padStart(2, "0") + ":00";
  await env.chrome.storage.local.set({ schedule: { on: true, from: hh(h + 2), to: hh(h + 3), weekdays: false } });
  env.advance(1000);
  assert(overlay.hidden && pill.hidden, "outside schedule: open");
  await env.chrome.storage.local.set({ schedule: { on: true, from: hh(h - 1), to: hh(h + 2), weekdays: false } });
  env.advance(1000);
  assert(!overlay.hidden, "inside schedule: gated");

  // harder question pays double
  await env.chrome.storage.local.set({ bank: 0, stats: { ...store.stats, harder: ["NumPy"] }, onlyTopics: ["NumPy"] });
  let paidDouble = false;
  for (let i = 0; i < 200 && !paidDouble; i++) {
    form.fire("submit"); // next
    q = vm.runInContext("__q", env);
    const before = store.bank;
    input.value = q.accept[0]; form.fire("submit");
    assert.equal(store.bank - before, q.level === 2 ? 6 : 3);
    paidDouble = q.level === 2;
  }
  assert(paidDouble, "saw a harder question");
  assert.equal(topicLine.textContent, "NumPy · harder, double minutes");

  // a site not on the list is left alone
  const env2 = makeEnv({});
  env2.location.hostname = "example.com";
  load(env2, ["sites.js", "questions.js", "content.js"]);
  await settle();
  assert.equal(env2.created.length, 0, "no overlay on unlisted site");

  // ---------- popup.js ----------
  const pstore = { minutes: 3, dailyCap: 30, stats: { weights: {}, recent: { Lists: "1101" }, harder: ["Lists"], days: {} } };
  const penv = makeEnv(pstore, { url: "https://www.example.org/page" });
  load(penv, ["sites.js", "questions.js", "popup.js"]);
  await settle();
  const $ = (id) => penv.byId[id];
  assert.equal($("block").textContent, "Block example.org");
  assert(/Banked: 0 min · today: 0 of 0 right · streak: 0 days · used: 0 of 30 min/.test($("summary").textContent), $("summary").textContent);
  assert.equal($("topics").children.length, 12);
  const lists = $("topics").children.find((li) => li.children[0].children[1] === "Lists");
  assert.equal(lists.children[1].textContent, "3/4 · harder on");

  // tightening settings saves at once
  $("minutes").value = "2"; $("cap").value = "20";
  $("save").fire("click"); await settle();
  assert.equal(pstore.minutes, 2); assert.equal(pstore.dailyCap, 20); assert(penv.closed);

  // loosening needs 5 in a row; a miss restarts the count
  const p2 = makeEnv(pstore, { url: "https://www.youtube.com/" });
  load(p2, ["sites.js", "questions.js", "popup.js"]);
  await settle();
  vm.runInContext("const __orig = makeQuestion; var __q; makeQuestion = (...a) => (__q = __orig(...a));", p2);
  const $2 = (id) => p2.byId[id];
  assert.equal($2("block").textContent, "youtube.com is blocked");
  $2("minutes").value = "10";
  $2("save").fire("click"); await settle();
  assert($2("main").hidden && !$2("challenge").hidden, "challenge shown");
  assert.equal(pstore.minutes, 2, "not saved yet");
  const answer = (right) => { $2("challenge-input").value = right ? p2.__q.accept[0] : "wrong!"; $2("challenge-form").fire("submit"); };
  $2("challenge-form").fire("submit"); // empty: ignored
  // first question was asked before the wrapper existed; miss it to move on
  answer(false); assert(/0 of 5/.test($2("challenge-progress").textContent));
  $2("challenge-form").fire("submit"); // next question
  answer(true); answer(true); answer(true); answer(false);
  assert(/0 of 5/.test($2("challenge-progress").textContent));
  $2("challenge-form").fire("submit");
  for (let i = 0; i < 4; i++) answer(true);
  assert.equal(pstore.minutes, 2, "4 in a row is not enough");
  answer(true); await settle();
  assert.equal(pstore.minutes, 10, "saved after 5 in a row");

  // removing a site also needs the challenge
  const p3 = makeEnv(pstore, { url: "https://www.youtube.com/" });
  load(p3, ["sites.js", "questions.js", "popup.js"]);
  await settle();
  const removeBtn = p3.byId["sites"].children[2].children[0]; // youtube.com
  removeBtn.fire("click");
  assert(!p3.byId["challenge"].hidden && /remove youtube.com/.test(p3.byId["challenge-what"].textContent));
  assert(!pstore.sites, "site list untouched");

  // the backup button opens the backup page in a tab
  p3.byId["backup"].fire("click");
  assert.equal(p3.opened, "chrome-extension://test/backup.html");

  // ---------- backup rules (sites.js) ----------
  const { DEFAULTS, makeBackup, restoreBackup } = require(`${ext}/sites.js`);
  const mine = { ...DEFAULTS, sites: ["x.com"], minutes: 3, bank: 40, sessionLeft: 9000, dailyCap: 30 };
  const file = makeBackup({ ...mine, sites: ["x.com", "news.com"], stats: { ...DEFAULTS.stats, harder: ["Lists"] } });
  assert(!("bank" in file) && !("sessionLeft" in file), "a backup holds no minutes");

  // same settings: everything is restored, and sites are merged
  let restored = restoreBackup({ ...mine, sites: ["x.com", "extra.com"] }, file);
  assert(restored.keptSettings);
  assert.deepEqual(restored.patch.sites, ["x.com", "extra.com", "news.com"]);
  assert.deepEqual(restored.patch.stats.harder, ["Lists"]);
  assert(!("bank" in restored.patch));

  // looser settings in the file are not applied, but progress still is
  restored = restoreBackup(mine, { ...file, minutes: 20, dailyCap: 0 });
  assert(!restored.keptSettings && !("minutes" in restored.patch) && !("dailyCap" in restored.patch));
  assert.deepEqual(restored.patch.stats.harder, ["Lists"]);

  // tighter settings are applied; junk values fall back to the current ones
  restored = restoreBackup(mine, { ...file, minutes: 2, dailyCap: "lots", schedule: { on: true, from: "25:99", to: "18:00" } });
  assert(!restored.keptSettings, "turning a schedule on loosens an always-on gate");
  restored = restoreBackup(mine, { ...file, minutes: 2, dailyCap: "lots" });
  assert(restored.keptSettings && restored.patch.minutes === 2 && restored.patch.dailyCap === 30);

  // files that are not backups are refused
  for (const junk of [null, [], "text", {}, { app: "other" }]) assert.equal(restoreBackup(mine, junk), null);

  console.log("smoke test passed");
})().catch((err) => { console.error(err); process.exit(1); });
