// ReplyPilot Extension — content.js (v6)
const TAG = "[ReplyPilot]";
const LAST_PROCESSED_MSG_ID = {}; // phone -> last processed incoming message ID
const CHAT_REPLIED = {}; // chatName -> lastClickedTimestamp
let API_KEY = "", API_BASE = "", IS_ENABLED = false, SCANNERS = [], IS_BUSY = false;
let CURRENT_CHAT = "";
let IS_OPENED_BY_POLLER = false;
const IN_FLIGHT = new Set();

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Settings ──────────────────────────────────────────────────
async function loadSettings() {
  return new Promise(r => chrome.storage.sync.get(["apiKey","apiBase","isEnabled"], d => {
    API_KEY = d.apiKey || ""; 
    API_BASE = (d.apiBase||"").replace(/\/$/,"");
    IS_ENABLED = d.isEnabled !== false; 
    r();
  }));
}
async function loadScanners() {
  if (!API_KEY || !API_BASE) return;
  try {
    const res = await fetch(`${API_BASE}/api/scanner`, { headers: {"x-api-key": API_KEY} });
    if (res.ok) { SCANNERS = (await res.json()).scanners || []; }
  } catch {}
}

// ── DOM helpers ───────────────────────────────────────────────
function getInput() {
  return document.querySelector('div[contenteditable="true"][title="Type a message"]')
    || document.querySelector('div[contenteditable="true"][data-tab="10"]')
    || document.querySelector('footer div[contenteditable="true"]');
}
function getSend() {
  return document.querySelector('button[data-testid="send"]')
    || document.querySelector('[data-testid="send"]')
    || document.querySelector('button[aria-label="Send"]');
}

// Extract phone/group ID from data-id
function phoneFromId(msgId) {
  if (!msgId) return null;
  const m = msgId.match(/(?:false|true)_([^@]+)@/);
  return m ? m[1] : null;
}
function cleanName(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/[^\w]/g, "").trim();
}

function getContactName() {
  const mainHeader = document.querySelector('#main header');
  if (!mainHeader) return "Unknown";
  
  const selectors = [
    '[data-testid="conversation-info-header-chat-title"] span',
    '[data-testid="conversation-info-header-chat-title"]',
    'span[title]',
    '[dir="auto"]',
    'span'
  ];

  for (const s of selectors) {
    const el = mainHeader.querySelector(s);
    if (el) {
      const val = el.getAttribute("title") || el.innerText || "";
      const cleaned = val.trim();
      if (cleaned && cleaned.length > 1 && cleaned !== "click here for contact info") {
        return cleaned;
      }
    }
  }
  return "Unknown";
}

function safeClick(element) {
  if (!element) return;
  const events = ["mousedown", "mouseup", "click"];
  for (const name of events) {
    const ev = new MouseEvent(name, {
      bubbles: true,
      cancelable: true,
      view: window,
      buttons: 1,
      button: 0
    });
    element.dispatchEvent(ev);
  }
  if (typeof element.click === "function") {
    try { element.click(); } catch(e) {}
  }
}

function clickChatItem(item) {
  if (!item) return;
  try { item.scrollIntoView({ block: "center", behavior: "instant" }); } catch {}

  const targets = [
    item.closest('[data-testid="cell-frame-container"]'),
    item.closest('[role="listitem"]'),
    item.closest('[role="row"]'),
    item.closest('[data-testid="chat-list-item"]'),
    item.querySelector('span[title]'),
    item.closest('[role="gridcell"]'),
    item
  ].filter(Boolean);

  for (const el of targets) safeClick(el);
}

function getIncomingMessages() {
  const main = document.querySelector("#main");
  if (!main) return [];
  return [...main.querySelectorAll("[data-id]")].filter(m => {
    const id = m.getAttribute("data-id") || "";
    if (!id || id.startsWith("true_")) return false;
    if (m.classList.contains("message-out")) return false;
    if (m.closest("#pane-side")) return false;
    return true;
  });
}

function getMessageText(msgEl) {
  const selectors = [
    "span.selectable-text span[dir]",
    "span.selectable-text",
    "[data-testid='conversation-text'] span",
    "div.copyable-text span"
  ];
  for (const s of selectors) {
    const el = msgEl.querySelector(s);
    const t = el?.innerText?.trim();
    if (t) return t;
  }
  return msgEl.innerText?.trim() || "";
}

// ── Send text ─────────────────────────────────────────────────
async function sendText(text) {
  const input = getInput();
  if (!input) { console.warn(TAG, "sendText: input not found"); return false; }
  input.focus();
  input.click();

  let inserted = false;
  try {
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    inserted = document.execCommand("insertText", false, text);
  } catch {}

  if (!inserted) {
    try {
      await navigator.clipboard.writeText(text);
      document.execCommand("paste");
      inserted = true;
    } catch {
      input.textContent = text;
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    }
  } else {
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }

  await sleep(600);
  const btn = getSend();
  if (btn && !btn.disabled) {
    btn.click();
    console.log(TAG, "✅ Sent:", text.slice(0, 50));
    return true;
  }
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
  console.log(TAG, "✅ Sent (Enter):", text.slice(0, 50));
  return true;
}

