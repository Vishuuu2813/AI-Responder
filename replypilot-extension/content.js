// ReplyPilot Extension — content.js (v8)
const TAG = "[ReplyPilot]";
const LAST_PROCESSED_MSG_ID = {}; // phone -> last processed incoming message ID
const CHAT_REPLIED = {}; // chatName -> lastClickedTimestamp
let API_KEY = "", API_BASE = "", IS_ENABLED = false, SCANNERS = [], IS_BUSY = false;
let CURRENT_CHAT = "";
let IS_OPENED_BY_POLLER = false;
const IN_FLIGHT = new Set();
let LAST_SENT_MESSAGE_TEXT = "";
let LAST_SENT_TIMESTAMP = 0;

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

// ── Extract phone from chat URL or header (fallback for unsaved/new format msgs) ──
function phoneFromContext() {
  // WhatsApp Web URL sometimes contains the JID after open/
  const urlMatch = window.location.href.match(/\/([0-9]{10,15})/);
  if (urlMatch) return urlMatch[1];
  
  // For unsaved contacts, the header title IS the phone number
  const name = getContactName();
  const cleaned = name.replace(/[\s\+\-\(\)]/g, "");
  if (/^[0-9]{10,15}$/.test(cleaned)) return cleaned;
  
  // If saved contact, return the name itself as a unique identifier for mapping
  return name !== "Unknown" ? name : null;
}

