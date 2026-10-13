// Shows minutes on the toolbar icon, only on tabs that hold a blocked site.
// The quiz script on each blocked tab says what to show, and Chrome clears a
// tab's badge by itself when the tab moves to another page.
// - blue: minutes left in the session
// - grey: minutes of cooldown left before the next session

const COLOURS = { session: "#4b8bbe", wait: "#5f6368" };

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!sender.tab || typeof message.badge !== "string") return;
  const tabId = sender.tab.id;
  chrome.action.setBadgeText({ tabId, text: message.badge });
  chrome.action.setBadgeBackgroundColor({ tabId, color: COLOURS[message.kind] || COLOURS.wait });
  chrome.action.setBadgeTextColor({ tabId, color: "#ffffff" });
});

// Clears the badge that an earlier version set on every tab.
chrome.runtime.onInstalled.addListener(() => chrome.action.setBadgeText({ text: "" }));
