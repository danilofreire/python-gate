// Runs the quiz (content.js) and the popup (popup.js) against a fake page and a
// fake chrome.storage, and checks the behaviour end to end: choosing a session,
// retry, countdown, cooldown, daily limit, schedule, harder questions, the
// toolbar badge, the 5-in-a-row challenge and backups. Needs only Node. Run from anywhere: node tests/smoke_test.js
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
    replaceChildren(...kids) { e.children = kids; },
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
      visibilityState: "visible", documentElement: fakeEl("html"), addEventListener() {},
      createElement(tag) { const e = fakeEl(tag); created.push(e); return e; },
      getElementById(id) { return (byId[id] = byId[id] || fakeEl(id)); },
      querySelectorAll() { return []; },
    },
    setInterval(fn) { intervals.push(fn); return fn; },
    clearInterval(fn) { intervals = intervals.filter((f) => f !== fn); },
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
      runtime: {
        id: "test",
        getURL: (file) => `chrome-extension://test/${file}`,
        sendMessage(message) { env.badges.push(message); return Promise.resolve(); },
      },
    },
    ...extra.globals,
  };
  env.advance = (ms) => { clock += ms; intervals.forEach((fn) => fn()); };
  env.created = created; env.byId = byId; env.store = store; env.badges = [];
  return vm.createContext(env);
}
const load = (env, files) => files.forEach((f) => vm.runInContext(read(f), env, { filename: f }));
const settle = () => new Promise((r) => setImmediate(r));

