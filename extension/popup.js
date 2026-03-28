const statusNode = document.getElementById("status");

async function withActiveTab(callback) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  return callback(tab.id);
}

function setStatus(message) {
  statusNode.textContent = message;
}

async function sendAction(action) {
  setStatus("Working...");
  try {
    const response = await withActiveTab((tabId) =>
      chrome.tabs.sendMessage(tabId, { action })
    );
    setStatus(response?.message || "Done.");
  } catch (error) {
    setStatus(error.message || "Something went wrong.");
  }
}

document.getElementById("readSelection").addEventListener("click", () => {
  sendAction("read-selection");
});

document.getElementById("readPage").addEventListener("click", () => {
  sendAction("read-page");
});

document.getElementById("stop").addEventListener("click", () => {
  sendAction("stop");
});

document.getElementById("settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
