/* ===================================================
   FARIS STORE — server.js (نسخة مبسطة)
   - تسجيل زبون: اسم + إيميل
   - دخول أدمن: إيميل + كلمة مرور
   - حفظ الطلبات مع أرقام
   =================================================== */
"use strict";

const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

// ── بيانات الأدمن (hash لكلمة المرور) ──────────────
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h.toString(36);
}
const ADMIN_EMAIL = "otaibi511@";
const ADMIN_HASH  = hashStr("otaibi511@");

// ── البيانات في الذاكرة ──────────────────────────────
const users         = new Map(); // email → { name, email, role, createdAt }
const sessions      = new Map(); // token → { email, role, expiresAt }
const orders        = [];        // قائمة الطلبات
const conversations = new Map(); // convId → { name, email, messages, unread, at }
const reviews       = [];

let orderSeq = 0;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

// إضافة حساب الأدمن مباشرة
users.set(ADMIN_EMAIL, {
  name: "فارس",
  email: ADMIN_EMAIL,
  role: "admin",
  createdAt: new Date().toISOString(),
});

// ── مساعدات ────────────────────────────────────────
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => {
      try   { resolve(JSON.parse(body || "{}")); }
      catch { reject(new Error("بيانات غير صحيحة")); }
    });
  });
}
function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
function generateToken() { return crypto.randomBytes(32).toString("hex"); }
function getSession(req) {
  const auth = (req.headers["authorization"] || "").match(/^Bearer\s+(\S+)$/i);
  if (!auth) return null;
  const s = sessions.get(auth[1]);
  if (!s || s.expiresAt < Date.now()) return null;
  return s;
}