(async () => {
  // ---------- content.js ----------
  const store = { minutes: 3 };
  const env = makeEnv(store);
  load(env, ["sites.js", "questions.js", "content.js"]);
  // remember the last question asked, so the test can answer it correctly
  vm.runInContext("const __orig = makeQuestion; var __q; makeQuestion = (...a) => (__q = __orig(...a));", env);
  await settle();
  const find = (tag, cls) => env.created.filter((e) => e.tag === tag && (!cls || e.className === cls));
  const overlay = find("div", "overlay")[0], pill = find("div", "pill")[0];
  const [, chooseView, quizView, messageView] = find("div", "card")[0].children;
  const choiceButtons = find("div", "choices")[0].children;
  const form = find("form")[0], input = find("input")[0], submit = form.children[1];
  const progress = find("div", "footer")[0].children[0], back = find("button", "back")[0];
  const topicLine = find("p", "topic")[0];
  const fb = () => env.created.find((e) => e.tag === "p" && e.className.startsWith("feedback"));
  const asked = () => vm.runInContext("__q", env);
  const answer = (right) => { input.value = right ? asked().accept[0] : "definitely wrong"; form.fire("submit"); };
  const tick = (seconds) => { for (let i = 0; i < seconds; i++) env.advance(1000); };

  // a visit starts with the choice of a session length
  assert(!overlay.hidden && pill.hidden, "locked at start");
  assert(!chooseView.hidden && quizView.hidden && messageView.hidden, "chooser shown first");
  assert.deepEqual(choiceButtons.map((b) => b.textContent),
    ["3 min for 1 answer", "6 min for 2 answers", "9 min for 3 answers", "12 min for 4 answers", "15 min for 5 answers"]);

  // choosing 6 minutes asks for 2 correct answers
  choiceButtons[1].fire("click");
  assert(chooseView.hidden && !quizView.hidden, "quiz shown after choosing");
  assert(require(`${ext}/questions.js`).TOPICS.includes(topicLine.textContent), "topic shown: " + topicLine.textContent);
  assert.equal(progress.textContent, "0 of 2 correct");
  form.fire("submit"); // empty input: ignored

  // a miss gives one retry, then the answer; two misses do not count
  answer(false);
  assert(/Try once more/.test(fb().textContent), "retry offered: " + fb().textContent);
  answer(false);
  assert(/Not quite, /.test(fb().textContent), "answer revealed");
  assert.equal(progress.textContent, "0 of 2 correct");
  form.fire("submit"); // next question

  answer(true);
  assert(/^Correct\. /.test(fb().textContent), fb().textContent);
  assert.equal(progress.textContent, "1 of 2 correct");
  assert.equal(submit.textContent, "Next question");
  const today = Object.keys(store.stats.days)[0];
  assert.deepEqual(store.stats.days[today], [1, 2]);

  // a retry that succeeds counts towards the session, but the score records the miss
  form.fire("submit");
  answer(false);
  assert(!store.sessionEnd && submit.textContent === "Check", "nothing yet after the miss");
  answer(true);
  assert(/^Correct on the second try\. /.test(fb().textContent), fb().textContent);
  assert.equal(progress.textContent, "2 of 2 correct");
  assert.deepEqual(store.stats.days[today], [1, 3], "first tries: 1 right out of 3");

  // the last answer offers the session, and nothing is unlocked before that
  assert.equal(submit.textContent, "Start 6 min session");
  assert(!store.sessionEnd && !overlay.hidden, "not unlocked yet");
  form.fire("submit");
  assert(overlay.hidden && !pill.hidden, "unlocked");
  assert.equal(pill.textContent, "6:00");

  // the session runs on the clock, whether or not the tab is on screen
  tick(10);
  assert.equal(pill.textContent, "5:50");
  env.document.visibilityState = "hidden";
  tick(60);
  env.document.visibilityState = "visible";
  tick(1);
  assert.equal(pill.textContent, "4:49", "hidden time still counts");

  // when it ends, the sites lock for the cooldown and no quiz is offered
  tick(289);
  assert(!overlay.hidden && pill.hidden, "locked when the session ends");
  assert(!messageView.hidden && chooseView.hidden && quizView.hidden, "cooldown message only");
  assert(/^You can start another one in (30:00|29:5\d)\.$/.test(messageView.children[1].textContent), messageView.children[1].textContent);
  tick(900);
  assert(!messageView.hidden, "still waiting after 15 minutes");
  tick(901);
  assert(messageView.hidden && !chooseView.hidden, "chooser returns after the cooldown");

  // "Choose another length" drops the progress
  choiceButtons[0].fire("click");
  assert(!quizView.hidden);
  back.fire("click");
  assert(!chooseView.hidden && quizView.hidden);

  // daily limit: the 6 minutes above count, and lengths that do not fit are disabled
  await env.chrome.storage.local.set({ dailyCap: 7 });
  assert(!messageView.hidden && /Daily limit reached/.test(messageView.children[0].textContent), "1 minute left is too little");
  await env.chrome.storage.local.set({ dailyCap: 10 });
  assert(!chooseView.hidden && !choiceButtons[0].disabled && choiceButtons[1].disabled, "only 3 minutes fit in the 4 left");
  await env.chrome.storage.local.set({ dailyCap: 0 });
  assert(!choiceButtons[4].disabled);

  // with no cooldown, the chooser returns as soon as a session ends
  await env.chrome.storage.local.set({ cooldown: 0 });
  choiceButtons[0].fire("click");
  while (submit.textContent !== "Start 3 min session") { answer(true); if (submit.textContent === "Next question") form.fire("submit"); }
  form.fire("submit");
  assert(overlay.hidden);
  tick(181);
  assert(!overlay.hidden && !chooseView.hidden && messageView.hidden, "no wait when cooldown is 0");
  await env.chrome.storage.local.set({ cooldown: 30 });
  tick(1800);

  // schedule: a window that excludes the current time opens the site
  const now = new env.Date(), h = now.getHours();
  const hh = (x) => String((x + 24) % 24).padStart(2, "0") + ":00";
  await env.chrome.storage.local.set({ schedule: { on: true, from: hh(h + 2), to: hh(h + 3), weekdays: false } });
  env.advance(1000);
  assert(overlay.hidden && pill.hidden, "outside schedule: open");
  await env.chrome.storage.local.set({ schedule: { on: true, from: hh(h - 1), to: hh(h + 2), weekdays: false } });
  env.advance(1000);
  assert(!overlay.hidden, "inside schedule: gated");

  // a harder question counts as two answers
  await env.chrome.storage.local.set({ stats: { ...store.stats, harder: ["NumPy"] }, onlyTopics: ["NumPy"] });
  const count = () => Number(progress.textContent.split(" ")[0]);
  choiceButtons[4].fire("click");
  let sawHarder = false;
  for (let i = 0; i < 400 && !sawHarder; i++) {
    const before = count();
    if (before >= 3) { back.fire("click"); choiceButtons[4].fire("click"); continue; }
    const level = asked().level;
    answer(true);
    assert.equal(count() - before, level);
    sawHarder = level === 2;
    if (!sawHarder) form.fire("submit");
  }
  assert(sawHarder, "saw a harder question");
  assert.equal(topicLine.textContent, "NumPy · harder, counts double");

  // after the extension reloads, the old script stops and asks for a refresh
  const sent = env.badges.length;
  delete env.chrome.runtime.id;
  env.chrome.runtime.sendMessage = () => { throw new Error("Extension context invalidated."); };
  tick(5);
  const card = find("div", "card")[0];
  assert.equal(card.children[0].textContent, "Python Gate was updated");
  assert.equal(card.children[1].textContent, "Refresh this page to continue.");
  assert.equal(env.badges.length, sent, "no more calls to Chrome");

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
  assert.equal($("summary").textContent, "No session running · today: 0 of 0 right · streak: 0 days · used: 0 of 30 min");
  assert($("end").hidden, "nothing to end");
  assert.equal($("topics").children.length, 12);
  const lists = $("topics").children.find((li) => li.children[0].children[1] === "Lists");
  assert.equal(lists.children[1].textContent, "3/4 · harder on");

  // a running session shows in the summary, and can be ended early
  const pnow = vm.runInContext("Date.now()", penv);
  await penv.chrome.storage.local.set({ sessionEnd: pnow + 155000, used: { day: vm.runInContext("dayKey()", penv), ms: 360000 } });
  assert(/^Session: 2:35 left · today/.test($("summary").textContent), $("summary").textContent);
  assert(!$("end").hidden);
  $("end").fire("click"); await settle();
  assert.equal(pstore.sessionEnd, pnow, "session ended now");
  assert.equal(pstore.used.ms, 360000 - 155000, "unused time returned to the daily limit");
  assert(/^Next session in 30:00 · today/.test($("summary").textContent), $("summary").textContent);
  assert($("end").hidden);

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
  const reply = (right) => { $2("challenge-input").value = right ? p2.__q.accept[0] : "wrong!"; $2("challenge-form").fire("submit"); };
  $2("challenge-form").fire("submit"); // empty: ignored
  // first question was asked before the wrapper existed; miss it to move on
  reply(false); assert(/0 of 5/.test($2("challenge-progress").textContent));
  $2("challenge-form").fire("submit"); // next question
  reply(true); reply(true); reply(true); reply(false);
  assert(/0 of 5/.test($2("challenge-progress").textContent));
  $2("challenge-form").fire("submit");
  for (let i = 0; i < 4; i++) reply(true);
  assert.equal(pstore.minutes, 2, "4 in a row is not enough");
  reply(true); await settle();
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
  const mine = { ...DEFAULTS, sites: ["x.com"], minutes: 3, sessionEnd: 9000, dailyCap: 30 };
  const file = makeBackup({ ...mine, sites: ["x.com", "news.com"], stats: { ...DEFAULTS.stats, harder: ["Lists"] } });
  assert(!("sessionEnd" in file) && !("used" in file), "a backup holds no session or usage");

  // same settings: everything is restored, and sites are merged
  let restored = restoreBackup({ ...mine, sites: ["x.com", "extra.com"] }, file);
  assert(restored.keptSettings);
  assert.deepEqual(restored.patch.sites, ["x.com", "extra.com", "news.com"]);
  assert.deepEqual(restored.patch.stats.harder, ["Lists"]);
  assert(!("sessionEnd" in restored.patch) && !("used" in restored.patch));

  // looser settings in the file are not applied, but progress still is
  restored = restoreBackup(mine, { ...file, minutes: 20, dailyCap: 0 });
  assert(!restored.keptSettings && !("minutes" in restored.patch) && !("dailyCap" in restored.patch));
  assert.deepEqual(restored.patch.stats.harder, ["Lists"]);

  // a shorter cooldown is looser too
  assert(!restoreBackup(mine, { ...file, cooldown: 5 }).keptSettings);
  assert(restoreBackup(mine, { ...file, cooldown: 60 }).patch.cooldown === 60);

  // tighter settings are applied; junk values fall back to the current ones
  restored = restoreBackup(mine, { ...file, minutes: 2, dailyCap: "lots", schedule: { on: true, from: "25:99", to: "18:00" } });
  assert(!restored.keptSettings, "turning a schedule on loosens an always-on gate");
  restored = restoreBackup(mine, { ...file, minutes: 2, dailyCap: "lots" });
  assert(restored.keptSettings && restored.patch.minutes === 2 && restored.patch.dailyCap === 30);

  // files that are not backups are refused
  for (const junk of [null, [], "text", {}, { app: "other" }]) assert.equal(restoreBackup(mine, junk), null);

  // ---------- toolbar badge (background.js) ----------
  // the quiz reported the right badge at each stage (see env.badges)
  const texts = env.badges.map((m) => `${m.badge}:${m.kind}`);
  assert.equal(texts[0], ":", "no badge before a session");
  assert(texts.includes("6:session") && texts.includes("1:session"), "session minutes, counting down");
  assert(texts.includes("30:wait") && texts.includes("1:wait"), "cooldown minutes, counting down");
  assert.equal(env2.badges.length, 0, "unlisted sites never set a badge");

  // the background script applies a report to the sending tab only
  const calls = [];
  let onMessage;
  const benv = vm.createContext({ chrome: {
    runtime: { onMessage: { addListener: (fn) => (onMessage = fn) }, onInstalled: { addListener() {} } },
    action: {
      setBadgeText: (o) => calls.push(o),
      setBadgeBackgroundColor: (o) => calls.push(o),
      setBadgeTextColor() {},
    },
  } });
  vm.runInContext(read("background.js"), benv);
  onMessage({ badge: "6", kind: "session" }, { tab: { id: 7 } });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ tabId: 7, text: "6" }, { tabId: 7, color: "#4b8bbe" }]);
  onMessage({ badge: "2", kind: "wait" }, {}); // not from a tab: ignored
  assert.equal(calls.length, 2);

  console.log("smoke test passed");
})().catch((err) => { console.error(err); process.exit(1); });
