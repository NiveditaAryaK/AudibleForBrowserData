const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const input = document.getElementById("apiBaseUrl");
const statusNode = document.getElementById("status");

function setStatus(message) {
  statusNode.textContent = message;
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(["apiBaseUrl"]);
  input.value = stored.apiBaseUrl || DEFAULT_API_BASE_URL;
}

document.getElementById("save").addEventListener("click", async () => {
  const value = input.value.trim().replace(/\/+$/, "");
  if (!value) {
    setStatus("Enter a base URL first.");
    return;
  }

  await chrome.storage.sync.set({ apiBaseUrl: value });
  setStatus("Saved.");
});

document.getElementById("reset").addEventListener("click", async () => {
  input.value = DEFAULT_API_BASE_URL;
  await chrome.storage.sync.set({ apiBaseUrl: DEFAULT_API_BASE_URL });
  setStatus("Switched to localhost.");
});

loadSettings();
