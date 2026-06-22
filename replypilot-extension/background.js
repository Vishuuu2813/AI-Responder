// background.js — Service Worker for ReplyPilot Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log("[ReplyPilot] Extension installed");
  chrome.storage.sync.set({ isEnabled: true });
});

// Forward messages from popup to content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_STATUS") {
    chrome.storage.sync.get(["apiKey", "apiBase", "isEnabled"], (data) => {
      sendResponse({
        isEnabled: data.isEnabled !== false,
        hasApiKey: !!(data.apiKey),
        hasApiBase: !!(data.apiBase),
      });
    });
    return true;
  }
});
