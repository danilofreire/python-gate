// Backup page: download the stored settings and progress as a file, or restore them.

const status = document.getElementById("status");

document.getElementById("export").addEventListener("click", async () => {
  const text = JSON.stringify(makeBackup(await loadState()), null, 2);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  link.download = `python-gate-backup-${dayKey()}.json`;
  link.click();
  status.textContent = "Backup downloaded.";
});

document.getElementById("file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  let backup = null;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    // not JSON: handled below as "not a backup"
  }

  const result = restoreBackup(await loadState(), backup);
  if (!result) return (status.textContent = "This file is not a Python Gate backup.");

  await chrome.storage.local.set(result.patch);
  status.textContent = result.keptSettings
    ? "Backup restored."
    : "Progress, topics and sites restored. The settings in the file would loosen the gate, so yours were kept. You can change them in the popup.";
});
