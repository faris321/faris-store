/* ===================================================
   FARIS STORE — server.js
   ===================================================
   نظام المصادقة (OTP عبر Twilio)
   نظام المستخدمين (owner / admin / customer)
   نظام المحادثات (كل محادثة خاصة بين الزبون والدعم)
   أرقام الطلبات المستمرة
   لوحة الأدمن (API محمية بـ session token)
   =================================================== */

"use strict";

const http      = require("http");
const https     = require("https");
const fs        = require("fs");
const path      = require("path");
const crypto    = require("crypto");
const qs        = require("querystring");

// ─── إعدادات ───────────────────────────────────────
const PORT      = Number(process.env.PORT || 3000);
const ROOT      = __dirname;

// ══════════════════════════════════════════════════
//  👑 رقم الأونر الوحيد — لا يحتاج .env
const OWNER_PHONE_RAW = "0546252805";
// ══════════════════════════════════════════════════

// وضع التطوير: OTP يظهر في الـ console بدون Twilio
const DEV_MODE = true;

// ─── متجرات البيانات (in-memory) ───────────────────

/** المستخدمون: phone → { name, phone, role: "owner"|"admin"|"customer", createdAt } */
const users = new Map();

/** الجلسات: sessionToken → { phone, createdAt, expiresAt } */
const sessions = new Map();
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 أيام

/** OTP المعلّقة: phone → { code, expiresAt, attempts, name } */
const pendingOtps = new Map();
const OTP_TTL_MS  = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** المحادثات: conversationId → { phone, messages: [{id,from,text,at}], createdAt } */
const conversations = new Map();

/** رابط المحادثة بالمستخدم: phone → conversationId */
const phoneToConversation = new Map();

/** الآراء */
const reviews = [];

/** عداد الطلبات */
let orderSequence = 0;

// ─── مساعدات ───────────────────────────────────────

function normalizePhone(v) {
  const d = String(v || "").replace(/[^\d+]/g, "");
  if (/^05\d{8}$/.test(d))        return `+966${d.slice(1)}`;
  if (/^9665\d{8}$/.test(d))      return `+${d}`;
  if (/^\+9665\d{8}$/.test(d))    return d;
  return null;
}

/** إرجاع دور المستخدم — owner يُحسب من OWNER_PHONE */
function resolveRole(phone) {
  const ownerPhone = normalizePhone(OWNER_PHONE_RAW);
  if (ownerPhone && phone === ownerPhone) return "owner";
  const user = users.get(phone);
  return user ? user.role : "customer";
}

function isStaff(role) { return role === "owner" || role === "admin"; }

function generateToken() { return crypto.randomBytes(32).toString("hex"); }

// ─── تنظيف الجلسات المنتهية ─────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(token);
  }
}, 60 * 60 * 1000);