// Extract phone/group ID from data-id, or fall back to chat context
function phoneFromId(msgId) {
  if (!msgId) return phoneFromContext();
  const m = msgId.match(/(?:false|true)_([^@]+)@/);
  if (m) return m[1];
  // New format or random hash IDs don't embed the phone — get from context
  return phoneFromContext();
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
    '[data-testid="chat-title"]',
    'span[title]',
    '[dir="auto"]'
  ];

  for (const s of selectors) {
    const el = mainHeader.querySelector(s);
    if (el) {
      const val = el.getAttribute("title") || el.innerText || "";
      const cleaned = val.trim();
      if (cleaned && cleaned.length > 1 && cleaned !== "click here for contact info" && !cleaned.toLowerCase().includes("typing") && !cleaned.toLowerCase().includes("online")) {
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

// ── Identify Outgoing vs Incoming ──────────────────────────────
function isOutgoingMessage(msgEl, chatName) {
  // 1. Check classes on the element or its closest row/parent for "message-out"
  const rowOut = msgEl.closest('.message-out, [class*="message-out"], [class*="-out"]');
  if (rowOut) return true;

  const rowIn = msgEl.closest('.message-in, [class*="message-in"], [class*="-in"]');
  if (rowIn) return false;

  // 2. Check computed style alignment of the message container or bubble
  try {
    const parent = msgEl.closest('[data-testid^="conv-msg-"]') || msgEl;
    const computed = window.getComputedStyle(parent);
    const alignSelf = computed.alignSelf || '';
    const justifySelf = computed.justifySelf || '';
    const justifyItems = computed.justifyItems || '';
    const textAlign = computed.textAlign || '';
    const float = computed.float || '';
    
    if (alignSelf.includes('end') || justifySelf.includes('end') || justifyItems.includes('end') || textAlign.includes('right') || float === 'right') {
      return true;
    }
  } catch (e) {}

  // 3. Check for checkmarks/ticks (only present in outgoing messages)
  const hasCheckmark = msgEl.querySelector('[data-testid="msg-check"], [data-testid="msg-dblcheck"], [data-testid="status-check"], [data-testid="status-dblcheck"], [data-testid="msg-check-light"], [data-testid="msg-dblcheck-light"], [data-testid="status-time"]');
  if (hasCheckmark) return true;

  // 4. Check data-pre-plain-text if available
  const copyable = msgEl.querySelector('.copyable-text') || msgEl.closest('.copyable-text') || msgEl;
  if (copyable && typeof copyable.getAttribute === 'function') {
    const preText = copyable.getAttribute('data-pre-plain-text') || '';
    if (preText) {
      // Regex matches sender name between the closing square bracket and the colon
      const match = preText.match(/\]\s*([^:]+):/);
      if (match) {
        const senderName = match[1].trim().toLowerCase();
        const cleanSender = cleanName(senderName);
        const cleanChat = cleanName(chatName);

        // Common outgoing sender names
        if (["you", "aap", "आप", "me", "mainmumbai", "mainmumbaisupport"].includes(cleanSender)) {
          return true;
        }

        // If it's a 1-on-1 chat, the chatName matches the contact name.
        // If the sender name doesn't match the contact, it must be outgoing (us)
        if (cleanChat && cleanSender && cleanSender !== cleanChat) {
          // Verify we aren't in a group chat by checking header contents for commas or 'group'
          const headerText = document.querySelector('#main header')?.innerText || '';
          const isGroup = headerText.includes(',') || headerText.toLowerCase().includes('group');
          if (!isGroup) {
            return true;
          }
        }
      }
      
      // Fallback standard checks
      if (preText.toLowerCase().includes('you:')) return true;
    }
  }

  return false;
}

// ── Get all message elements in active chat de-duplicated ───────
function getAllMessageElements() {
  const main = document.querySelector("#main");
  if (!main) return [];
  
  // Query stable message elements (conv-msg-, copyable-text, and data-id elements)
  const rawList = main.querySelectorAll('[data-testid^="conv-msg-"], .copyable-text, [data-id]');
  const uniqueMessages = [];
  const seenIds = new Set();
  const seenElRef = new Set();
  
  for (const el of rawList) {
    let msgContainer = el.closest('[data-testid^="conv-msg-"], [data-id]') || el;
    
    // De-duplicate by DOM element reference
    if (seenElRef.has(msgContainer)) continue;
    seenElRef.add(msgContainer);

    // De-duplicate by ID if present
    const id = msgContainer.getAttribute("data-id") || msgContainer.getAttribute("data-testid") || "";
    if (id) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    
    uniqueMessages.push(msgContainer);
  }
  return uniqueMessages;
}

// ── Check if the last message in chat is outgoing (to prevent loops) ─
function isLastMessageOutgoing() {
  const all = getAllMessageElements();
  if (all.length === 0) return false;
  
  const lastEl = all[all.length - 1];
  const chatName = getContactName();
  return isOutgoingMessage(lastEl, chatName);
}

function getIncomingMessages() {
  const chatName = getContactName();
  const all = getAllMessageElements();
  const incoming = all.filter(m => !isOutgoingMessage(m, chatName));
  console.log(TAG, `🔍 getIncomingMessages: total=${all.length}, incoming=${incoming.length}`);
  return incoming;
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
      inserted = true;
    }
  } else {
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }

  await sleep(600);
  const btn = getSend();
  if (btn && !btn.disabled) {
    LAST_SENT_MESSAGE_TEXT = text;
    LAST_SENT_TIMESTAMP = Date.now();
    btn.click();
    console.log(TAG, "🚀 Sent reply:", text.slice(0, 50));
    return true;
  }
  LAST_SENT_MESSAGE_TEXT = text;
  LAST_SENT_TIMESTAMP = Date.now();
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
  console.log(TAG, "🚀 Sent reply (Enter):", text.slice(0, 50));
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
    getSend()?.click(); console.log(TAG,"🚀 Image sent");
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
  if (sc) { 
    console.log(TAG, "🔍 Match found for local scanner keywords. Sending scanner image...");
    await sleep(800); 
    await sendImage(sc.imageBase64); 
    return "SCANNER"; 
  }

  try {
    const url = `${API_BASE}/api/messages/incoming`;
    const body = { content:text, contactPhone:phone, contactName:name||phone, source:"whatsapp" };
    console.log(TAG, "📤 POSTing text API request to:", url, "body:", body);
    const r = await fetch(url,{
      method:"POST", headers:{"Content-Type":"application/json","x-api-key":API_KEY},
      body: JSON.stringify(body)
    });
    if (r.ok) {
      const d = await r.json();
      console.log(TAG, "📥 POST text API response success:", d);
      if (!d.reply) console.warn(TAG, "API returned no reply:", d.reason || "unknown");
      return d.reply || null;
    }
    console.error(TAG, `❌ API error response ${r.status}:`, await r.text());
  } catch(e) { console.error(TAG,"❌ callTextAPI exception:",e.message); }
  return null;
}

