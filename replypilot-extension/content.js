// ============================================================
// ReplyPilot Extension — content.js
// Injected into https://web.whatsapp.com
// ============================================================

const REPLYPILOT_TAG = "[ReplyPilot]";
const PROCESSED_IDS = new Set();
let API_KEY = "";
let API_BASE = "";
let IS_ENABLED = false;
let SCANNER_CONFIGS = []; // [{name, keywords:[], imageBase64}]
let LAST_ACTIVE_PHONE = "";

// ─── Load settings from chrome.storage ───────────────────────
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      ["apiKey", "apiBase", "isEnabled"],
      (data) => {
        API_KEY = data.apiKey || "";
        API_BASE = (data.apiBase || "").replace(/\/$/, "");
        IS_ENABLED = data.isEnabled !== false;
        resolve();
      }
    );
  });
}

// ─── Fetch scanner configs from backend ──────────────────────
async function loadScannerConfigs() {
  if (!API_KEY || !API_BASE) return;
  try {
    const res = await fetch(`${API_BASE}/api/scanner`, {
      headers: { "x-api-key": API_KEY },
    });
    if (res.ok) {
      const data = await res.json();
      SCANNER_CONFIGS = data.scanners || [];
      console.log(REPLYPILOT_TAG, `Loaded ${SCANNER_CONFIGS.length} scanner config(s)`);
    }
  } catch (e) {
    console.warn(REPLYPILOT_TAG, "Failed to load scanner configs", e);
  }
}

// ─── Extract currently open chat phone number ────────────────
function getActiveChatPhone() {
  try {
    // WhatsApp Web stores the active chat JID in the URL hash or in the header
    const header = document.querySelector('header span[title]');
    const title = header?.getAttribute("title") || "";
    // If not in contacts, title is the phone number
    const match = title.match(/^\+?(\d[\d\s\-]{8,})/);
    if (match) return match[1].replace(/[\s\-]/g, "");

    // Try from URL
    const hash = window.location.hash; // #/5491123456789 on some versions
    const fromHash = hash.match(/(\d{10,})/);
    if (fromHash) return fromHash[1];

    return LAST_ACTIVE_PHONE || "unknown";
  } catch {
    return LAST_ACTIVE_PHONE || "unknown";
  }
}

// ─── Get message text from a message element ────────────────
function getMessageText(msgEl) {
  const span = msgEl.querySelector("span.selectable-text span");
  return span?.innerText?.trim() || "";
}

// ─── Get image base64 from a message element ─────────────────
async function getMessageImageBase64(msgEl) {
  const img = msgEl.querySelector("img[src]");
  if (!img) return null;

  const src = img.src;
  if (!src || src.startsWith("data:image/svg")) return null;

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => {
      canvas.width = i.naturalWidth;
      canvas.height = i.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(i, 0, 0);
      try {
        const b64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        resolve(b64);
      } catch {
        resolve(null);
      }
    };
    i.onerror = () => resolve(null);
    i.src = src;
  });
}

// ─── Auto-type and send a text reply ─────────────────────────
function sendTextReply(text) {
  return new Promise((resolve) => {
    const input =
      document.querySelector('div[contenteditable="true"][title="Type a message"]') ||
      document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
      document.querySelector('div[contenteditable="true"][data-testid="conversation-compose-box-input"]');

    if (!input) {
      console.warn(REPLYPILOT_TAG, "Input box not found");
      return resolve(false);
    }

    input.focus();

    // Split by newlines and type with Shift+Enter for line breaks
    const lines = text.split("\n");
    lines.forEach((line, idx) => {
      document.execCommand("insertText", false, line);
      if (idx < lines.length - 1) {
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }));
      }
    });

    // Send after short delay
    setTimeout(() => {
      const sendBtn =
        document.querySelector('button[data-testid="send"]') ||
        document.querySelector('[data-testid="send"]') ||
        document.querySelector('span[data-testid="send"]');

      if (sendBtn) {
        sendBtn.click();
        console.log(REPLYPILOT_TAG, "Reply sent:", text.substring(0, 60));
        resolve(true);
      } else {
        // Try Enter key as fallback
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
        resolve(true);
      }
    }, 300);
  });
}

// ─── Auto-send an image (QR/Scanner) ─────────────────────────
async function sendImageReply(base64Data) {
  return new Promise(async (resolve) => {
    try {
      // Convert base64 to blob
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: "image/png" });

      // Write to clipboard
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);

      // Focus and paste
      const input =
        document.querySelector('div[contenteditable="true"][title="Type a message"]') ||
        document.querySelector('div[contenteditable="true"][data-tab="10"]');

      if (!input) return resolve(false);
      input.focus();

      setTimeout(() => {
        document.execCommand("paste");
        setTimeout(() => {
          // Click send button after paste preview appears
          const sendBtn =
            document.querySelector('button[data-testid="send"]') ||
            document.querySelector('[data-testid="send"]');
          if (sendBtn) {
            sendBtn.click();
            console.log(REPLYPILOT_TAG, "Image/QR sent successfully");
            resolve(true);
          } else {
            resolve(false);
          }
        }, 800);
      }, 400);
    } catch (e) {
      console.error(REPLYPILOT_TAG, "sendImageReply error:", e);
      resolve(false);
    }
  });
}

