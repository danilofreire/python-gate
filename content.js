// Covers blocked sites with a Python quiz until you have earned browsing time.
// Each correct answer banks minutes; "Use minutes" turns the bank into a
// session that counts down only while a blocked tab is on screen.

const CSS = `
  [hidden] { display: none !important; }
  .overlay {
    position: fixed; inset: 0; z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    background: #14161a; color: #e8e6e3;
    font: 16px/1.5 -apple-system, "Segoe UI", sans-serif;
  }
  .card { width: min(560px, 90vw); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .rule { margin: 0 0 20px; color: #9aa0a6; }
  .topic { margin: 0 0 2px; color: #9aa0a6; font-size: 13px; }
  .prompt { margin: 0 0 8px; font-weight: 600; }
  pre {
    margin: 0 0 16px; padding: 16px; border-radius: 8px; overflow-x: auto;
    background: #1f2329; font: 15px/1.5 Menlo, Consolas, monospace;
  }
  form { display: flex; gap: 8px; }
  input {
    flex: 1; padding: 10px 12px; border-radius: 8px; border: 1px solid #3a3f47;
    background: #1f2329; color: inherit; font: 15px Menlo, Consolas, monospace;
  }
  input:focus { outline: 2px solid #4b8bbe; border-color: transparent; }
  button {
    padding: 10px 16px; border: 0; border-radius: 8px; cursor: pointer;
    background: #4b8bbe; color: #fff; font: inherit; font-weight: 600;
  }
  button:disabled { opacity: 0.4; cursor: default; }
  .feedback { min-height: 48px; margin: 12px 0 0; white-space: pre-line; }
  .ok { color: #7bd88f; }
  .bad { color: #ff8f8f; }
  .footer {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 20px; padding-top: 16px; border-top: 1px solid #2a2e35;
  }
  .spend { background: #ffd43b; color: #14161a; }
  .pill {
    position: fixed; right: 12px; bottom: 12px; z-index: 2147483647;
    padding: 4px 10px; border-radius: 999px; pointer-events: none;
    background: #14161a; color: #ffd43b; font: 12px Menlo, Consolas, monospace;
  }
`;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