// ── API ─────────────────────────────────────────────
async function handleApi(req, res, pathname) {

  // ── تسجيل زبون جديد: POST /api/register { name, email } ──
  if (pathname === "/api/register" && req.method === "POST") {
    let b; try { b = await readJson(req); } catch(e) { return json(res,400,{error:e.message}); }
    const name  = String(b.name  || "").trim().slice(0,40);
    const email = String(b.email || "").trim().toLowerCase().slice(0,80);
    if (!name)  return json(res, 400, { error: "أدخل اسمك" });
    if (!email) return json(res, 400, { error: "أدخل إيميلك" });

    if (!users.has(email)) {
      users.set(email, { name, email, role: "customer", createdAt: new Date().toISOString() });
    } else {
      users.get(email).name = name;
    }
    const token = generateToken();
    sessions.set(token, { email, role: users.get(email).role, expiresAt: Date.now() + SESSION_TTL });
    return json(res, 200, { ok: true, token, user: { name, email, role: users.get(email).role } });
  }

  // ── دخول أدمن: POST /api/admin/login { email, password } ──
  if (pathname === "/api/admin/login" && req.method === "POST") {
    let b; try { b = await readJson(req); } catch(e) { return json(res,400,{error:e.message}); }
    const email = String(b.email    || "").trim().toLowerCase();
    const pass  = String(b.password || "").trim();
    if (email !== ADMIN_EMAIL || hashStr(pass) !== ADMIN_HASH) {
      return json(res, 401, { error: "إيميل أو كلمة المرور غير صحيحة" });
    }
    const token = generateToken();
    sessions.set(token, { email, role: "admin", expiresAt: Date.now() + SESSION_TTL });
    return json(res, 200, { ok: true, token, user: { name: "فارس", email, role: "admin" } });
  }

  // ── بيانات المستخدم: GET /api/me ──
  if (pathname === "/api/me" && req.method === "GET") {
    const s = getSession(req);
    if (!s) return json(res, 401, { error: "غير مسجّل" });
    const u = users.get(s.email);
    return json(res, 200, { name: u?.name || "", email: s.email, role: s.role });
  }

  // ── تسجيل طلب: POST /api/orders { product, priceUSD, priceSAR, payment, contact, notes, userName, userEmail } ──
  if (pathname === "/api/orders" && req.method === "POST") {
    let b; try { b = await readJson(req); } catch(e) { return json(res,400,{error:e.message}); }
    orderSeq += 1;
    const date = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const orderNumber = `FS-${date}-${String(orderSeq).padStart(4,"0")}`;
    const order = {
      orderNumber,
      product:   String(b.product   || ""),
      priceUSD:  String(b.priceUSD  || ""),
      priceSAR:  String(b.priceSAR  || ""),
      payment:   String(b.payment   || ""),
      contact:   String(b.contact   || ""),
      notes:     String(b.notes     || ""),
      userName:  String(b.userName  || "زائر"),
      userEmail: String(b.userEmail || ""),
      status:    "pending",
      createdAt: new Date().toISOString(),
    };
    orders.push(order);
    return json(res, 200, { ok: true, orderNumber });
  }

  // ── قائمة الطلبات: GET /api/orders (أدمن فقط) ──
  if (pathname === "/api/orders" && req.method === "GET") {
    const s = getSession(req);
    if (!s || s.role !== "admin") return json(res, 403, { error: "غير مصرح" });
    return json(res, 200, { orders: orders.slice().reverse() });
  }

  // ── تحديث حالة طلب: POST /api/orders/status { orderNumber, status } ──
  if (pathname === "/api/orders/status" && req.method === "POST") {
    const s = getSession(req);
    if (!s || s.role !== "admin") return json(res, 403, { error: "غير مصرح" });
    let b; try { b = await readJson(req); } catch(e) { return json(res,400,{error:e.message}); }
    const order = orders.find(o => o.orderNumber === b.orderNumber);
    if (!order) return json(res, 404, { error: "الطلب غير موجود" });
    order.status = String(b.status || "pending");
    return json(res, 200, { ok: true });
  }

  // ── قائمة المستخدمين: GET /api/users (أدمن) ──
  if (pathname === "/api/users" && req.method === "GET") {
    const s = getSession(req);
    if (!s || s.role !== "admin") return json(res, 403, { error: "غير مصرح" });
    const list = [];
    for (const [,u] of users) list.push(u);
    return json(res, 200, { users: list });
  }

  // ── قائمة المستخدمين (بدون auth للأدمن المحلي): GET /api/users/list ──
  if (pathname === "/api/users/list" && req.method === "GET") {
    const list = [];
    for (const [,u] of users) list.push({ name: u.name, phone: u.email, role: u.role, lastSeen: u.createdAt });
    return json(res, 200, { users: list });
  }

  // ── المحادثات ──
  if (pathname === "/api/chat/send" && req.method === "POST") {
    let b; try { b = await readJson(req); } catch(e) { return json(res,400,{error:e.message}); }
    const convId = String(b.convId || "");
    const text   = String(b.text   || "").trim().slice(0,500);
    if (!convId || !text) return json(res, 400, { error: "بيانات ناقصة" });
    const conv = conversations.get(convId) || {
      convId, name: String(b.name||"زائر"), email: String(b.email||""),
      messages:[], unread:0, at: Date.now()
    };
    conv.messages.push({ id: crypto.randomUUID(), from:"buyer", text, at: new Date().toISOString() });
    conv.messages = conv.messages.slice(-200);
    conv.unread = (conv.unread||0) + 1;
    conv.at = Date.now();
    conversations.set(convId, conv);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/chat/reply" && req.method === "POST") {
    const s = getSession(req);
    if (!s || s.role !== "admin") return json(res, 403, { error: "غير مصرح" });
    let b; try { b = await readJson(req); } catch(e) { return json(res,400,{error:e.message}); }
    const conv = conversations.get(String(b.convId||""));
    if (!conv) return json(res, 404, { error: "المحادثة غير موجودة" });
    conv.messages.push({ id: crypto.randomUUID(), from:"support", text: String(b.text||"").slice(0,500), at: new Date().toISOString() });
    conv.unread = 0;
    conversations.set(b.convId, conv);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/chat/messages" && req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const convId = url.searchParams.get("convId");
    const s = getSession(req);
    const conv = conversations.get(convId);
    if (!conv) return json(res, 200, { messages: [] });
    if (s?.role !== "admin" && conv.email && conv.email !== s?.email) {
      return json(res, 200, { messages: conv.messages });
    }
    conv.unread = 0;
    return json(res, 200, { messages: conv.messages, name: conv.name });
  }

  if (pathname === "/api/chat/list" && req.method === "GET") {
    const s = getSession(req);
    if (!s || s.role !== "admin") return json(res, 403, { error: "غير مصرح" });
    const list = [];
    for (const [,c] of conversations) {
      list.push({ convId:c.convId, name:c.name, email:c.email,
        lastMsg: c.messages[c.messages.length-1]||null, unread:c.unread||0, at:c.at });
    }
    list.sort((a,b) => (b.at||0)-(a.at||0));
    return json(res, 200, { conversations: list });
  }

  // ── آراء ──
  if (pathname === "/api/reviews/add" && req.method === "POST") {
    let b; try { b = await readJson(req); } catch(e) { return json(res,400,{error:e.message}); }
    reviews.push({ id:crypto.randomUUID(), name:String(b.name||"").slice(0,40),
      rating:Number(b.rating||5), text:String(b.text||"").slice(0,500), at:new Date().toISOString() });
    return json(res, 200, { ok: true });
  }
  if (pathname === "/api/reviews/list" && req.method === "GET") {
    return json(res, 200, { reviews: reviews.slice().reverse().slice(0,20) });
  }

  return json(res, 404, { error: "المسار غير موجود" });
}

// ── الملفات الثابتة ──────────────────────────────────
const MIME = {
  ".html":"text/html",".js":"text/javascript",".css":"text/css",
  ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",
  ".gif":"image/gif",".svg":"image/svg+xml",".ico":"image/x-icon",
};
function serveStatic(req, res, pathname) {
  const p = path.resolve(ROOT, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404); res.end("Not found"); return;
  }
  const ext = path.extname(p).toLowerCase();
  res.writeHead(200, { "Content-Type": `${MIME[ext]||"application/octet-stream"}; charset=utf-8` });
  fs.createReadStream(p).pipe(res);
}

// ── السيرفر ──────────────────────────────────────────
http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    try { await handleApi(req, res, url.pathname); }
    catch(e) { json(res, 500, { error: "خطأ داخلي" }); }
    return;
  }
  serveStatic(req, res, url.pathname);
}).listen(PORT, () => {
  console.log(`\n🎮 Faris Store → http://localhost:${PORT}`);
  console.log(`🛍️  Admin → http://localhost:${PORT}/admin.html`);
  console.log(`👑 Admin email: ${ADMIN_EMAIL}\n`);
});
