// Covers blocked sites with a Python quiz until you have earned browsing time.
// Each correct answer banks minutes; "Use minutes" spends the whole bank.

const MINUTES_PER_CORRECT = 3;

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
  card.append(
    el("h1", "", "Earn your browsing time"),
    el("p", "rule", `Each correct answer banks ${MINUTES_PER_CORRECT} minutes.`),
    prompt, code, form, feedback, footer
  );
  overlay.append(card);
  shadow.append(style, overlay, pill);
  document.documentElement.append(host);

  let state = { bank: saved.bank, unlockedUntil: saved.unlockedUntil };
  let question = null;
  let answered = false;

  function nextQuestion() {
    question = makeQuestion();
    answered = false;
    prompt.textContent = question.blank ? "What goes in the blank (____)?" : "What does this print?";
    code.textContent = question.code;
    input.value = "";
    input.readOnly = false;
    submit.textContent = "Check";
    feedback.textContent = "";
    input.focus();
  }

  function render() {
    const msLeft = state.unlockedUntil - Date.now();
    const locked = msLeft <= 0;
    overlay.hidden = !locked;
    pill.hidden = locked;

    if (locked) {
      // Otherwise a YouTube video keeps playing behind the quiz.
      document.querySelectorAll("video").forEach((video) => video.pause());
      bankLabel.textContent = `Banked: ${state.bank} min`;
      spend.textContent = `Use ${state.bank} min`;
      spend.disabled = state.bank === 0;
      if (!question) nextQuestion();
    } else {
      question = null;
      const s = Math.ceil(msLeft / 1000);
      pill.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (answered) return nextQuestion();
    if (!input.value.trim()) return;

    answered = true;
    input.readOnly = true;
    submit.textContent = "Next question";
    if (isCorrect(input.value, question.accept)) {
      feedback.className = "feedback ok";
      feedback.textContent = `Correct, +${MINUTES_PER_CORRECT} min. ${question.why}`;
      chrome.storage.local.set({ bank: state.bank + MINUTES_PER_CORRECT });
    } else {
      feedback.className = "feedback bad";
      feedback.textContent = `Not quite, ${question.blank ? "the blank is" : "it prints"}: ${question.answer}\n${question.why}`;
    }
  });

  spend.addEventListener("click", () => {
    chrome.storage.local.set({ bank: 0, unlockedUntil: Date.now() + state.bank * 60000 });
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
  setInterval(render, 1000);
}

// The script loads on every page but only acts on sites in the block list.
chrome.storage.local.get({ sites: DEFAULT_SITES, bank: 0, unlockedUntil: 0 }).then((saved) => {
  if (matchesSite(location.hostname, saved.sites)) start(saved);
});
