// Toolbar popup: block the site in the current tab, or remove sites from the list.

const blockButton = document.getElementById("block");
const list = document.getElementById("sites");

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { sites, bank } = await chrome.storage.local.get({ sites: DEFAULT_SITES, bank: 0 });
  document.getElementById("bank").textContent = `Banked: ${bank} min`;

  // Only ordinary web pages can be blocked, not chrome:// pages or local files.
  const url = tab && tab.url && tab.url.startsWith("http") ? new URL(tab.url) : null;
  const site = url ? url.hostname.replace(/^www\./, "") : null;

  // The quiz decides whether to run when a page loads, so reload to apply a change.
  const save = async (newSites, reload) => {
    await chrome.storage.local.set({ sites: newSites });
    if (reload) chrome.tabs.reload(tab.id);
    window.close();
  };

  if (!site) {
    blockButton.textContent = "This page cannot be blocked";
    blockButton.disabled = true;
  } else if (matchesSite(url.hostname, sites)) {
    blockButton.textContent = `${site} is blocked`;
    blockButton.disabled = true;
  } else {
    blockButton.textContent = `Block ${site}`;
    blockButton.addEventListener("click", () => save([...sites, site], true));
  }

  for (const entry of sites) {
    const item = document.createElement("li");
    const remove = document.createElement("button");
    item.textContent = entry;
    remove.textContent = "Remove";
    remove.addEventListener("click", () =>
      save(sites.filter((s) => s !== entry), url && matchesSite(url.hostname, [entry])));
    item.append(remove);
    list.append(item);
  }
}

main();
