// ============================================================
// ReplyPilot Extension — content.js  (Robust v2)
// Injected into https://web.whatsapp.com
// ============================================================

const REPLYPILOT_TAG = "[ReplyPilot]";
const PROCESSED_IDS   = new Set();
let API_KEY      = "";
let API_BASE     = "";
let IS_ENABLED   = false;
let SCANNER_CONFIGS = [];

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

// ─── Find the WhatsApp message compose input ─────────────────
function getInput() {
  return (
    document.querySelector('div[contenteditable="true"][title="Type a message"]') ||
    document.querySelector('div[contenteditable="true"][data-tab="10"]')           ||
    document.querySelector('div[contenteditable="true"][data-testid="conversation-compose-box-input"]') ||
    document.querySelector('footer div[contenteditable="true"]')                   ||
    document.querySelector('div[role="textbox"][contenteditable="true"]')
  );
}

// ─── Find the Send button ────────────────────────────────────
function getSendBtn() {
  return (
    document.querySelector('button[data-testid="send"]')   ||
    document.querySelector('[data-testid="send"]')          ||
    document.querySelector('span[data-testid="send"]')      ||
    document.querySelector('button[aria-label="Send"]')
  );
}

// ─── Get active contact name from header ─────────────────────
function getContactInfo() {
  const header = document.querySelector('header span[title]');
  const title  = header?.getAttribute("title") || "Unknown";
  // If title looks like a phone number, it means not in contacts
  return { name: title, phone: title };
}

// ─── Extract text from message element ───────────────────────
function getMessageText(msgEl) {
  // Try multiple selectors in priority order
  const sel = [
    "span.selectable-text span[dir]",
    "span.selectable-text",
    "[data-pre-plain-text] span",
    ".message-text span",
  ];
  for (const s of sel) {
    const el = msgEl.querySelector(s);
    if (el && el.innerText.trim()) return el.innerText.trim();
  }
  return "";
}

// ─── Extract image base64 from message element ───────────────
async function getImageBase64(msgEl) {
  const img = msgEl.querySelector("img[src]:not([src*='emoji']):not([src*='profile'])");
  if (!img || !img.src || img.src.includes("data:image/svg")) return null;

  return new Promise((resolve) => {
    const canvas  = document.createElement("canvas");
    const i       = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => {
      canvas.width  = i.naturalWidth;
      canvas.height = i.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(i, 0, 0);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      } catch {
        resolve(null);
      }
    };
    i.onerror = () => resolve(null);
    i.src = img.src;
  });
}

// ─── Send text reply via clipboard paste ─────────────────────
async function sendTextReply(text) {
  const input = getInput();
  if (!input) {
    console.warn(REPLYPILOT_TAG, "Input box not found");
    return false;
  }

  input.focus();

  try {
    // Method 1: clipboard paste (most reliable)
    await navigator.clipboard.writeText(text);
    document.execCommand("paste");
  } catch {
    // Method 2: execCommand insertText
    try {
      document.execCommand("insertText", false, text);
    } catch {
      // Method 3: manual input event
      input.innerText = text;
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
    }
  }

  // Wait for WhatsApp to register the text
  await new Promise((r) => setTimeout(r, 400));

  const sendBtn = getSendBtn();
  if (sendBtn) {
    sendBtn.click();
    console.log(REPLYPILOT_TAG, "✅ Reply sent:", text.substring(0, 60));
    return true;
  } else {
    // Fallback: press Enter
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
    return true;
  }
}

// ─── Auto-send QR image via clipboard paste ──────────────────
async function sendImageReply(base64Data) {
  try {
    const byteStr = atob(base64Data);
    const ab      = new ArrayBuffer(byteStr.length);
    const ia      = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
    const blob = new Blob([ab], { type: "image/png" });

    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);

    const input = getInput();
    if (!input) return false;
    input.focus();

    await new Promise((r) => setTimeout(r, 300));
    document.execCommand("paste");

    await new Promise((r) => setTimeout(r, 800));
    const sendBtn = getSendBtn();
    if (sendBtn) {
      sendBtn.click();
      console.log(REPLYPILOT_TAG, "✅ Image/QR sent");
      return true;
    }
  } catch (e) {
    console.error(REPLYPILOT_TAG, "sendImageReply error:", e.message);
  }
  return false;
}

// ─── Scanner keyword match ───────────────────────────────────
function matchScanner(text) {
  const lower = text.toLowerCase();
  for (const sc of SCANNER_CONFIGS) {
    for (const kw of (sc.keywords || [])) {
      if (lower.includes(kw.toLowerCase())) return sc;
    }
  }
  return null;
}

