// Shows minutes on the toolbar icon, only on tabs that hold a blocked site.
// The quiz script on each blocked tab says what to show, and Chrome clears a
// tab's badge by itself when the tab moves to another page.
// - yellow: banked minutes
// - blue: browsing time left while the countdown runs

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!sender.tab || typeof message.badge !== "string") return;
  const tabId = sender.tab.id;
  chrome.action.setBadgeText({ tabId, text: message.badge });
  chrome.action.setBadgeBackgroundColor({ tabId, color: message.running ? "#4b8bbe" : "#ffd43b" });
  chrome.action.setBadgeTextColor({ tabId, color: message.running ? "#ffffff" : "#14161a" });
});

// Clears the badge that an earlier version set on every tab.
chrome.runtime.onInstalled.addListener(() => chrome.action.setBadgeText({ text: "" }));