// ─── Check if a text matches scanner keywords ────────────────
function matchScanner(text) {
  const lower = text.toLowerCase();
  for (const scanner of SCANNER_CONFIGS) {
    for (const kw of (scanner.keywords || [])) {
      if (lower.includes(kw.toLowerCase())) {
        return scanner;
      }
    }
  }
  return null;
}

// ─── Send text message to AI API ────────────────────────────
async function processTextMessage(text, phone, name) {
  if (!API_KEY || !API_BASE) return;

  // 1. Check scanner keywords first
  const scanner = matchScanner(text);
  if (scanner) {
    console.log(REPLYPILOT_TAG, `Scanner keyword matched: "${scanner.name}" — sending image`);
    await sendImageReply(scanner.imageBase64);
    return;
  }

  // 2. Send to AI reply API
  try {
    const res = await fetch(`${API_BASE}/api/message/incoming`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({
        message: text,
        contactPhone: phone,
        contactName: name || phone,
        source: "whatsapp_web_extension",
        platform: "whatsapp",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data.reply || data.response || data.message;
      if (reply) {
        await new Promise((r) => setTimeout(r, 1000)); // natural delay
        await sendTextReply(reply);
      }
    } else {
      console.warn(REPLYPILOT_TAG, "API error:", res.status);
    }
  } catch (e) {
    console.error(REPLYPILOT_TAG, "processTextMessage error:", e);
  }
}

// ─── Send image to payment verify API ───────────────────────
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
        contactName: name || phone,
        source: "whatsapp_web_extension",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data.reply;
      if (reply) {
        await new Promise((r) => setTimeout(r, 1000));
        await sendTextReply(reply);
      }
    } else {
      console.warn(REPLYPILOT_TAG, "Payment API error:", res.status);
    }
  } catch (e) {
    console.error(REPLYPILOT_TAG, "processPaymentScreenshot error:", e);
  }
}

// ─── Process a single message node ──────────────────────────
async function processMessage(msgEl) {
  const msgId = msgEl.getAttribute("data-id");
  if (!msgId || PROCESSED_IDS.has(msgId)) return;

  // Only process INCOMING messages (not from us)
  // Outgoing messages have class "message-out" or data-id starts with "true_"
  const isOutgoing =
    msgEl.classList.contains("message-out") ||
    msgEl.closest('[data-id*="true_"]') !== null ||
    (msgId && msgId.startsWith("true_"));
  if (isOutgoing) return;

  PROCESSED_IDS.add(msgId);

  // Limit PROCESSED_IDS size to avoid memory leak
  if (PROCESSED_IDS.size > 500) {
    const iter = PROCESSED_IDS.values();
    for (let i = 0; i < 100; i++) PROCESSED_IDS.delete(iter.next().value);
  }

  const phone = getActiveChatPhone();
  const contactName = document.querySelector('header span[title]')?.getAttribute("title") || phone;

  // Check for image
  const hasImage =
    msgEl.querySelector("img[src]:not([src*='emoji']):not([src*='svg'])") !== null ||
    msgEl.querySelector("[data-testid='media-url-provider']") !== null;

  if (hasImage) {
    console.log(REPLYPILOT_TAG, "Image message detected — processing as payment screenshot");
    const imageBase64 = await getMessageImageBase64(msgEl);
    if (imageBase64) {
      await processPaymentScreenshot(imageBase64, phone, contactName);
    } else {
      // Image couldn't be read — ask user to confirm
      await sendTextReply(
        "📸 *Payment screenshot bhejo!*\n\nPoints add karwane ke liye apna *payment confirmation screenshot* bhejo jisme yeh clearly dike:\n✅ Transaction ID\n✅ Amount\n✅ Recipient name\n✅ Date & Time"
      );
    }
    return;
  }

  // Check for text
  const text = getMessageText(msgEl);
  if (!text || text.length < 1) return;

  console.log(REPLYPILOT_TAG, `Text message from ${contactName}: "${text.substring(0, 60)}"`);
  await processTextMessage(text, phone, contactName);
}

// ─── MutationObserver — watch for new messages ──────────────
function startObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!IS_ENABLED) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        // Direct message element
        if (node.hasAttribute?.("data-id")) {
          processMessage(node);
          continue;
        }

        // Message inside added subtree
        const msgs = node.querySelectorAll?.("[data-id]");
        if (msgs) {
          msgs.forEach((m) => processMessage(m));
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log(REPLYPILOT_TAG, "Observer started ✅");
}

// ─── Listen for settings updates from popup ─────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled) IS_ENABLED = changes.isEnabled.newValue;
  if (changes.apiKey) API_KEY = changes.apiKey.newValue;
  if (changes.apiBase) API_BASE = (changes.apiBase.newValue || "").replace(/\/$/, "");
  if (changes.apiKey || changes.apiBase) loadScannerConfigs(); // Reload when key changes
});

// ─── Init ────────────────────────────────────────────────────
(async () => {
  await loadSettings();
  await loadScannerConfigs();
  startObserver();
  console.log(
    REPLYPILOT_TAG,
    `Initialized — enabled: ${IS_ENABLED}, api: ${API_BASE ? "✅ configured" : "❌ not set"}`
  );
})();
