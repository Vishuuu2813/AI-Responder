// popup.js — ReplyPilot Extension Popup Logic

const enableToggle = document.getElementById("enableToggle");
const statusDot    = document.getElementById("statusDot");
const statusText   = document.getElementById("statusText");
const apiBaseInput = document.getElementById("apiBase");
const apiKeyInput  = document.getElementById("apiKey");
const saveBtn      = document.getElementById("saveBtn");
const saveMsg      = document.getElementById("saveMsg");
const scannerBadge = document.getElementById("scannerBadge");
const dashboardLink= document.getElementById("dashboardLink");

// ─── Load saved settings ────────────────────────────────────
chrome.storage.sync.get(["apiKey", "apiBase", "isEnabled"], (data) => {
  apiKeyInput.value  = data.apiKey  || "";
  apiBaseInput.value = data.apiBase || "";
  enableToggle.checked = data.isEnabled !== false;

  updateStatus(data);

  if (data.apiBase) {
    dashboardLink.href = `${data.apiBase}/dashboard`;
    checkScanners(data.apiKey, data.apiBase);
  }
});

// ─── Toggle enabled ─────────────────────────────────────────
enableToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ isEnabled: enableToggle.checked });
  updateStatus();
});

// ─── Save button ────────────────────────────────────────────
saveBtn.addEventListener("click", () => {
  const apiBase = apiBaseInput.value.trim().replace(/\/$/, "");
  const apiKey  = apiKeyInput.value.trim();

  if (!apiBase || !apiKey) {
    showSaveMsg("⚠️ Please fill in both fields", "#f59e0b");
    return;
  }

  chrome.storage.sync.set({ apiBase, apiKey }, () => {
    showSaveMsg("✅ Saved!", "#22c55e");
    dashboardLink.href = `${apiBase}/dashboard`;
    updateStatus({ apiBase, apiKey, isEnabled: enableToggle.checked });
    checkScanners(apiKey, apiBase);
  });
});

function showSaveMsg(msg, color) {
  saveMsg.textContent = msg;
  saveMsg.style.color = color;
  setTimeout(() => (saveMsg.textContent = ""), 2500);
}

// ─── Update status indicator ────────────────────────────────
function updateStatus(data) {
  const settings = data || {
    apiKey: apiKeyInput.value,
    apiBase: apiBaseInput.value,
    isEnabled: enableToggle.checked,
  };

  if (!settings.apiKey || !settings.apiBase) {
    statusDot.className = "status-dot warn";
    statusText.textContent = "API not configured — open settings";
    return;
  }

  if (!settings.isEnabled) {
    statusDot.className = "status-dot warn";
    statusText.textContent = "Paused — toggle to enable";
    return;
  }

  statusDot.className = "status-dot ok";
  statusText.textContent = "Active — monitoring WhatsApp Web";
}

// ─── Check scanner count ────────────────────────────────────
async function checkScanners(apiKey, apiBase) {
  if (!apiKey || !apiBase) return;
  try {
    const res = await fetch(`${apiBase}/api/scanner`, {
      headers: { "x-api-key": apiKey },
    });
    if (res.ok) {
      const data = await res.json();
      const count = (data.scanners || []).length;
      scannerBadge.textContent = `${count} configured`;
      scannerBadge.classList.toggle("active", count > 0);
    }
  } catch {
    scannerBadge.textContent = "Error";
  }
}