// ─── Twilio SMS أو وضع Dev (OTP في الـ console) ────
function sendSms(to, body) {
  return new Promise((resolve, reject) => {
    // وضع التطوير: اطبع الـ OTP في الـ console
    if (DEV_MODE) {
      const code = body.match(/\d{6}/)?.[0] || "??????";
      console.log(`\n📱 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   OTP للرقم ${to}: [ ${code} ]`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      resolve("dev-mode");
      return;
    }

    // الإنتاج: Twilio
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) {
      reject(new Error("Twilio غير مفعّل — أضف المتغيرات في ملف .env أو فعّل DEV_MODE"));
      return;
    }
    const req = https.request({
      hostname: "api.twilio.com",
      path: `/2010-04-01/Accounts/${sid}/Messages.json`,
      method: "POST",
      auth: `${sid}:${token}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }, (res) => {
      let buf = "";
      res.on("data", c => { buf += c; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300)
          reject(new Error("Twilio error: " + res.statusCode));
        else resolve(buf);
      });
    });
    req.on("error", reject);
    req.write(qs.stringify({ To: to, From: from, Body: body }));
    req.end();
  });
}

// ─── أدوات HTTP ─────────────────────────────────────
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => {
      try   { resolve(JSON.parse(body || "{}")); }
      catch { reject(new Error("بيانات الطلب غير صحيحة")); }
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

/** استخراج الجلسة من الهيدر أو الكوكي */
function getSession(req) {
  // Authorization: Bearer <token>
  const auth = req.headers["authorization"] || "";
  const bearerMatch = auth.match(/^Bearer\s+(\S+)$/i);
  const token = bearerMatch ? bearerMatch[1] : null;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) return null;
  return { ...session, role: resolveRole(session.phone) };
}

// ─── مشغّل API الرئيسي ──────────────────────────────
async function handleApi(req, res, pathname) {

  // ================================================================
  //  AUTH — /api/auth/*
  // ================================================================

  /** POST /api/auth/request-otp  { name, phone } */
  if (pathname === "/api/auth/request-otp" && req.method === "POST") {
    let body;
    try { body = await readJson(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const phone = normalizePhone(body.phone);
    if (!phone) return json(res, 400, { error: "أدخل رقم جوال سعودي صحيح مثل 05xxxxxxxx" });
    const name = String(body.name || "").trim().slice(0, 40);
    if (!name) return json(res, 400, { error: "أدخل اسمك" });

    const code = String(crypto.randomInt(100000, 1000000));
    pendingOtps.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, name });

    try {
      await sendSms(phone, `رمز تسجيل الدخول إلى فارس ستور: ${code}\nصالح لمدة 5 دقائق.`);
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, 503, { error: e.message });
    }
  }

  /** POST /api/auth/verify-otp  { name, phone, code } */
  if (pathname === "/api/auth/verify-otp" && req.method === "POST") {
    let body;
    try { body = await readJson(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const phone = normalizePhone(body.phone);
    if (!phone) return json(res, 400, { error: "رقم الجوال غير صحيح" });

    const record = pendingOtps.get(phone);
    if (!record || record.expiresAt < Date.now()) {
      pendingOtps.delete(phone);
      return json(res, 400, { error: "انتهت صلاحية الرمز — اطلب رمزًا جديدًا" });
    }
    record.attempts += 1;
    if (record.attempts > MAX_ATTEMPTS) {
      pendingOtps.delete(phone);
      return json(res, 429, { error: "تجاوزت عدد المحاولات — اطلب رمزًا جديدًا" });
    }
    if (String(body.code || "") !== record.code) {
      return json(res, 400, { error: "رمز التحقق غير صحيح" });
    }

    pendingOtps.delete(phone);

    // إنشاء / تحديث المستخدم
    const existingUser = users.get(phone);
    const role = resolveRole(phone);
    const user = existingUser || {
      name: record.name,
      phone,
      role: role === "owner" ? "owner" : "customer",
      createdAt: new Date().toISOString(),
    };
    if (!existingUser) users.set(phone, user);

    // إنشاء session token
    const token = generateToken();
    sessions.set(token, { phone, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL });

    return json(res, 200, {
      ok: true,
      token,
      user: { name: user.name, phone: user.phone, role: user.role },
    });
  }

  /** GET /api/auth/me  — يحتاج Bearer token */
  if (pathname === "/api/auth/me" && req.method === "GET") {
    const session = getSession(req);
    if (!session) return json(res, 401, { error: "يجب تسجيل الدخول أولاً" });
    const user = users.get(session.phone);
    const role = resolveRole(session.phone);
    return json(res, 200, {
      name: user?.name || "",
      phone: session.phone,
      role,
    });
  }

  // ================================================================
  //  ORDERS — /api/orders/*
  // ================================================================

  /** POST /api/users/register  { name, phone } — تسجيل زبون جديد بدون OTP */
  if (pathname === "/api/users/register" && req.method === "POST") {
    let body;
    try { body = await readJson(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const name  = String(body.name  || "").trim().slice(0, 40);
    const phone = String(body.phone || "").trim().slice(0, 20);
    if (!name) return json(res, 400, { error: "الاسم مطلوب" });
    const key = phone || name;
    if (!users.has(key)) {
      users.set(key, {
        name, phone, role: "customer",
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      });
    } else {
      const u = users.get(key);
      u.lastSeen = new Date().toISOString();
      users.set(key, u);
    }
    return json(res, 200, { ok: true });
  }

  /** GET /api/users/list — قائمة المستخدمين (لوحة الأدمن) */
  if (pathname === "/api/users/list" && req.method === "GET") {
    const list = [];
    for (const [, u] of users) list.push(u);
    list.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    return json(res, 200, { users: list });
  }

  /** POST /api/reviews/add  { name, rating, text } */
  if (pathname === "/api/reviews/add" && req.method === "POST") {
    let body;
    try { body = await readJson(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const review = {
      id:     crypto.randomUUID(),
      name:   String(body.name   || "").trim().slice(0, 40),
      rating: Number(body.rating || 5),
      text:   String(body.text   || "").trim().slice(0, 500),
      at:     new Date().toISOString(),
    };
    if (!review.name || !review.text) return json(res, 400, { error: "بيانات ناقصة" });
    reviews.push(review);
    if (reviews.length > 200) reviews.shift(); // نحتفظ بآخر 200 رأي
    return json(res, 200, { ok: true });
  }

  /** GET /api/reviews/list */
  if (pathname === "/api/reviews/list" && req.method === "GET") {
    return json(res, 200, { reviews: reviews.slice().reverse() });
  }

  /** POST /api/orders/register  { product, priceUSD, priceSAR, payment, contact, notes } */
  if (pathname === "/api/orders/register" && req.method === "POST") {
    const session = getSession(req);
    if (!session) return json(res, 401, { error: "يجب تسجيل الدخول لإتمام الطلب" });
    let body;
    try { body = await readJson(req); } catch (e) { return json(res, 400, { error: e.message }); }

    orderSequence += 1;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const orderNumber = `FS-${date}-${String(orderSequence).padStart(4, "0")}`;

    return json(res, 200, { ok: true, orderNumber });
  }

  // ================================================================
  //  CHAT — /api/chat/*
  // ================================================================

  /** GET /api/chat/messages?conversationId=xxx — الزبون يقرأ محادثته فقط */
  if (pathname === "/api/chat/messages" && req.method === "GET") {
    const url    = new URL(req.url, `http://${req.headers.host}`);
    const convId = url.searchParams.get("conversationId");
    const session = getSession(req);

    if (!convId) return json(res, 400, { error: "conversationId مطلوب" });

    const conv = conversations.get(convId);

    // التحقق من الصلاحية: إما الزبون صاحب المحادثة، أو أدمن/أونر
    if (session && isStaff(resolveRole(session.phone))) {
      // الأدمن يرى أي محادثة
      return json(res, 200, { messages: conv ? conv.messages : [], phone: conv?.phone || null });
    }

    if (!conv) return json(res, 200, { messages: [] });

    // الزبون: يرى فقط إذا كانت المحادثة مرتبطة بـ session.phone
    if (!session || conv.phone !== session.phone) {
      // نسمح بالقراءة إذا عرف conversationId فقط (للزوار غير المسجلين)
      // لكن لا نكشف phone
      return json(res, 200, { messages: conv.messages });
    }

    return json(res, 200, { messages: conv.messages });
  }

  /** POST /api/chat/send  { conversationId, text } — الزبون يرسل */
  if (pathname === "/api/chat/send" && req.method === "POST") {
    let body;
    try { body = await readJson(req); } catch (e) { return json(res, 400, { error: e.message }); }
    if (!body.conversationId || !body.text)
      return json(res, 400, { error: "بيانات غير مكتملة" });

    const session = getSession(req);
    const conv = conversations.get(body.conversationId) || {
      phone: session?.phone || null,
      messages: [],
      createdAt: new Date().toISOString(),
      unread: 0,
    };

    // ربط المحادثة بالمستخدم عند أول رسالة
    if (!conv.phone && session?.phone) {
      conv.phone = session.phone;
      phoneToConversation.set(session.phone, body.conversationId);
    }

    const msg = {
      id: body.id || crypto.randomUUID(),
      from: "buyer",
      text: String(body.text).slice(0, 500),
      at: new Date().toISOString(),
    };
    conv.messages.push(msg);
    conv.unread = (conv.unread || 0) + 1;
    conversations.set(body.conversationId, { ...conv, messages: conv.messages.slice(-200) });

    return json(res, 200, { ok: true });
  }

  /** POST /api/chat/reply  { conversationId, text } — الأدمن يرد (يحتاج session أدمن) */
  if (pathname === "/api/chat/reply" && req.method === "POST") {
    const session = getSession(req);
    if (!session || !isStaff(resolveRole(session.phone)))
      return json(res, 403, { error: "غير مصرح — يجب أن تكون أدمن" });

    let body;
    try { body = await readJson(req); } catch (e) { return json(res, 400, { error: e.message }); }
    if (!body.conversationId || !body.text)
      return json(res, 400, { error: "بيانات غير مكتملة" });

    const conv = conversations.get(body.conversationId);
    if (!conv) return json(res, 404, { error: "المحادثة غير موجودة" });

    const msg = {
      id: crypto.randomUUID(),
      from: "support",
      text: String(body.text).slice(0, 500),
      at: new Date().toISOString(),
    };
    conv.messages.push(msg);
    conv.unread = 0; // الأدمن رد، إذاً الرسائل قُرئت
    conversations.set(body.conversationId, { ...conv, messages: conv.messages.slice(-200) });

    return json(res, 200, { ok: true });
  }

  // ================================================================
  //  ADMIN — /api/admin/*  (يحتاج role: owner أو admin)
  // ================================================================

  if (pathname.startsWith("/api/admin/")) {
    const session = getSession(req);
    if (!session || !isStaff(resolveRole(session.phone)))
      return json(res, 403, { error: "غير مصرح" });

    /** GET /api/admin/conversations — قائمة كل المحادثات */
    if (pathname === "/api/admin/conversations" && req.method === "GET") {
      const list = [];
      for (const [id, conv] of conversations) {
        const user = conv.phone ? users.get(conv.phone) : null;
        list.push({
          conversationId: id,
          phone: conv.phone,
          name: user?.name || "زائر",
          lastMessage: conv.messages[conv.messages.length - 1] || null,
          unread: conv.unread || 0,
          createdAt: conv.createdAt,
        });
      }
      // الأحدث أولاً
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return json(res, 200, { conversations: list });
    }

    /** GET /api/admin/conversation/:id — تفاصيل محادثة بعينها */
    const convDetailMatch = pathname.match(/^\/api\/admin\/conversation\/(.+)$/);
    if (convDetailMatch && req.method === "GET") {
      const conv = conversations.get(convDetailMatch[1]);
      if (!conv) return json(res, 404, { error: "المحادثة غير موجودة" });
      const user = conv.phone ? users.get(conv.phone) : null;
      // اعتبار الرسائل مقروءة عند فتح الأدمن للمحادثة
      conv.unread = 0;
      conversations.set(convDetailMatch[1], conv);
      return json(res, 200, {
        conversationId: convDetailMatch[1],
        phone: conv.phone,
        name: user?.name || "زائر",
        messages: conv.messages,
      });
    }

    /** GET /api/admin/users — قائمة المستخدمين (owner فقط) */
    if (pathname === "/api/admin/users" && req.method === "GET") {
      const role = resolveRole(session.phone);
      if (role !== "owner") return json(res, 403, { error: "هذا الإجراء للأونر فقط" });
      const list = [];
      for (const [, user] of users) {
        list.push({ name: user.name, phone: user.phone, role: user.role, createdAt: user.createdAt });
      }
      return json(res, 200, { users: list });
    }

    /** POST /api/admin/set-role  { phone, role } — تغيير رتبة (owner فقط) */
    if (pathname === "/api/admin/set-role" && req.method === "POST") {
      const callerRole = resolveRole(session.phone);
      if (callerRole !== "owner") return json(res, 403, { error: "هذا الإجراء للأونر فقط" });

      let body;
      try { body = await readJson(req); } catch (e) { return json(res, 400, { error: e.message }); }

      const targetPhone = normalizePhone(body.phone);
      if (!targetPhone) return json(res, 400, { error: "رقم الجوال غير صحيح" });
      const newRole = body.role;
      if (!["admin", "customer"].includes(newRole))
        return json(res, 400, { error: "الرتبة يجب أن تكون admin أو customer" });

      const ownerPhone = normalizePhone(OWNER_PHONE_RAW);
      if (targetPhone === ownerPhone)
        return json(res, 400, { error: "لا يمكن تغيير رتبة الأونر" });

      const user = users.get(targetPhone);
      if (!user) return json(res, 404, { error: "المستخدم غير مسجل بعد" });

      user.role = newRole;
      users.set(targetPhone, user);
      return json(res, 200, { ok: true, phone: targetPhone, role: newRole });
    }

    return json(res, 404, { error: "المسار غير موجود" });
  }

  // ================================================================
  //  fallback
  // ================================================================
  return json(res, 404, { error: "المسار غير موجود" });
}

// ─── تقديم الملفات الثابتة ──────────────────────────
const MIME = {
  ".html": "text/html",
  ".js":   "text/javascript",
  ".css":  "text/css",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".json": "application/json",
  ".woff2":"font/woff2",
};

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath  = path.resolve(ROOT, `.${requested}`);

  // منع traversal attacks
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end("Not found"); return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": `${MIME[ext] || "application/octet-stream"}; charset=utf-8` });
  fs.createReadStream(filePath).pipe(res);
}

// ─── السيرفر ─────────────────────────────────────────
http.createServer(async (req, res) => {
  // CORS بسيط للـ development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    try { await handleApi(req, res, url.pathname); }
    catch (e) { json(res, 500, { error: "خطأ داخلي في السيرفر" }); }
    return;
  }
  serveStatic(req, res, url.pathname);
}).listen(PORT, () => {
  console.log(`\n🎮 Faris Store → http://localhost:${PORT}`);
  console.log(`🛍️  Admin Panel → http://localhost:${PORT}/admin.html`);
  const ownerPhone = normalizePhone(OWNER_PHONE_RAW);
  if (ownerPhone) console.log(`👑 Owner phone : ${ownerPhone}`);
  else            console.log(`⚠️  OWNER_PHONE_RAW غير صحيح: "${OWNER_PHONE_RAW}"`);
  if (DEV_MODE) {
    console.log(`\n🔧 DEV MODE: رمز OTP سيظهر هنا في الـ console بدل الإرسال بـ SMS`);
    console.log(`   لتفعيل Twilio أضف بيانات Twilio وضع NODE_ENV=production\n`);
  }
});
