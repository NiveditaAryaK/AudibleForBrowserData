let currentAudio = null;
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

async function getApiBaseUrl() {
  const stored = await chrome.storage.sync.get(["apiBaseUrl"]);
  const value = (stored.apiBaseUrl || DEFAULT_API_BASE_URL).trim();
  return value.replace(/\/+$/, "");
}

function getSelectionText() {
  return window.getSelection()?.toString().trim() || "";
}

function getPageText() {
  const source = document.querySelector("article, main") || document.body;
  const text = source?.innerText || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 6000);
}

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.src);
    currentAudio = null;
  }
}

async function playText(text) {
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    let detail = "TTS request failed.";
    try {
      const payload = await response.json();
      detail = payload.detail || detail;
    } catch (_error) {
      // Leave the default message in place if the response is not JSON.
    }
    throw new Error(detail);
  }

  const blob = await response.blob();
  stopAudio();
  currentAudio = new Audio(URL.createObjectURL(blob));
  currentAudio.play();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "stop") {
    stopAudio();
    sendResponse({ message: "Stopped playback." });
    return false;
  }

  const text =
    message.action === "read-selection" ? getSelectionText() : getPageText();

  if (!text) {
    sendResponse({
      message:
        message.action === "read-selection"
          ? "Select some text first."
          : "No readable page text found."
    });
    return false;
  }

  playText(text)
    .then(() => {
      sendResponse({
        message:
          message.action === "read-selection"
            ? "Reading your selection."
            : "Reading the current page."
      });
    })
    .catch((error) => {
      sendResponse({ message: error.message || "Playback failed." });
    });

  return true;
});
