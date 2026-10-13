// Stored settings and small helpers shared by the quiz (content.js) and the
// toolbar popup (popup.js).

const DEFAULT_SITES = ["x.com", "twitter.com", "youtube.com", "uol.com.br", "reddit.com"];

// Everything the extension keeps in Chrome's local storage, with starting values.
const DEFAULTS = {
  sites: DEFAULT_SITES,
  minutes: 5,        // session minutes bought by each correct answer
  cooldown: 25,      // minutes the sites stay locked after a session; 0 means none
  sessionEnd: 0,     // time (ms) when the current or last session ends
  used: { day: "", ms: 0 },  // session time started on that day, for the daily limit
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

// True when the settings in `next` are looser than in `prev`: more minutes per
// answer, a shorter cooldown, a higher or removed daily limit, or fewer gated hours.
const loosensSettings = (prev, next) =>
  next.minutes > prev.minutes
  || next.cooldown < prev.cooldown
  || (prev.dailyCap > 0 && (next.dailyCap === 0 || next.dailyCap > prev.dailyCap))
  || loosensSchedule(prev.schedule, next.schedule);

// What a backup file holds. The running session and the time used today are
// left out on purpose, so restoring a backup can never hand back minutes.
const makeBackup = (state) => ({
  app: "python-gate",
  saved: dayKey(),
  sites: state.sites,
  minutes: state.minutes,
  cooldown: state.cooldown,
  dailyCap: state.dailyCap,
  schedule: state.schedule,
  onlyTopics: state.onlyTopics,
  stats: state.stats,
});

// Works out what to store when restoring `backup` over the current `state`.
// - progress and ticked topics are replaced
// - sites are added to the list, never removed
// - settings are taken only if they do not loosen the gate (see keptSettings)
// Returns null if the file is not a Python Gate backup.
function restoreBackup(state, backup) {
  const isObject = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
  const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  const whole = (v, low, high, fallback) => (Number.isInteger(v) && v >= low && v <= high ? v : fallback);
  const time = (v, fallback) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback);
  if (!isObject(backup) || backup.app !== "python-gate") return null;

  const schedule = isObject(backup.schedule) ? backup.schedule : {};
  const settings = {
    minutes: whole(backup.minutes, 1, 60, state.minutes),
    cooldown: whole(backup.cooldown, 0, 240, state.cooldown),
    dailyCap: whole(backup.dailyCap, 0, 600, state.dailyCap),
    schedule: {
      on: schedule.on === true,
      from: time(schedule.from, state.schedule.from),
      to: time(schedule.to, state.schedule.to),
      weekdays: schedule.weekdays === true,
    },
  };
  const stats = isObject(backup.stats) ? backup.stats : {};
  const keptSettings = !loosensSettings(state, settings);
  return {
    keptSettings,
    patch: {
      ...(keptSettings ? settings : {}),
      sites: [...new Set([...state.sites, ...strings(backup.sites)])],
      onlyTopics: strings(backup.onlyTopics),
      stats: {
        weights: isObject(stats.weights) ? stats.weights : {},
        recent: isObject(stats.recent) ? stats.recent : {},
        harder: strings(stats.harder),
        days: isObject(stats.days) ? stats.days : {},
      },
    },
  };
}

// Lets the test scripts load this file in Node. Chrome ignores it.
if (typeof module !== "undefined") {
  module.exports = {
    DEFAULT_SITES, DEFAULTS, matchesSite, dayKey, usedToday, streak, gatedAt, gatedNow,
    loosensSchedule, loosensSettings, makeBackup, restoreBackup,
  };
}