async function callPayAPI(b64, phone, name) {
  if (!API_KEY||!API_BASE||!phone||phone.length<5) return null;
  try {
    const url = `${API_BASE}/api/payment/screenshot`;
    const body = { imageBase64:b64.slice(0, 100) + "...[truncated]", contactPhone:phone, contactName:name||phone, source:"whatsapp" };
    console.log(TAG, "📤 POSTing image API request to:", url, "body:", body);
    const r = await fetch(url,{
      method:"POST", headers:{"Content-Type":"application/json","x-api-key":API_KEY},
      body: JSON.stringify({ imageBase64:b64, contactPhone:phone, contactName:name||phone, source:"whatsapp" })
    });
    if (r.ok) { 
      const d=await r.json(); 
      console.log(TAG, "📥 POST image API response success:", d);
      return d.reply||null; 
    }
    console.error(TAG, `❌ API error response ${r.status}:`, await r.text());
  } catch(e) { console.error(TAG,"❌ callPayAPI exception:",e.message); }
  return null;
}

// ── Process one message ───────────────────────────────────────
async function processMsg(msgEl, opts = {}) {
  const force = !!opts.force;
  const id = msgEl.getAttribute("data-id") || msgEl.getAttribute("data-testid") || "";
  console.log(TAG, "🔍 processMsg called for element ID:", id);

  // Cooldown safety guard: ignore DOM updates within 2 seconds of sending a reply to prevent loop triggers
  if (Date.now() - LAST_SENT_TIMESTAMP < 2000) {
    console.log(TAG, "skip: message processed too close to our last sent message (cooldown active)");
    return false;
  }

  const chatName = getContactName();
  const isOut = isOutgoingMessage(msgEl, chatName);
  console.log(TAG, `🤔 Message direction check: isOutgoing=${isOut}`);
  if (isOut) {
    console.log(TAG, "skip: message is outgoing");
    return false;
  }

  const phone = phoneFromId(id);
  console.log(TAG, "📱 Phone/Identifier detected:", phone);
  if (!phone) {
    console.log(TAG, "skip: no phone/identifier detected for message", id);
    return false;
  }

  if (LAST_PROCESSED_MSG_ID[phone] === id && !force) {
    console.log(TAG, "skip: already processed message", id);
    return false;
  }
  if (IN_FLIGHT.has(id)) {
    console.log(TAG, "skip: message in-flight", id);
    return false;
  }
  IN_FLIGHT.add(id);

  if (!API_KEY || !API_BASE) {
    console.warn(TAG, "skip: API not configured — open extension popup and save API URL + key");
    IN_FLIGHT.delete(id);
    return false;
  }

  const name = getContactName();

  // Look for image inside the message bubble container (avoiding sibling avatar column)
  const bubble = msgEl.querySelector(".copyable-text") || msgEl.querySelector('[data-testid="msg-container"]') || msgEl;
  let hasImg = false;
  const imgs = bubble.querySelectorAll("img[src]");
  for (const img of imgs) {
    const src = img.src || "";
    if (src.includes("emoji") || src.includes("profile") || src.includes("pps.whatsapp.net")) {
      continue;
    }
    if (src.startsWith("blob:") || img.getAttribute("data-testid") === "image-element") {
      hasImg = true;
      break;
    }
  }
  if (!hasImg && bubble.querySelector("[data-testid='media-url-provider']")) {
    hasImg = true;
  }

  if (hasImg) {
    console.log(TAG, "📷 Image message detected from", phone);
    LAST_PROCESSED_MSG_ID[phone] = id;
    console.log(TAG, "⏳ Extracting base64 image data...");
    const b64 = await imgBase64(msgEl);
    if (b64) {
      console.log(TAG, "📤 Sending image API request to payment endpoint...");
      const reply = await callPayAPI(b64, phone, name);
      console.log(TAG, "📥 Image API response:", reply);
      if (reply) {
        await sleep(800);
        const sent = await sendText(reply);
        console.log(TAG, "🚀 Image reply send result:", sent);
        IN_FLIGHT.delete(id);
        return sent;
      }
    } else {
      console.warn(TAG, "⚠️ Failed to extract base64 data from image");
      const reply = "📸 *Payment screenshot bhejo!*\n\nPoints add karwane ke liye payment confirmation screenshot bhejo.";
      await sleep(800);
      const sent = await sendText(reply);
      console.log(TAG, "🚀 Fallback reply send result:", sent);
      IN_FLIGHT.delete(id);
      return sent;
    }
    IN_FLIGHT.delete(id);
    return false;
  }

  const text = getMessageText(msgEl);
  console.log(TAG, "📝 Text extracted:", text);
  if (text && text === LAST_SENT_MESSAGE_TEXT) {
    console.log(TAG, "skip: message text matches our last sent message");
    return false;
  }
  if (!text || text.length < 1) {
    console.log(TAG, "skip: empty text message", id);
    IN_FLIGHT.delete(id);
    return false;
  }

  console.log(TAG, `💬 Processing text: "${text.slice(0, 50)}" | phone:${phone}`);
  console.log(TAG, "📤 Sending text API request to messages incoming endpoint...");
  const reply = await callTextAPI(text, phone, name);
  console.log(TAG, "📥 Text API response:", reply);
  if (reply && reply !== "SCANNER") {
    await sleep(800);
    const sent = await sendText(reply);
    console.log(TAG, "🚀 Text reply send result:", sent);
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
            const id = lastMsg.getAttribute("data-id") || lastMsg.getAttribute("data-testid") || "";
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

// ── Unread chat badge finder helper ──────────────────────────────
function getUnreadBadge(item) {
  return item.querySelector('[data-testid="icon-unread-count"]')
    || item.querySelector('span[class*="unread"]')
    || item.querySelector('[aria-label*="unread"]')
    || item.querySelector('[class*="unread-count"]');
}

// ── Unread chat poller ─────────────────────────────────────────
async function pollUnread() {
  if (!IS_ENABLED || IS_BUSY) return;
  IS_BUSY = true;
  try {
    const chatItems = document.querySelectorAll('[data-testid="cell-frame-container"]');
    for (const item of chatItems) {
      const badge = getUnreadBadge(item);
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

      // Wait for messages to load, with longer timeout
      let lastMsg = null;
      for (let i = 0; i < 10; i++) {
        await sleep(500);
        const all = getIncomingMessages();
        if (all.length > 0) { lastMsg = all[all.length - 1]; break; }
      }

      if (lastMsg) {
        // Prevent double reply if the absolute last message in chat is already outgoing
        if (isLastMessageOutgoing()) {
          console.log(TAG, `Skip: last message in chat "${chatName}" is outgoing. Already replied.`);
          CHAT_REPLIED[chatName] = Date.now();
          IS_OPENED_BY_POLLER = false;
          continue;
        }

        const ok = await processMsg(lastMsg, { force: true });
        if (ok) {
          CHAT_REPLIED[chatName] = Date.now();
          console.log(TAG, `✅ Replied in "${chatName}"`);
        } else {
          // Mark as handled so we don't keep retrying indefinitely
          CHAT_REPLIED[chatName] = Date.now();
          console.warn(TAG, `Unread chat opened but reply not sent: ${chatName} (marked to avoid loop)`);
        }
      } else {
        console.warn(TAG, "No valid incoming messages found in open chat:", chatName);
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
        
        // Check if node itself matches message attributes
        const isMsg = n.matches?.('[data-testid^="conv-msg-"], .copyable-text, [data-id]');
        if (isMsg) {
          console.log(TAG, "🔍 MutationObserver: New message element added directly:", n.getAttribute("data-id") || n.getAttribute("data-testid") || "");
          processMsg(n);
          continue;
        }
        
        // Check nested elements
        const msgEls = n.querySelectorAll?.('[data-testid^="conv-msg-"], .copyable-text, [data-id]');
        if (msgEls && msgEls.length > 0) {
          msgEls.forEach(el => {
            console.log(TAG, "🔍 MutationObserver: Nested message element added:", el.getAttribute("data-id") || el.getAttribute("data-testid") || "");
            processMsg(el);
          });
        }
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
  console.log(TAG, "✅ ReplyPilot extension v8 initialized successfully.");
})();
