// Toolbar popup: block the current site, change settings, choose topics, see
// progress and manage the block list.

const $ = (id) => document.getElementById(id);
const STREAK_NEEDED = 3; // correct answers in a row needed to loosen the gate

let state;

// Shows a short quiz in place of the popup. `apply` runs only after
// STREAK_NEEDED correct answers in a row. As in the main quiz, each question
// allows a second try; two misses on one question restart the count.
function challenge(what, apply) {
  let run = 0, question, phase; // phase: "ask" (first try), "retry" (second try) or "shown" (answer revealed)
  $("main").hidden = true;
  $("challenge").hidden = false;
  $("challenge-what").textContent = `To ${what}.`;

  const ask = () => {
    question = makeQuestion(state.onlyTopics, state.stats.weights, state.stats.harder);
    phase = "ask";
    $("challenge-prompt").textContent = promptFor(question);
    $("challenge-code").textContent = question.code;
    $("challenge-input").value = "";
    $("challenge-feedback").textContent = "";
    $("challenge-submit").textContent = "Check";
    $("challenge-progress").textContent = `${run} of ${STREAK_NEEDED} in a row`;
    $("challenge-input").focus();
  };

  $("challenge-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (phase === "shown") return ask();
    if (!$("challenge-input").value.trim()) return;

    if (isCorrect($("challenge-input").value, question.accept)) {
      run++;
      return run === STREAK_NEEDED ? apply() : ask();
    }
    if (phase === "ask") {
      phase = "retry";
      $("challenge-feedback").textContent = "Not quite. Try once more.";
      return $("challenge-input").select();
    }
    run = 0;
    phase = "shown";
    $("challenge-feedback").textContent = `Not quite, ${answerLabel(question)}: ${question.answer}\nThe count restarts.`;
    $("challenge-submit").textContent = "Next question";
    $("challenge-progress").textContent = `0 of ${STREAK_NEEDED} in a row`;
  });

  $("challenge-cancel").addEventListener("click", () => window.close());
  ask();
}

function showSummary() {
  const [right, total] = state.stats.days[dayKey()] || [0, 0];
  const days = streak(state.stats.days);
  const session = state.sessionEnd - Date.now(), wait = session + state.cooldown * 60000;
  const clock = (ms) => `${Math.floor(Math.ceil(ms / 1000) / 60)}:${String(Math.ceil(ms / 1000) % 60).padStart(2, "0")}`;
  const parts = [session > 0 ? `Session: ${clock(session)} left` : wait > 0 ? `Next session in ${clock(wait)}` : "No session running"];
  parts.push(`today: ${right} of ${total} right`, `streak: ${days} ${days === 1 ? "day" : "days"}`);
  if (state.dailyCap) parts.push(`used: ${Math.floor(usedToday(state.used) / 60000)} of ${state.dailyCap} min`);
  $("summary").textContent = parts.join(" · ");
  $("end").hidden = session <= 0;
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state = await loadState();
  const { sites, stats, schedule } = state;

  // ---- summary line, kept current while the popup is open ----
  showSummary();
  chrome.storage.onChanged.addListener((changes) => {
    for (const key in changes) state[key] = changes[key].newValue;
    showSummary();
  });
  setInterval(showSummary, 1000);

  // Ending early starts the cooldown now and gives the unused time back to the daily limit.
  $("end").addEventListener("click", () => {
    const unused = Math.max(0, state.sessionEnd - Date.now());
    chrome.storage.local.set({
      sessionEnd: Date.now(),
      used: { day: dayKey(), ms: Math.max(0, usedToday(state.used) - unused) },
    });
  });

  // ---- block the current site ----
  // Only ordinary web pages can be blocked, not chrome:// pages or local files.
  const url = tab && tab.url && tab.url.startsWith("http") ? new URL(tab.url) : null;
  const site = url ? url.hostname.replace(/^www\./, "") : null;

  // The quiz decides whether to run when a page loads, so reload to apply a change.
  const saveSites = async (newSites, reload) => {
    await chrome.storage.local.set({ sites: newSites });
    if (reload) chrome.tabs.reload(tab.id);
    window.close();
  };

  if (!site) {
    $("block").textContent = "This page cannot be blocked";
    $("block").disabled = true;
  } else if (matchesSite(url.hostname, sites)) {
    $("block").textContent = `${site} is blocked`;
    $("block").disabled = true;
  } else {
    $("block").textContent = `Block ${site}`;
    $("block").addEventListener("click", () => saveSites([...sites, site], true));
  }

  // ---- settings: saved together, behind a challenge if they loosen the gate ----
  $("minutes").value = state.minutes;
  $("cooldown").value = state.cooldown;
  $("cap").value = state.dailyCap;
  $("schedule-on").checked = schedule.on;
  $("from").value = schedule.from;
  $("to").value = schedule.to;
  $("weekdays").checked = schedule.weekdays;

  const whole = (input, low, high, fallback) =>
    Math.min(high, Math.max(low, Math.round(Number(input.value)) || fallback));

  $("save").addEventListener("click", () => {
    const next = {
      minutes: whole($("minutes"), 1, 60, DEFAULTS.minutes),
      cooldown: whole($("cooldown"), 0, 240, 0),
      dailyCap: whole($("cap"), 0, 600, 0),
      schedule: {
        on: $("schedule-on").checked,
        from: $("from").value || DEFAULTS.schedule.from,
        to: $("to").value || DEFAULTS.schedule.to,
        weekdays: $("weekdays").checked,
      },
    };
    const apply = async () => {
      await chrome.storage.local.set(next);
      window.close();
    };
    if (loosensSettings(state, next)) challenge("save looser settings", apply);
    else apply();
  });

  // ---- topics: tick some to practise only those, and see recent scores ----
  let only = state.onlyTopics.filter((topic) => TOPICS.includes(topic));
  for (const topic of TOPICS) {
    const item = document.createElement("li");
    const label = document.createElement("label");
    const box = document.createElement("input");
    const score = document.createElement("span");
    const recent = stats.recent[topic] || "";
    const hits = recent.split("1").length - 1;

    box.type = "checkbox";
    box.checked = only.includes(topic);
    box.addEventListener("change", () => {
      only = box.checked ? [...only, topic] : only.filter((t) => t !== topic);
      chrome.storage.local.set({ onlyTopics: only });
    });

    score.className = "score";
    score.textContent = (recent ? `${hits}/${recent.length}` : "no answers yet")
      + (stats.harder.includes(topic) ? " · harder on" : "");
    label.append(box, topic);
    item.append(label, score);
    $("topics").append(item);
  }

  // Two clicks, so progress is not wiped by accident.
  $("reset").addEventListener("click", async () => {
    if ($("reset").textContent === "Reset progress") return ($("reset").textContent = "Click again to confirm");
    await chrome.storage.local.set({ stats: DEFAULTS.stats });
    window.close();
  });

  // ---- blocked sites: removing one loosens the gate ----
  for (const entry of sites) {
    const item = document.createElement("li");
    const remove = document.createElement("button");
    item.textContent = entry;
    remove.textContent = "Remove";
    remove.addEventListener("click", () =>
      challenge(`remove ${entry}`, () => saveSites(sites.filter((s) => s !== entry), url && matchesSite(url.hostname, [entry]))));
    item.append(remove);
    $("sites").append(item);
  }

  // ---- backup: opens in a tab, because a popup closes when a file dialog opens ----
  $("backup").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("backup.html") });
    window.close();
  });
}

main();