function start(saved) {
  // A shadow root keeps the page's CSS out of the quiz and ours out of the page.
  const host = el("div");
  const shadow = host.attachShadow({ mode: "closed" });
  const style = el("style", "", CSS);

  const overlay = el("div", "overlay");
  const card = el("div", "card");
  const rule = el("p", "rule");
  const topicLine = el("p", "topic");
  const prompt = el("p", "prompt");
  const code = el("pre");
  const form = el("form");
  const input = el("input");
  const submit = el("button", "", "Check");
  const feedback = el("p", "feedback");
  const footer = el("div", "footer");
  const bankLabel = el("span");
  const spend = el("button", "spend");
  const pill = el("div", "pill");

  input.placeholder = "Your answer";
  input.autocomplete = "off";
  input.spellcheck = false;
  spend.type = "button";
  overlay.hidden = pill.hidden = true;

  form.append(input, submit);
  footer.append(bankLabel, spend);
  card.append(el("h1", "", "Earn your browsing time"), rule, topicLine, prompt, code, form, feedback, footer);
  overlay.append(card);
  shadow.append(style, overlay, pill);
  document.documentElement.append(host);

  let state = saved;
  let question = null;
  let phase = "ask"; // "ask" (first try), "retry" (second try) or "done"

  // Harder questions are worth double.
  const reward = () => state.minutes * question.level;

  // Browsing time still allowed today, in ms. No daily limit means no ceiling.
  const capLeft = () =>
    state.dailyCap ? Math.max(0, state.dailyCap * 60000 - usedToday(state.used)) : Infinity;

  const browsing = () => state.sessionLeft > 0 && capLeft() > 0;

  // Saves a change and applies it here at once, without waiting for storage to echo it back.
  const save = (patch) => {
    Object.assign(state, patch);
    chrome.storage.local.set(patch);
  };

  function nextQuestion() {
    question = makeQuestion(state.onlyTopics, state.stats.weights, state.stats.harder);
    phase = "ask";
    topicLine.textContent = question.topic + (question.level === 2 ? " · harder, double minutes" : "");
    prompt.textContent = promptFor(question);
    code.textContent = question.code;
    input.value = "";
    input.readOnly = false;
    submit.textContent = "Check";
    feedback.textContent = "";
    input.focus();
  }

  function finish(className, text) {
    phase = "done";
    input.readOnly = true;
    submit.textContent = "Next question";
    feedback.className = "feedback " + className;
    feedback.textContent = text;
  }

  // Runs every second. The session only counts down while this tab is on
  // screen. A gap of more than 2 seconds since the last count means no blocked
  // tab was being watched, so that time is not charged.
  function tick() {
    if (!gatedNow(state.schedule) || !browsing() || document.visibilityState !== "visible") return;
    const now = Date.now(), gap = now - state.tickAt;
    const spent = gap > 0 && gap < 2000 ? gap : 0;
    save({
      sessionLeft: Math.max(0, state.sessionLeft - spent),
      tickAt: now,
      used: { day: dayKey(), ms: usedToday(state.used) + spent },
    });
  }

  function render() {
    // Outside the scheduled hours the site is simply open.
    if (!gatedNow(state.schedule)) return (overlay.hidden = pill.hidden = true);

    overlay.hidden = browsing();
    pill.hidden = !browsing();

    if (browsing()) {
      question = null;
      const s = Math.ceil(Math.min(state.sessionLeft, capLeft()) / 1000);
      pill.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    } else {
      // Otherwise a YouTube video keeps playing behind the quiz.
      document.querySelectorAll("video").forEach((video) => video.pause());
      const capped = capLeft() === 0;
      rule.textContent = `Each correct answer banks ${state.minutes} min.`;
      bankLabel.textContent = `Banked: ${state.bank} min`;
      spend.textContent = capped ? "Daily limit reached" : `Use ${state.bank} min`;
      spend.disabled = capped || state.bank === 0;
      if (!question) nextQuestion();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (phase === "done") return nextQuestion();
    if (!input.value.trim()) return;

    const correct = isCorrect(input.value, question.accept);
    const reveal = `Not quite, ${answerLabel(question)}: ${question.answer}\n${question.why}`;

    if (phase === "retry") {
      return correct ? finish("ok", `Right this time, but a second try earns no minutes. ${question.why}`) : finish("bad", reveal);
    }

    // Only the first try counts for progress and minutes.
    const stats = recordAnswer(state.stats, question, correct, dayKey());
    const unlocked = stats.harder.length > state.stats.harder.length
      ? `\nHarder ${question.topic} questions are now unlocked.` : "";

    if (correct) {
      finish("ok", `Correct, +${reward()} min. ${question.why}${unlocked}`);
      save({ stats, bank: state.bank + reward() });
    } else {
      save({ stats });
      phase = "retry";
      feedback.className = "feedback bad";
      feedback.textContent = "Not quite. Try once more before you see the answer.";
      input.select();
    }
  });

  spend.addEventListener("click", () => {
    save({ bank: 0, sessionLeft: state.sessionLeft + state.bank * 60000, tickAt: Date.now() });
    render();
  });

  // Stop the page's keyboard shortcuts from firing while you type an answer.
  for (const type of ["keydown", "keypress", "keyup"]) {
    window.addEventListener(type, (event) => {
      if (!overlay.hidden) event.stopPropagation();
    }, true);
  }

  // Storage is shared, so every gated tab locks and unlocks together.
  chrome.storage.onChanged.addListener((changes) => {
    for (const key in changes) state[key] = changes[key].newValue;
    render();
  });

  render();
  setInterval(() => {
    tick();
    render();
  }, 1000);
}

// The script loads on every page but only acts on sites in the block list.
loadState().then((saved) => {
  if (matchesSite(location.hostname, saved.sites)) start(saved);
});
