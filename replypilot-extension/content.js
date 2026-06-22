// ============================================================
// ReplyPilot Extension — content.js  (v3 - Auto-open chats)
// Injected into https://web.whatsapp.com
// ============================================================

const REPLYPILOT_TAG  = "[ReplyPilot]";
const PROCESSED_IDS   = new Set();
const REPLIED_CHATS   = new Set(); // track chats we auto-replied to avoid re-processing
let API_KEY       = "";
let API_BASE      = "";
let IS_ENABLED    = false;
let SCANNER_CONFIGS = [];
let IS_PROCESSING = false; // prevent concurrent auto-open loops

// ─── Load settings ───────────────────────────────────────────
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey", "apiBase", "isEnabled"], (d) => {
      API_KEY    = d.apiKey  || "";
      API_BASE   = (d.apiBase || "").replace(/\/$/, "");
      IS_ENABLED = d.isEnabled !== false;
      resolve();
    });
  });
}

async function loadScannerConfigs() {
  if (!API_KEY || !API_BASE) return;
  try {
    const res = await fetch(`${API_BASE}/api/scanner`, {
      headers: { "x-api-key": API_KEY },
    });
    if (res.ok) {
      const data = await res.json();
      SCANNER_CONFIGS = data.scanners || [];
      console.log(REPLYPILOT_TAG, `${SCANNER_CONFIGS.length} scanner(s) loaded`);
    }
  } catch (e) {
    console.warn(REPLYPILOT_TAG, "Scanner load failed:", e.message);
  }
}

// ─── Helpers ──────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getInput() {
  return (
    document.querySelector('div[contenteditable="true"][title="Type a message"]') ||
    document.querySelector('div[contenteditable="true"][data-tab="10"]')           ||
    document.querySelector('div[contenteditable="true"][data-testid="conversation-compose-box-input"]') ||
    document.querySelector('footer div[contenteditable="true"]')                   ||
    document.querySelector('div[role="textbox"][contenteditable="true"]')
  );
}

function getSendBtn() {
  return (
    document.querySelector('button[data-testid="send"]')  ||
    document.querySelector('[data-testid="send"]')         ||
    document.querySelector('span[data-testid="send"]')     ||
    document.querySelector('button[aria-label="Send"]')
  );
}

// ─── Get active contact info from header ─────────────────────
function getContactInfo() {
  const header = document.querySelector('header span[title]');
  const title  = header?.getAttribute("title") || "Unknown";
  return { name: title, phone: title };
}

// ─── Get last N incoming messages from currently open chat ───
function getLastIncomingMessages(limit = 3) {
  const allMsgs = [...document.querySelectorAll("[data-id]")];
  const incoming = allMsgs.filter(m => {
    const id = m.getAttribute("data-id") || "";
    return !id.startsWith("true_") && !m.classList.contains("message-out");
  });
  return incoming.slice(-limit);
}

// ─── Extract text from a message element ─────────────────────
function getMessageText(msgEl) {
  const sel = [
    "span.selectable-text span[dir]",
    "span.selectable-text",
    "[data-pre-plain-text] span",
    ".message-text span",
    "span[dir]",
  ];
  for (const s of sel) {
    const el = msgEl.querySelector(s);
    if (el && el.innerText.trim()) return el.innerText.trim();
  }
  return "";
}

// ─── Extract image base64 ─────────────────────────────────────
async function getImageBase64(msgEl) {
  const img = msgEl.querySelector("img[src]:not([src*='emoji']):not([src*='profile'])");
  if (!img || !img.src || img.src.includes("data:image/svg")) return null;

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => {
      canvas.width  = i.naturalWidth;
      canvas.height = i.naturalHeight;
      canvas.getContext("2d").drawImage(i, 0, 0);
      try { resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]); }
      catch { resolve(null); }
    };
    i.onerror = () => resolve(null);
    i.src = img.src;
  });
}

