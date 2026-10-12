// Stored settings and small helpers shared by the quiz (content.js) and the
// toolbar popup (popup.js).

const DEFAULT_SITES = ["x.com", "twitter.com", "youtube.com", "uol.com.br", "reddit.com"];

// Everything the extension keeps in Chrome's local storage, with starting values.
const DEFAULTS = {
  sites: DEFAULT_SITES,
  minutes: 3,        // minutes earned per correct answer
  bank: 0,           // minutes earned and not yet spent
  sessionLeft: 0,    // ms of unlocked browsing left
  tickAt: 0,         // when sessionLeft was last counted down
  used: { day: "", ms: 0 },  // browsing time spent on that day, for the daily limit
  dailyCap: 0,       // most minutes of browsing per day; 0 means no limit
  schedule: { on: false, from: "09:00", to: "18:00", weekdays: false },  // off means always gated
  onlyTopics: [],    // topics ticked in the popup; empty means all topics
  stats: {
    weights: {},     // question type id -> how often it comes up (1 is normal)
    recent: {},      // topic -> last 20 results as a string of 1s and 0s
    harder: [],      // topics whose harder questions are unlocked
    days: {},        // date -> [right answers, total answers]
  },
};

// Reads the stored state. Nested objects are topped up with defaults, so data
// saved by an older version still has every field.
async function loadState() {
  const state = await chrome.storage.local.get(DEFAULTS);
  state.stats = { ...DEFAULTS.stats, ...state.stats };
  state.schedule = { ...DEFAULTS.schedule, ...state.schedule };
  return state;
}

// "www.youtube.com" and "m.youtube.com" both match the entry "youtube.com".
const matchesSite = (hostname, sites) =>
  sites.some((site) => hostname === site || hostname.endsWith("." + site));

// Local date as YYYY-MM-DD.
const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Browsing time spent today, in ms. Yesterday's total does not carry over.
const usedToday = (used) => (used.day === dayKey() ? used.ms : 0);

// Days in a row with at least one answer. Today counts once you have answered.
function streak(days) {
  const date = new Date();
  if (!days[dayKey(date)]) date.setDate(date.getDate() - 1);
  let count = 0;
  while (days[dayKey(date)]) {
    count++;
    date.setDate(date.getDate() - 1);
  }
  return count;
}

// Is the gate on at this moment of the week? day is 0 (Sunday) to 6, minute is
// minutes since midnight. A window such as 22:00 to 06:00 runs past midnight.
function gatedAt(schedule, day, minute) {
  if (!schedule.on) return true;
  if (schedule.weekdays && (day === 0 || day === 6)) return false;
  const [from, to] = [schedule.from, schedule.to].map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));
  return from <= to ? minute >= from && minute < to : minute >= from || minute < to;
}
const gatedNow = (schedule, now = new Date()) =>
  gatedAt(schedule, now.getDay(), now.getHours() * 60 + now.getMinutes());

// True when `next` opens up some moment of the week that `prev` keeps gated.
function loosensSchedule(prev, next) {
  for (let day = 0; day < 7; day++) {
    for (let minute = 0; minute < 1440; minute++) {
      if (gatedAt(prev, day, minute) && !gatedAt(next, day, minute)) return true;
    }
  }
  return false;
}

// Lets the test script load this file in Node. Chrome ignores it.
if (typeof module !== "undefined") {
  module.exports = { DEFAULT_SITES, DEFAULTS, matchesSite, dayKey, usedToday, streak, gatedAt, gatedNow, loosensSchedule };
}