// ─── Send text message to AI API ─────────────────────────────
async function processTextMessage(text, phone, name) {
  if (!API_KEY || !API_BASE) {
    console.warn(REPLYPILOT_TAG, "API not configured — skip");
    return;
  }

  // Check scanner keywords first
  const scanner = matchScanner(text);
  if (scanner) {
    console.log(REPLYPILOT_TAG, `Scanner matched: "${scanner.name}"`);
    await new Promise((r) => setTimeout(r, 800));
    await sendImageReply(scanner.imageBase64);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/messages/incoming`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({
        content:      text,        // ← API expects 'content' not 'message'
        contactPhone: phone,
        contactName:  name || phone,
        source:       "whatsapp",  // ← must match server's allowed source values
      }),
    });

    if (res.ok) {
      const data  = await res.json();
      const reply = data.reply || data.response || data.message;
      if (reply) {
        await new Promise((r) => setTimeout(r, 900));
        await sendTextReply(reply);
      } else {
        console.warn(REPLYPILOT_TAG, "API returned no reply field:", data);
      }
    } else {
      const body = await res.text();
      console.error(REPLYPILOT_TAG, `API error ${res.status}:`, body);
    }
  } catch (e) {
    console.error(REPLYPILOT_TAG, "processTextMessage error:", e.message);
  }
}

// ─── Send image to payment verify API ────────────────────────
async function processPaymentScreenshot(imageBase64, phone, name) {
  if (!API_KEY || !API_BASE) return;
  try {
    const res = await fetch(`${API_BASE}/api/payment/screenshot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({
        imageBase64,
        contactPhone: phone,
        contactName:  name || phone,
        source:       "whatsapp_web_extension",
      }),
    });

    if (res.ok) {
      const data  = await res.json();
      const reply = data.reply;
      if (reply) {
        await new Promise((r) => setTimeout(r, 900));
        await sendTextReply(reply);
      }
    } else {
      console.error(REPLYPILOT_TAG, "Payment API error:", res.status);
    }
  } catch (e) {
    console.error(REPLYPILOT_TAG, "processPaymentScreenshot error:", e.message);
  }
}

// ─── Process one message node ─────────────────────────────────
async function processMessage(msgEl) {
  const msgId = msgEl.getAttribute("data-id") || msgEl.dataset?.id;
  if (!msgId || PROCESSED_IDS.has(msgId)) return;

  // Skip outgoing messages (their data-id starts with "true_")
  if (msgId.startsWith("true_")) return;

  // Also skip if element has outgoing class
  if (msgEl.classList.contains("message-out")) return;

  PROCESSED_IDS.add(msgId);
  if (PROCESSED_IDS.size > 1000) {
    // Trim oldest entries
    const iter = PROCESSED_IDS.values();
    for (let i = 0; i < 200; i++) PROCESSED_IDS.delete(iter.next().value);
  }

  const { name, phone } = getContactInfo();

  // Check for image message
  const hasImage = (
    msgEl.querySelector("img[src]:not([src*='emoji']):not([src*='profile'])") ||
    msgEl.querySelector("[data-testid='media-url-provider']") ||
    msgEl.querySelector(".media-container")
  );

  if (hasImage) {
    console.log(REPLYPILOT_TAG, "📷 Image message detected");
    const imageBase64 = await getImageBase64(msgEl);
    if (imageBase64) {
      await processPaymentScreenshot(imageBase64, phone, name);
    } else {
      await new Promise((r) => setTimeout(r, 800));
      await sendTextReply(
        "📸 *Payment screenshot bhejo!*\n\nPoints add karwane ke liye *payment confirmation screenshot* bhejo jisme clearly dike:\n✅ Transaction ID\n✅ Amount\n✅ Recipient name\n✅ Date & Time"
      );
    }
    return;
  }

  // Check for text
  const text = getMessageText(msgEl);
  if (!text) return;

  console.log(REPLYPILOT_TAG, `💬 "${text.substring(0, 60)}" from ${name}`);
  await processTextMessage(text, phone, name);
}

// ─── MutationObserver ─────────────────────────────────────────
function startObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!IS_ENABLED) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        // Check node itself
        if (node.hasAttribute?.("data-id")) {
          processMessage(node);
          continue;
        }

        // Check all message nodes inside
        const msgs = node.querySelectorAll?.("[data-id]");
        if (msgs?.length) msgs.forEach((m) => processMessage(m));
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log(REPLYPILOT_TAG, "🔍 Observer started");
}

// ─── Listen for storage changes from popup ───────────────────
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
  startObserver();
  console.log(
    REPLYPILOT_TAG,
    `✅ Initialized | enabled:${IS_ENABLED} | api:${API_BASE ? "✅" : "❌ not set"}`
  );
})();