// ── Send image ────────────────────────────────────────────────
async function sendImage(b64) {
  try {
    const ab = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
    const blob = new Blob([ab],{type:"image/png"});
    await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);
    const inp = getInput(); if (!inp) return;
    inp.focus(); await sleep(300);
    document.execCommand("paste"); await sleep(800);
    getSend()?.click(); console.log(TAG,"✅ Image sent");
  } catch(e) { console.error(TAG,"sendImage err:",e.message); }
}

// ── Get image base64 from msg element ─────────────────────────
async function imgBase64(msgEl) {
  const img = msgEl.querySelector("img[src]:not([src*='emoji']):not([src*='profile'])");
  if (!img?.src || img.src.includes("svg")) return null;
  return new Promise(res => {
    const c=document.createElement("canvas"), i=new Image();
    i.crossOrigin="anonymous";
    i.onload=()=>{ c.width=i.naturalWidth; c.height=i.naturalHeight; c.getContext("2d").drawImage(i,0,0); try{res(c.toDataURL("image/jpeg",.85).split(",")[1]);}catch{res(null);} };
    i.onerror=()=>res(null); i.src=img.src;
  });
}

// ── API calls ─────────────────────────────────────────────────
function matchScanner(text) {
  const lo = text.toLowerCase();
  return SCANNERS.find(sc => (sc.keywords||[]).some(k=>lo.includes(k.toLowerCase())));
}

async function callTextAPI(text, phone, name) {
  if (!API_KEY||!API_BASE) return null;
  if (!phone||phone.length<5) { console.warn(TAG,"Invalid phone, skip"); return null; }

  const sc = matchScanner(text);
  if (sc) { await sleep(800); await sendImage(sc.imageBase64); return "SCANNER"; }

  try {
    const r = await fetch(`${API_BASE}/api/messages/incoming`,{
      method:"POST", headers:{"Content-Type":"application/json","x-api-key":API_KEY},
      body: JSON.stringify({ content:text, contactPhone:phone, contactName:name||phone, source:"whatsapp" })
    });
    if (r.ok) {
      const d = await r.json();
      if (!d.reply) console.warn(TAG, "API returned no reply:", d.reason || "unknown");
      return d.reply || null;
    }
    console.error(TAG, `API ${r.status}:`, await r.text());
  } catch(e) { console.error(TAG,"callTextAPI:",e.message); }
  return null;
}

async function callPayAPI(b64, phone, name) {
  if (!API_KEY||!API_BASE||!phone||phone.length<5) return null;
  try {
    const r = await fetch(`${API_BASE}/api/payment/screenshot`,{
      method:"POST", headers:{"Content-Type":"application/json","x-api-key":API_KEY},
      body: JSON.stringify({ imageBase64:b64, contactPhone:phone, contactName:name||phone, source:"whatsapp" })
    });
    if (r.ok) { const d=await r.json(); return d.reply||null; }
  } catch(e) { console.error(TAG,"callPayAPI:",e.message); }
  return null;
}

// ── Process one message ───────────────────────────────────────
async function processMsg(msgEl, opts = {}) {
  const force = !!opts.force;
  const id = msgEl.getAttribute("data-id") || "";
  if (!id || id.startsWith("true_") || msgEl.classList.contains("message-out")) return false;

  const phone = phoneFromId(id);
  if (!phone) { console.warn(TAG, "skip: no phone in id", id.slice(0, 40)); return false; }

  if (LAST_PROCESSED_MSG_ID[phone] === id && !force) {
    console.log(TAG, "skip: already processed", id.slice(0, 30));
    return false;
  }
  if (IN_FLIGHT.has(id)) return false;
  IN_FLIGHT.add(id);

  if (!API_KEY || !API_BASE) {
    console.warn(TAG, "skip: API not configured — open extension popup and save API URL + key");
    IN_FLIGHT.delete(id);
    return false;
  }

  const name = getContactName();

  const hasImg = msgEl.querySelector("img[src]:not([src*='emoji']):not([src*='profile'])")
    || msgEl.querySelector("[data-testid='media-url-provider']");

  if (hasImg) {
    console.log(TAG, "📷 Image from", phone);
    LAST_PROCESSED_MSG_ID[phone] = id;
    const b64 = await imgBase64(msgEl);
    const reply = b64 ? await callPayAPI(b64, phone, name)
      : "📸 *Payment screenshot bhejo!*\n\nPoints add karwane ke liye payment confirmation screenshot bhejo.";
    if (reply) { await sleep(800); await sendText(reply); IN_FLIGHT.delete(id); return true; }
    IN_FLIGHT.delete(id);
    return false;
  }

  const text = getMessageText(msgEl);
  if (!text || text.length < 1) {
    console.log(TAG, "skip: empty text (sticker/audio?) id:", id.slice(0, 30));
    IN_FLIGHT.delete(id);
    return false;
  }

  console.log(TAG, `💬 "${text.slice(0, 50)}" | phone:${phone}`);
  const reply = await callTextAPI(text, phone, name);
  if (reply && reply !== "SCANNER") {
    await sleep(800);
    const sent = await sendText(reply);
    if (sent) LAST_PROCESSED_MSG_ID[phone] = id;
    IN_FLIGHT.delete(id);
    return sent;
  }
  IN_FLIGHT.delete(id);
  return false;
}

