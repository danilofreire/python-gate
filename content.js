// Covers blocked sites with a Python quiz. On each visit you choose a session
// length, answer the questions it costs, and get exactly that session. The
// session runs on the clock, unused time is lost, and a cooldown follows it.

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
  .big { margin: 20px 0 4px; font-size: 18px; font-weight: 600; }
  .note { margin: 0; color: #9aa0a6; }
  .choices { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 16px; }
  .choices button { flex: 1; white-space: nowrap; }
  .back { background: #2a2e35; color: #9aa0a6; font-weight: 400; }
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
  const pill = el("div", "pill");

  let state = saved;
  let question = null;
  let phase = "ask"; // "ask" (first try), "retry" (second try) or "done"
  let goal = 0;      // correct answers needed for the chosen session; 0 means not chosen yet
  let done = 0;      // correct answers so far

  // ---- view 1: choose a session length, priced in correct answers ----
  const chooseView = el("div");
  const chooseNote = el("p", "note");
  const choices = el("div", "choices");
  const choiceButtons = [1, 2, 3, 4, 5].map((count) => {
    const button = el("button");
    button.type = "button";
    button.addEventListener("click", () => {
      [goal, done] = [count, 0];
      nextQuestion();
      render();
    });
    choices.append(button);
    return button;
  });
  chooseView.append(el("p", "big", "How long do you need?"), choices, chooseNote);

  // ---- view 2: the quiz ----
  const quizView = el("div");
  const rule = el("p", "rule");
  const topicLine = el("p", "topic");
  const prompt = el("p", "prompt");
  const code = el("pre");
  const form = el("form");
  const input = el("input");
  const submit = el("button", "", "Check");
  const feedback = el("p", "feedback");
  const footer = el("div", "footer");
  const progress = el("span");
  const back = el("button", "back", "Choose another length");

  input.placeholder = "Your answer";
  input.autocomplete = "off";
  input.spellcheck = false;
  back.type = "button";
  form.append(input, submit);
  footer.append(progress, back);
  quizView.append(rule, topicLine, prompt, code, form, feedback, footer);

  // ---- view 3: a message while the sites are locked (cooldown or daily limit) ----
  const messageView = el("div");
  const messageTitle = el("p", "big");
  const messageText = el("p", "note");
  messageView.append(messageTitle, messageText);

  overlay.hidden = pill.hidden = true;
  card.append(el("h1", "", "Earn your browsing time"), chooseView, quizView, messageView);
  overlay.append(card);
  shadow.append(style, overlay, pill);
  document.documentElement.append(host);

  const clock = (ms) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // Time left in the running session, and in the cooldown that follows it (ms).
  const sessionLeft = () => state.sessionEnd - Date.now();
  const waitLeft = () => state.sessionEnd + state.cooldown * 60000 - Date.now();

  // Browsing time still allowed today, in ms. No daily limit means no ceiling.
  const capLeft = () =>
    state.dailyCap ? Math.max(0, state.dailyCap * 60000 - usedToday(state.used)) : Infinity;

  // Saves a change and applies it here at once, without waiting for storage to echo it back.
  const save = (patch) => {
    Object.assign(state, patch);
    chrome.storage.local.set(patch);
  };

  function nextQuestion() {
    question = makeQuestion(state.onlyTopics, state.stats.weights, state.stats.harder);
    phase = "ask";
    topicLine.textContent = question.topic + (question.level === 2 ? " · harder, counts double" : "");
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
    submit.textContent = done >= goal ? `Start ${goal * state.minutes} min session` : "Next question";
    feedback.className = "feedback " + className;
    feedback.textContent = text;
    render();
  }

  // The session starts now and runs on the clock. Its full length counts
  // towards the daily limit.
  function startSession() {
    const length = goal * state.minutes * 60000;
    [goal, done, question] = [0, 0, null];
    save({
      sessionEnd: Date.now() + length,
      used: { day: dayKey(), ms: usedToday(state.used) + length },
    });
    render();
  }

  // Tells the background script what the toolbar icon should show on this tab:
  // minutes left in the session, or minutes of cooldown left. Sent when it
  // changes, and repeated every 3 seconds in case Chrome dropped the badge.
  let lastBadge = null, lastBadgeAt = 0;
  function showBadge() {
    if (document.visibilityState !== "visible") return;
    const gated = gatedNow(state.schedule);
    const kind = !gated ? "" : sessionLeft() > 0 ? "session" : waitLeft() > 0 ? "wait" : "";
    const left = kind === "session" ? sessionLeft() : waitLeft();
    const message = { badge: kind ? String(Math.ceil(left / 60000)) : "", kind };
    if (JSON.stringify(message) === lastBadge && Date.now() - lastBadgeAt < 3000) return;
    [lastBadge, lastBadgeAt] = [JSON.stringify(message), Date.now()];
    chrome.runtime.sendMessage(message).catch(() => {}); // fails harmlessly while the extension reloads
  }

  function render() {
    showBadge();
    // Outside the scheduled hours the site is simply open.
    if (!gatedNow(state.schedule)) return (overlay.hidden = pill.hidden = true);

    const inSession = sessionLeft() > 0;
    overlay.hidden = inSession;
    pill.hidden = !inSession;
    if (inSession) return (pill.textContent = clock(sessionLeft()));

    // Otherwise a YouTube video keeps playing behind the quiz.
    document.querySelectorAll("video").forEach((video) => video.pause());

    const waiting = waitLeft() > 0;
    const capped = capLeft() < state.minutes * 60000; // cannot afford even the shortest session
    messageView.hidden = !(waiting || capped);
    chooseView.hidden = waiting || capped || goal > 0;
    quizView.hidden = waiting || capped || goal === 0;

    if (waiting) {
      messageTitle.textContent = "Session over";
      messageText.textContent = `You can start another one in ${clock(waitLeft())}.`;
    } else if (capped) {
      messageTitle.textContent = "Daily limit reached";
      messageText.textContent = `You have used today's ${state.dailyCap} minutes. Blocked sites open again tomorrow.`;
    } else if (goal === 0) {
      choiceButtons.forEach((button, i) => {
        const count = i + 1, minutes = count * state.minutes;
        button.textContent = `${minutes} min for ${count} ${count === 1 ? "answer" : "answers"}`;
        button.disabled = minutes * 60000 > capLeft();
      });
      chooseNote.textContent = "The session starts when you finish the questions and runs on the clock. Unused time is not saved."
        + (state.cooldown ? ` Afterwards the sites stay locked for ${state.cooldown} min.` : "");
    } else {
      rule.textContent = `${goal * state.minutes} min session`;
      progress.textContent = `${Math.min(done, goal)} of ${goal} correct`;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (phase === "done") return done >= goal ? startSession() : nextQuestion();
    if (!input.value.trim()) return;

    const correct = isCorrect(input.value, question.accept);
    const reveal = `Not quite, ${answerLabel(question)}: ${question.answer}\n${question.why}`;

    if (phase === "retry") {
      return correct ? finish("ok", `Right this time, but a second try does not count. ${question.why}`) : finish("bad", reveal);
    }

    // Only the first try counts, for progress and towards the session.
    const stats = recordAnswer(state.stats, question, correct, dayKey());
    const unlocked = stats.harder.length > state.stats.harder.length
      ? `\nHarder ${question.topic} questions are now unlocked.` : "";
    save({ stats });

    if (correct) {
      done += question.level; // a harder question counts as two answers
      finish("ok", `Correct. ${question.why}${unlocked}`);
    } else {
      phase = "retry";
      feedback.className = "feedback bad";
      feedback.textContent = "Not quite. Try once more before you see the answer.";
      input.select();
    }
  });

  back.addEventListener("click", () => {
    [goal, done, question] = [0, 0, null];
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

  document.addEventListener("visibilitychange", render); // refresh as soon as the tab comes back
  render();
  setInterval(render, 1000);
}

// The script loads on every page but only acts on sites in the block list.
loadState().then((saved) => {
  if (matchesSite(location.hostname, saved.sites)) start(saved);
});