// ─── Send text reply ──────────────────────────────────────────
async function sendTextReply(text) {
  const input = getInput();
  if (!input) { console.warn(REPLYPILOT_TAG, "Input not found"); return false; }

  input.focus();

  try {
    await navigator.clipboard.writeText(text);
    document.execCommand("paste");
  } catch {
    try { document.execCommand("insertText", false, text); }
    catch {
      input.innerText = text;
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
    }
  }

  await sleep(500);

  const sendBtn = getSendBtn();
  if (sendBtn) {
    sendBtn.click();
    console.log(REPLYPILOT_TAG, "✅ Reply sent:", text.substring(0, 60));
    return true;
  }
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
  return true;
}

// ─── Send image reply ─────────────────────────────────────────
async function sendImageReply(base64Data) {
  try {
    const byteStr = atob(base64Data);
    const ab = new ArrayBuffer(byteStr.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
    const blob = new Blob([ab], { type: "image/png" });

    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    const input = getInput();
    if (!input) return false;
    input.focus();
    await sleep(300);
    document.execCommand("paste");
    await sleep(800);
    getSendBtn()?.click();
    console.log(REPLYPILOT_TAG, "✅ Image/QR sent");
    return true;
  } catch (e) {
    console.error(REPLYPILOT_TAG, "sendImageReply error:", e.message);
    return false;
  }
}

// ─── Check scanner keywords ────────────────────────────────────
function matchScanner(text) {
  const lower = text.toLowerCase();
  for (const sc of SCANNER_CONFIGS) {
    for (const kw of (sc.keywords || [])) {
      if (lower.includes(kw.toLowerCase())) return sc;
    }
  }
  return null;
}

// ─── Call AI reply API ─────────────────────────────────────────
async function callAIReply(text, phone, name) {
  if (!API_KEY || !API_BASE) return null;

  const scanner = matchScanner(text);
  if (scanner) {
    await sleep(800);
    await sendImageReply(scanner.imageBase64);
    return "SCANNER_SENT";
  }

  try {
    const res = await fetch(`${API_BASE}/api/messages/incoming`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({
        content:      text,
        contactPhone: phone,
        contactName:  name || phone,
        source:       "whatsapp",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.reply || null;
    } else {
      const body = await res.text();
      console.error(REPLYPILOT_TAG, `API ${res.status}:`, body);
    }
  } catch (e) {
    console.error(REPLYPILOT_TAG, "callAIReply error:", e.message);
  }
  return null;
}

// ─── Call payment verify API ───────────────────────────────────
async function callPaymentAPI(imageBase64, phone, name) {
  if (!API_KEY || !API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/api/payment/screenshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ imageBase64, contactPhone: phone, contactName: name || phone, source: "whatsapp" }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.reply || null;
    }
  } catch (e) {
    console.error(REPLYPILOT_TAG, "callPaymentAPI error:", e.message);
  }
  return null;
}

// ─── Process a single message node ────────────────────────────
async function processMessage(msgEl) {
  const msgId = msgEl.getAttribute("data-id") || "";
  if (!msgId || PROCESSED_IDS.has(msgId)) return;
  if (msgId.startsWith("true_"))            return; // outgoing
  if (msgEl.classList.contains("message-out")) return;

  PROCESSED_IDS.add(msgId);
  if (PROCESSED_IDS.size > 1000) {
    const iter = PROCESSED_IDS.values();
    for (let i = 0; i < 200; i++) PROCESSED_IDS.delete(iter.next().value);
  }

  const { name, phone } = getContactInfo();

  // Image message?
  const hasImage = (
    msgEl.querySelector("img[src]:not([src*='emoji']):not([src*='profile'])") ||
    msgEl.querySelector("[data-testid='media-url-provider']") ||
    msgEl.querySelector(".media-container")
  );

  if (hasImage) {
    console.log(REPLYPILOT_TAG, "📷 Image detected");
    const b64 = await getImageBase64(msgEl);
    if (b64) {
      const reply = await callPaymentAPI(b64, phone, name);
      if (reply) { await sleep(900); await sendTextReply(reply); }
    } else {
      await sleep(800);
      await sendTextReply("📸 *Payment screenshot bhejo!*\n\nPoints add karwane ke liye apna payment confirmation screenshot bhejo jisme clearly dike:\n✅ Transaction ID\n✅ Amount\n✅ Recipient name\n✅ Date & Time");
    }
    return;
  }

  // Text message
  const text = getMessageText(msgEl);
  if (!text) return;

  console.log(REPLYPILOT_TAG, `💬 "${text.substring(0, 60)}" from ${name}`);
  const reply = await callAIReply(text, phone, name);
  if (reply && reply !== "SCANNER_SENT") {
    await sleep(900);
    await sendTextReply(reply);
  }
}

// ─── Auto-open unread chats and reply ─────────────────────────
async function checkAndProcessUnreadChats() {
  if (!IS_ENABLED || IS_PROCESSING) return;
  IS_PROCESSING = true;

  try {
    // Find all chats with unread badges
    const chatItems = document.querySelectorAll(
      '[data-testid="cell-frame-container"], [data-testid="chat-list-item"]'
    );

    for (const chatItem of chatItems) {
      // Look for unread badge
      const badge = chatItem.querySelector(
        '[data-testid="icon-unread-count"], [aria-label*="unread"], .unread-count, span.bg-teal-600'
      );
      if (!badge) continue;

      const badgeText = badge.textContent?.trim();
      if (!badgeText || badgeText === "0") continue;

      // Get the chat name for dedup
      const chatName = chatItem.querySelector("span[title]")?.getAttribute("title") || "";
      const chatKey  = `${chatName}_${badgeText}`;
      if (REPLIED_CHATS.has(chatKey)) continue;

      console.log(REPLYPILOT_TAG, `📩 Unread chat: "${chatName}" (${badgeText} msgs) — opening...`);

      // Click to open the chat
      chatItem.click();
      await sleep(1500); // wait for messages to render

      // Get last incoming message(s) in this chat
      const msgs = getLastIncomingMessages(1);
      if (msgs.length === 0) {
        console.warn(REPLYPILOT_TAG, "No messages found after opening chat");
        continue;
      }

      for (const msg of msgs) {
        await processMessage(msg);
      }

      REPLIED_CHATS.add(chatKey);

      // Cleanup old keys to prevent memory leak
      if (REPLIED_CHATS.size > 200) {
        const iter = REPLIED_CHATS.values();
        for (let i = 0; i < 50; i++) REPLIED_CHATS.delete(iter.next().value);
      }

      await sleep(500);
    }
  } catch (e) {
    console.error(REPLYPILOT_TAG, "checkAndProcessUnreadChats error:", e.message);
  } finally {
    IS_PROCESSING = false;
  }
}

// ─── MutationObserver for OPEN chat messages ──────────────────
function startMessageObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!IS_ENABLED) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.hasAttribute?.("data-id")) { processMessage(node); continue; }
        const msgs = node.querySelectorAll?.("[data-id]");
        if (msgs?.length) msgs.forEach((m) => processMessage(m));
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  console.log(REPLYPILOT_TAG, "🔍 Message observer started");
}

// ─── Poll for unread chats every 3 seconds ────────────────────
function startUnreadPoller() {
  setInterval(() => {
    if (IS_ENABLED) checkAndProcessUnreadChats();
  }, 3000);
  console.log(REPLYPILOT_TAG, "⏱ Unread chat poller started (every 3s)");
}

// ─── Settings sync ────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled)  IS_ENABLED = changes.isEnabled.newValue;
  if (changes.apiKey)     API_KEY    = changes.apiKey.newValue;
  if (changes.apiBase)    API_BASE   = (changes.apiBase.newValue || "").replace(/\/$/, "");
  if (changes.apiKey || changes.apiBase) loadScannerConfigs();
});

// ─── Init ─────────────────────────────────────────────────────
(async () => {
  await loadSettings();
  await loadScannerConfigs();
  startMessageObserver();
  startUnreadPoller();
  console.log(
    REPLYPILOT_TAG,
    `✅ Initialized | enabled:${IS_ENABLED} | api:${API_BASE ? "✅" : "❌ not set"}`
  );
})();