// ── Watch for chat header changes (user switching chats manually) ──
function watchChatChange() {
  const headerArea = document.querySelector('header') || document.body;
  new MutationObserver(() => {
    const title = getContactName();
    if (title !== CURRENT_CHAT && title !== "Unknown") {
      CURRENT_CHAT = title;
      if (!IS_OPENED_BY_POLLER) {
        // User opened this chat manually. Mark its last message as seen so we don't reply to history.
        setTimeout(() => {
          const all = getIncomingMessages();
          if (all.length > 0) {
            const lastMsg = all[all.length - 1];
            const id = lastMsg.getAttribute("data-id");
            const phone = phoneFromId(id);
            if (phone) {
              LAST_PROCESSED_MSG_ID[phone] = id;
              console.log(TAG, `Manual open: marked history as seen for ${phone}`);
            }
          }
        }, 1000);
      }
    }
  }).observe(headerArea, { subtree:true, childList:true, attributes:true, attributeFilter:["title"] });
}

// ── Unread chat poller ─────────────────────────────────────────
async function pollUnread() {
  if (!IS_ENABLED || IS_BUSY) return;
  IS_BUSY = true;
  try {
    const chatItems = document.querySelectorAll('[data-testid="cell-frame-container"]');
    for (const item of chatItems) {
      const badge = item.querySelector('[data-testid="icon-unread-count"]');
      if (!badge) continue;

      const chatName = item.querySelector("span[title]")?.getAttribute("title")||"";
      if (!chatName) continue;

      const lastTime = CHAT_REPLIED[chatName] || 0;
      if (Date.now() - lastTime < 8000) continue;

      console.log(TAG, `📩 Unread detected in "${chatName}" — opening`);
      IS_OPENED_BY_POLLER = true;
      clickChatItem(item);

      // Verify if chat opened (retry up to 3s)
      let chatOpened = false;
      const cleanChat = cleanName(chatName);
      for (let k = 0; k < 6; k++) {
        await sleep(500);
        const currentName = getContactName();
        const cleanCurrent = cleanName(currentName);
        if (cleanCurrent && cleanChat && (cleanCurrent.includes(cleanChat) || cleanChat.includes(cleanCurrent))) {
          chatOpened = true;
          break;
        }
        if (k % 2 === 1) {
          clickChatItem(item);
        }
      }

      if (!chatOpened) {
        console.warn(TAG, `Could not open chat: "${chatName}"`);
        IS_OPENED_BY_POLLER = false;
        continue;
      }

      let lastMsg = null;
      for (let i = 0; i < 8; i++) {
        await sleep(500);
        const all = getIncomingMessages();
        if (all.length > 0) { lastMsg = all[all.length - 1]; break; }
      }

      if (lastMsg) {
        const ok = await processMsg(lastMsg, { force: true });
        if (ok) CHAT_REPLIED[chatName] = Date.now();
        else console.warn(TAG, "Unread chat opened but reply not sent:", chatName);
      } else {
        console.warn(TAG, "No incoming messages found in open chat:", chatName);
        CHAT_REPLIED[chatName] = Date.now();
      }

      IS_OPENED_BY_POLLER = false;
      await sleep(500);
    }
  } catch(e) { 
    console.error(TAG,"pollUnread err:",e.message); 
    IS_OPENED_BY_POLLER = false;
  } finally { 
    IS_BUSY = false; 
  }
}

// ── MutationObserver for open chat ───────────────────────────
function startObserver() {
  new MutationObserver(muts => {
    if (!IS_ENABLED) return;
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType!==1) continue;
        if (n.getAttribute?.("data-id")) { processMsg(n); continue; }
        n.querySelectorAll?.("[data-id]").forEach(el=>processMsg(el));
      }
    }
  }).observe(document.body,{childList:true,subtree:true});
  console.log(TAG, "🔍 Message observer active");
}

// ── Settings sync ─────────────────────────────────────────────
chrome.storage.onChanged.addListener(c=>{
  if (c.isEnabled) IS_ENABLED=c.isEnabled.newValue;
  if (c.apiKey) API_KEY=c.apiKey.newValue;
  if (c.apiBase) API_BASE=(c.apiBase.newValue||"").replace(/\/$/,"");
  if (c.apiKey||c.apiBase) loadScanners();
});

// ── Init ──────────────────────────────────────────────────────
(async()=>{
  await loadSettings();
  await loadScanners();

  if (!API_KEY || !API_BASE) {
    console.warn(TAG, "⚠️ API not configured — click extension icon, enter API URL + key, Save");
  } else {
    console.log(TAG, "API configured:", API_BASE);
  }

  startObserver();
  watchChatChange();
  setInterval(pollUnread, 4000);
  console.log(TAG, "✅ ReplyPilot extension initialized successfully.");
})();
