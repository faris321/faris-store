/* ===========================
   FARIS STORE — main.js  (نسخة بدون سيرفر)
   =========================== */

// ─── إعدادات ──────────────────────────────────────────
const WHATSAPP_NUMBER = "966546252805";
const PAYPAL_ME_URL   = "https://paypal.me/farisstore1";

// ─── Telegram إشعارات الطلبات ─────────────────────────
const TG_TOKEN   = "8810812697:AAE0f9l1L5MsFuaeA2wcsqpIZBuRKKqwzlM";
const TG_CHAT_ID = "123156782";

const PAYMENT_ICONS = {
  "Apple Pay":  "🍎",
  "STC Pay":    "📱",
  "تحويل بنكي": "🏦",
  "PayPal":     "💳",
  "Robux":      "🎮",
};

// ─── مفاتيح localStorage ──────────────────────────────
const KEYS = {
  user:   "fs-user",           // { name } بيانات المستخدم
  convId: "fs-conv-id",        // conversationId للزبون
  convs:  "fs-conversations",  // كل المحادثات (تُقرأ من الأدمن)
  users:  "fs-users",          // قائمة المستخدمين
  orders: "fs-order-seq",      // عداد الطلبات
};

// ─── Storage helpers ──────────────────────────────────
function loadStore(key, def = {}) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; }
  catch { return def; }
}
function saveStore(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ==========================
   LANGUAGE & CURRENCY
   ========================== */

// ── العملة ──────────────────────────────────────────
function setCurrency(val) {
  localStorage.setItem("fs-currency", val);
  document.querySelectorAll(".price-block").forEach(block => {
    const usd = block.querySelector(".price-usd");
    const sar = block.querySelector(".price-sar");
    if (!usd || !sar) return;
    if (val === "usd")  { usd.hidden = false; sar.hidden = true;  }
    if (val === "sar")  { usd.hidden = true;  sar.hidden = false; }
    if (val === "both") { usd.hidden = false; sar.hidden = false; }
  });
}

// ── اللغة ───────────────────────────────────────────
const TRANSLATIONS = {
  // nav
  "🍓 حسابات بلوكس فروت": "🍓 Blox Fruits Accounts",
  "🔱 ريس V4":             "🔱 Race V4",
  "🍓 بلوكس فروت":         "🍓 Blox Fruits",
  "🔪 MM2":                "🔪 MM2",
  "👁️ GPO":               "👁️ GPO",
  "تسجيل الدخول":          "Sign In",
  // section titles
  "حسابات بلوكس فروت":          "Blox Fruits Accounts",
  "حسابات بلوكس فروت — ريس V4": "Blox Fruits — Race V4",
  "اغراض وفواكه بلوكس فروت":    "Blox Fruits Items",
  "مردر مستري 2":                "Murder Mystery 2",
  "جراند بيس أونلاين":           "Grand Piece Online",
  // section subtitles
  "حسابات جاهزة بكامل التجهيزات لكل ريس من الريس الرابع":
    "Ready accounts with full gear for every Race V4",
  "أسلحة نادرة وسيتات حصرية — اجعل حسابك الأبرز في الغرفة":
    "Rare weapons & exclusive sets — stand out in every room",
  "فواكه عادية للتداول وباسات نادرة":
    "Regular fruits for trading and rare gamepasses",
  "💰 كل الحسابات بسعر $5.00 / 18.75 ريال":
    "💰 All accounts priced at $5.00 / 18.75 SAR",
  // product names
  "حساب بلوكس فروت عشوائي": "Random Blox Fruits Account",
  "حساب ريس غول V4":        "Ghoul V4 Account",
  "حساب ريس أنجل V4":       "Angel V4 Account",
  "حساب ريس سايبرغ V4":     "Cyborg V4 Account",
  "حساب ريس شارك V4":       "Shark V4 Account",
  "حساب ريس مينك V4":       "Mink V4 Account",
  "حساب ريس هيومان V4":     "Human V4 Account",
  // product descs
  "حساب بلوكس فروت عشوائي — قد تحصل على حساب نادر أو مليء بالآيتمات!":
    "Random Blox Fruits account — may contain rare or item-packed account!",
  "Full Gear — مجهز بالكامل لريس الغول":    "Full Gear — fully equipped for Ghoul race",
  "Full Gear — مجهز بالكامل لريس الأنجل":   "Full Gear — fully equipped for Angel race",
  "Full Gear — مجهز بالكامل لريس السايبرغ": "Full Gear — fully equipped for Cyborg race",
  "Full Gear — مجهز بالكامل لريس الشارك":   "Full Gear — fully equipped for Shark race",
  "Full Gear — مجهز بالكامل لريس المينك":   "Full Gear — fully equipped for Mink race",
  "Full Gear — مجهز بالكامل لريس الهيومان": "Full Gear — fully equipped for Human race",
  // buttons
  "اطلب الآن": "Order Now",
  "اطلب":      "Order",
  "ادفع الآن": "Pay Now",
  // badges
  "🔥 الأكثر مبيعاً": "🔥 Best Seller",
  "الأكثر مبيعاً":    "Best Seller",
  "⭐ الأكثر طلباً":  "⭐ Most Popular",
  "👑 أسطوري":        "👑 Legendary",
  "🌟 نادر جداً":     "🌟 Very Rare",
  "🌟 نادر":          "🌟 Rare",
  "🎄 حصري":          "🎄 Exclusive",
  "🔥 مميز":          "🔥 Special",
  "🔥 كوليكتبل":      "🔥 Collectable",
  "⚔️ أسطوري":        "⚔️ Legendary",
};

let currentLang = localStorage.getItem("fs-lang") || "ar";
const originalTexts = new Map();

function toggleLang() {
  currentLang = currentLang === "ar" ? "en" : "ar";
  localStorage.setItem("fs-lang", currentLang);
  applyLang();
}

function applyLang() {
  const btn = document.getElementById("langToggle");
  if (!btn) return;

  if (currentLang === "en") {
    btn.textContent = "🌐 AR";
    document.documentElement.dir  = "ltr";
    document.documentElement.lang = "en";
    // ترجمة النصوص
    document.querySelectorAll("[data-ar]").forEach(el => {
      if (!el.dataset.en) return;
      el.textContent = el.dataset.en;
    });
    // ترجمة تلقائية للنصوص الموجودة
    autoTranslate("en");
  } else {
    btn.textContent = "🌐 EN";
    document.documentElement.dir  = "rtl";
    document.documentElement.lang = "ar";
    autoTranslate("ar");
  }
}

function autoTranslate(toLang) {
  const selectors = [
    ".section-title",
    ".section-subtitle",
    ".nav-links a",
    ".btn-buy",
    ".card-badge",
    ".product-name",
    ".product-desc",
    "#accountButtonLabel",
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      // نتجاهل العناصر اللي فيها أبناء معقدة (مثل أزرار فيها أيقونات)
      const hasComplexChildren = [...el.children].some(c => c.tagName === "I" || c.tagName === "IMG");
      if (hasComplexChildren) return;

      const ar = el.getAttribute("data-orig") || el.textContent.trim();
      if (!el.getAttribute("data-orig")) el.setAttribute("data-orig", ar);

      if (toLang === "en") {
        const en = TRANSLATIONS[ar];
        if (en) el.textContent = en;
      } else {
        const orig = el.getAttribute("data-orig");
        if (orig) el.textContent = orig;
      }
    });
  });
}

/* ==========================
   NAVBAR
   ========================== */
const header      = document.getElementById("header");
const hamburger   = document.getElementById("hamburger");
const navLinks    = document.getElementById("navLinks");
const scrollTopBtn = document.getElementById("scrollTop");

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 50);
  scrollTopBtn.classList.toggle("visible", window.scrollY > 400);
});

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navLinks.classList.toggle("open");
});

navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navLinks.classList.remove("open");
  });
});

scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

/* ==========================
   ORDER MODAL
   ========================== */
const modal = document.getElementById("orderModal");
let currentProduct = { name: "", priceUSD: "", priceSAR: "" };

function openOrder(productName, priceUSD, priceSAR) {
  currentProduct = { name: productName, priceUSD, priceSAR };
  document.getElementById("modalProductInfo").innerHTML = `
    <div class="pname">🛍️ ${productName}</div>
    <div class="pprice">${priceUSD} &nbsp;|&nbsp; ${priceSAR}</div>`;

  // إظهار الفورم وإخفاء شاشة التأكيد
  const form    = document.getElementById("orderForm");
  const confirm = document.getElementById("orderConfirm");
  if (form)    { form.hidden = false;    form.style.display    = "flex"; }
  if (confirm) { confirm.hidden = true;  confirm.style.display = "none"; }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  document.getElementById("orderForm").reset();
  setTimeout(() => document.getElementById("buyerContact")?.focus(), 300);
}

function closeOrder() {
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

modal.addEventListener("click", e => { if (e.target === modal) closeOrder(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && modal.classList.contains("active")) closeOrder();
});

/* ==========================
   SUBMIT ORDER → WHATSAPP
   ========================== */
function submitOrder(e) {
  e.preventDefault();

  const user    = loadStore(KEYS.user, null);
  const contact = document.getElementById("buyerContact").value.trim();
  const sel     = document.querySelector('input[name="payment"]:checked');
  const payment = sel ? sel.value : "";
  const notes   = document.getElementById("orderNotes").value.trim();

  if (!contact || !payment) {
    showToast("⚠️ يرجى ملء جميع الحقول المطلوبة", "error");
    return;
  }

  // توليد رقم الطلب
  const seq  = Number(localStorage.getItem(KEYS.orders) || 0) + 1;
  localStorage.setItem(KEYS.orders, String(seq));
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const orderNumber = `FS-${date}-${String(seq).padStart(4, "0")}`;

  const name = user?.name || "زائر";
  const icon = PAYMENT_ICONS[payment] || "💳";

  // رسالة التيليجرام
  const tgMsg = `🛒 *طلب جديد — فارس ستور*
🧾 *رقم الطلب:* \`${orderNumber}\`

━━━━━━━━━━━━━━━━
🛍️ *المنتج:* ${currentProduct.name}
💵 *السعر:* ${currentProduct.priceUSD} | ${currentProduct.priceSAR}
━━━━━━━━━━━━━━━━
👤 *الاسم:* ${name}
${user?.phone ? `☎️ *الجوال:* ${user.phone}\n` : ""}📱 *التواصل:* ${contact}
${icon} *طريقة الدفع:* ${payment}${notes ? `\n📝 *ملاحظات:* ${notes}` : ""}
━━━━━━━━━━━━━━━━
⚡ الحالة: *قيد التحضير*`;

  // إرسال إشعار تيليجرام
  sendTelegramNotification(tgMsg);

  // إذا اختار PayPal → افتح رابط الدفع
  if (payment === "PayPal") {
    const amountUSD = currentProduct.priceUSD.replace(/[^0-9.]/g, "");
    const paypalURL = `${PAYPAL_ME_URL}/${amountUSD}USD`;
    window.open(paypalURL, "_blank");
    // أظهر زر تأكيد الدفع بعد الفتح
    showPaymentPending(orderNumber, "PayPal");
  } else {
    // باقي طرق الدفع → أظهر التأكيد مباشرة
    showOrderConfirm(orderNumber);
  }
}

/* ==========================
   شاشات تأكيد الطلب
   ========================== */
function showOrderConfirm(orderNumber) {
  const form    = document.getElementById("orderForm");
  const confirm = document.getElementById("orderConfirm");
  const numEl   = document.getElementById("confirmOrderNum");
  if (form)    { form.hidden = true;     form.style.display    = "none"; }
  if (confirm) { confirm.hidden = false; confirm.style.display = "flex"; }
  if (numEl)   { numEl.textContent = orderNumber; }
}

function showPaymentPending(orderNumber, method) {
  const form    = document.getElementById("orderForm");
  const confirm = document.getElementById("orderConfirm");
  const numEl   = document.getElementById("confirmOrderNum");

  // أخفِ الفورم
  if (form) { form.hidden = true; form.style.display = "none"; }

  // أظهر شاشة الانتظار — بدون رقم الطلب بعد
  if (confirm) {
    confirm.hidden = false;
    confirm.style.display = "flex";

    // استبدل محتوى الشاشة بشاشة انتظار الدفع
    confirm.innerHTML = `
      <div style="font-size:2.8rem;">⏳</div>
      <h3 style="font-size:1.1rem;font-weight:900;color:var(--text);">في انتظار تأكيد الدفع</h3>
      <div style="
        background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.3);
        border-radius:12px; padding:14px 20px; width:100%;
        font-size:.88rem; color:#fbbf24; line-height:1.6; text-align:center;
      ">
        <i class="fas fa-exclamation-circle" style="margin-left:6px;"></i>
        أكمل الدفع عبر <strong>${method}</strong> ثم ارجع واضغط الزر أدناه
      </div>
      <button id="confirmPayBtn" class="btn btn-primary" style="width:100%;justify-content:center;">
        <i class="fab fa-paypal"></i> أكّدت إتمام الدفع
      </button>
      <button class="btn btn-outline" onclick="cancelPayment()" style="width:100%;justify-content:center;font-size:.85rem;">
        <i class="fas fa-times"></i> إلغاء / رجوع
      </button>
    `;

    // ربط زر التأكيد
    document.getElementById("confirmPayBtn").onclick = function() {
      if (numEl) numEl.textContent = orderNumber;
      confirm.innerHTML = `
        <div style="font-size:3rem;">✅</div>
        <h3 style="font-size:1.2rem;font-weight:900;color:var(--text);">تم استلام طلبك!</h3>
        <div style="background:rgba(124,58,237,.12);border:1px solid rgba(124,58,237,.3);border-radius:12px;padding:14px 24px;width:100%;">
          <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:4px;">رقم طلبك</div>
          <div id="confirmOrderNum" style="font-size:1.4rem;font-weight:900;color:var(--primary-light);letter-spacing:.05em;">${orderNumber}</div>
        </div>
        <div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:10px 20px;width:100%;font-size:.9rem;font-weight:700;color:#34d399;display:flex;align-items:center;justify-content:center;gap:8px;">
          <i class="fas fa-clock"></i> طلبك قيد التحضير
        </div>
        <p style="font-size:.82rem;color:var(--text-muted);line-height:1.6;">
          سيتم التواصل معك قريباً لإتمام الطلب.<br/>احتفظ برقم طلبك للمتابعة.
        </p>
        <button class="btn btn-outline" onclick="closeOrder()" style="width:100%;justify-content:center;">
          <i class="fas fa-check"></i> حسناً
        </button>
      `;
      showToast("✅ شكراً! سيتم التواصل معك قريباً", "success");
    };
  }
}

function cancelPayment() {
  // أعد فتح فورم الطلب
  const form    = document.getElementById("orderForm");
  const confirm = document.getElementById("orderConfirm");
  if (form)    { form.hidden = false; form.style.display = "flex"; }
  if (confirm) { confirm.hidden = true; confirm.style.display = "none"; }
}

/* ==========================
   TELEGRAM NOTIFICATION
   ========================== */
async function sendTelegramNotification(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text:    text,
        parse_mode: "Markdown",
      }),
    });
  } catch (e) {
    // صامت — عدم الإرسال لتيليجرام لا يوقف الطلب
    console.warn("Telegram notification failed:", e.message);
  }
}

/* ==========================
   TOAST
   ========================== */
let _toastTimer;
function showToast(message, type = "info") {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  Object.assign(toast.style, {
    position: "fixed", bottom: "30px", right: "30px",
    background: type === "success" ? "rgba(16,185,129,.95)"
              : type === "error"   ? "rgba(239,68,68,.95)"
              : "rgba(124,58,237,.95)",
    color: "#fff", padding: "13px 20px", borderRadius: "12px",
    fontFamily: "'Tajawal',sans-serif", fontSize: ".95rem", fontWeight: "700",
    direction: "rtl", zIndex: "3000", boxShadow: "0 8px 32px rgba(0,0,0,.4)",
    transform: "translateY(20px)", opacity: "0", transition: "all .3s ease",
    maxWidth: "300px", lineHeight: "1.5",
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.transform = "translateY(0)"; toast.style.opacity = "1"; });
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.style.transform = "translateY(20px)"; toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ==========================
   ACCOUNT — 2-Step flow
   الخطوة 1: اسم + جوال
   الخطوة 2: رمز التحقق (OTP وهمي — يظهر كـ console.log للمعاينة)
   ملاحظة: إذا أدخل المستخدم كلمة المرور otaibi511@ في حقل الاسم
           أو كان الجوال هو رقم الأونر → يحصل على صلاحية أدمن
   ========================== */

// رقم الأونر وكلمة المرور — مخزّنة كـ hash
const ADMIN_PHONE_NORM = normalizePhone2("0546252805");  // +966546252805
const ADMIN_PW_HASH    = hashStr2("otaibi511@");

function hashStr2(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h.toString(36);
}
function normalizePhone2(v) {
  const d = String(v || "").replace(/[^\d]/g, "");
  if (/^05\d{8}$/.test(d))  return `+966${d.slice(1)}`;
  if (/^9665\d{8}$/.test(d)) return `+${d}`;
  if (/^5\d{8}$/.test(d))    return `+966${d}`;
  return d ? `+966${d}` : null;
}

// OTP مؤقت في الذاكرة (لجلسة التصفح)
let _pendingOtp   = null;   // { code, phone, name, expiresAt }
let _pendingIsAdmin = false;

function updateAccountButton() {
  const user  = loadStore(KEYS.user, null);
  const label = document.getElementById("accountButtonLabel");
  if (!label) return;
  if (user) {
    const icon = user.role === "admin" ? "🛡️" : "👤";
    label.textContent = `${icon} ${user.name}`;
  } else {
    label.textContent = "تسجيل الدخول";
  }
}

function openAccount() {
  const user    = loadStore(KEYS.user, null);
  const overlay = document.getElementById("accountOverlay");
  if (!overlay) return;
  overlay.hidden = false;

  const statusEl  = document.getElementById("accountStatus");
  const profileEl = document.getElementById("accountProfile");
  const formEl    = document.getElementById("accountForm");
  const otpEl     = document.getElementById("otpForm");
  const logoutEl  = document.getElementById("accountLogout");
  const iconEl    = document.getElementById("acctIcon");

  // أخفِ كل شيء أولاً
  if (formEl)    { formEl.hidden = true;    formEl.style.display    = "none"; }
  if (otpEl)     { otpEl.hidden  = true;    otpEl.style.display     = "none"; }
  if (profileEl) { profileEl.hidden = true; }
  if (logoutEl)  { logoutEl.hidden = true; }

  if (user) {
    // ── مسجّل: أظهر البروفايل فقط ───────────────
    const isAdmin = user.role === "admin";
    if (iconEl) iconEl.textContent = isAdmin ? "🛡️" : "👤";
    statusEl.textContent = `أهلاً بك، ${user.name} 👋`;

    if (profileEl) {
      profileEl.hidden = false;
      const nameEl = document.getElementById("profileName");
      const roleEl = document.getElementById("profileRole");
      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) {
        if (isAdmin) {
          roleEl.textContent      = "🛡️ أدمن";
          roleEl.style.color      = "#a855f7";
          roleEl.style.background = "rgba(124,58,237,.15)";
          roleEl.style.border     = "1px solid rgba(124,58,237,.35)";
          // زر لوحة الأدمن
          let adminBtn = document.getElementById("profileAdminBtn");
          if (!adminBtn) {
            adminBtn = document.createElement("a");
            adminBtn.id = "profileAdminBtn";
            adminBtn.href = "admin.html";
            adminBtn.style.cssText = `
              display:inline-flex;align-items:center;gap:6px;
              padding:9px 20px;border-radius:50px;margin-top:6px;
              background:linear-gradient(135deg,#7c3aed,#a855f7);
              color:#fff;font-size:.88rem;font-weight:700;text-decoration:none;`;
            adminBtn.innerHTML = `<i class="fas fa-cog"></i> لوحة الأدمن`;
            profileEl.appendChild(adminBtn);
          }
          adminBtn.hidden = false;
        } else {
          roleEl.textContent      = "👤 زبون";
          roleEl.style.color      = "#9d9bc0";
          roleEl.style.background = "rgba(255,255,255,.06)";
          roleEl.style.border     = "1px solid rgba(255,255,255,.12)";
          const adminBtn = document.getElementById("profileAdminBtn");
          if (adminBtn) adminBtn.hidden = true;
        }
      }
    }
    if (logoutEl) logoutEl.hidden = false;

  } else {
    // ── غير مسجّل: أظهر الخطوة 1 فقط ────────────
    if (iconEl) iconEl.textContent = "👤";
    statusEl.textContent = "أدخل اسمك ورقم جوالك للمتابعة";
    if (formEl) { formEl.hidden = false; formEl.style.display = "flex"; }
  }
}

function closeAccount() {
  const overlay = document.getElementById("accountOverlay");
  if (overlay) overlay.hidden = true;
}

// ── الخطوة 1: إرسال رمز التحقق ──────────────────────
function requestOtp(e) {
  e && e.preventDefault();
  const nameVal  = (document.getElementById("accountName")?.value  || "").trim();
  const phoneVal = (document.getElementById("accountPhone")?.value || "").trim();

  if (!nameVal)  { showToast("⚠️ أدخل اسمك", "error"); return; }
  if (!phoneVal) { showToast("⚠️ أدخل رقم الجوال", "error"); return; }

  // فحص صلاحية الأدمن
  const normPhone     = normalizePhone2(phoneVal);
  const nameIsAdminPw = hashStr2(nameVal) === ADMIN_PW_HASH;
  const phoneIsAdmin  = normPhone === ADMIN_PHONE_NORM;
  _pendingIsAdmin     = nameIsAdminPw && phoneIsAdmin;

  // إنشاء OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  _pendingOtp = { code, phone: normPhone, name: nameVal, expiresAt: Date.now() + 5 * 60 * 1000 };

  // في وضع المعاينة: طباعة الكود في الـ console
  console.log(`%c🔑 رمز التحقق لـ ${nameVal} [${normPhone}]: ${code}`, "color:#a855f7;font-size:16px;font-weight:bold;");

  // الانتقال للخطوة 2 — إخفاء الخطوة 1 أولاً بشكل صريح
  const formEl = document.getElementById("accountForm");
  const otpEl  = document.getElementById("otpForm");
  const statusEl = document.getElementById("accountStatus");

  if (formEl) { formEl.hidden = true; formEl.style.display = "none"; }
  if (otpEl)  { otpEl.hidden = false; otpEl.style.display = "flex"; }
  if (statusEl) statusEl.textContent = `✅ الرمز جاهز — افتح Console (F12) للحصول عليه`;
  document.getElementById("accountOtp")?.focus();
}

// ── الخطوة 2: تأكيد OTP ──────────────────────────────
function verifyOtp(e) {
  e && e.preventDefault();
  const entered = (document.getElementById("accountOtp")?.value || "").trim();

  if (!_pendingOtp) {
    showToast("⚠️ انتهت الجلسة — اضغط إعادة إرسال", "error"); return;
  }
  if (Date.now() > _pendingOtp.expiresAt) {
    _pendingOtp = null;
    showToast("⚠️ انتهت صلاحية الرمز، اطلب رمزاً جديداً", "error"); return;
  }
  if (entered !== _pendingOtp.code) {
    showToast("⚠️ الرمز غير صحيح", "error"); return;
  }

  // تسجيل الدخول
  const role = _pendingIsAdmin ? "admin" : "customer";
  const user = { name: _pendingOtp.name, phone: _pendingOtp.phone, role };
  saveStore(KEYS.user, user);

  // حفظ في قائمة المستخدمين محلياً
  const users = loadStore(KEYS.users, {});
  const key   = _pendingOtp.phone || _pendingOtp.name;
  const existing = users[key];
  if (!existing || existing.role !== "admin" || role === "admin") {
    users[key] = { name: _pendingOtp.name, phone: _pendingOtp.phone, role, lastSeen: new Date().toISOString() };
  } else {
    existing.lastSeen = new Date().toISOString();
  }
  saveStore(KEYS.users, users);

  // إرسال للسيرفر المركزي (يعمل على Render)
  fetch("/api/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: _pendingOtp.name, phone: _pendingOtp.phone }),
  }).catch(() => {});

  _pendingOtp     = null;
  _pendingIsAdmin = false;

  updateAccountButton();
  closeAccount();
  showToast(`✅ أهلاً ${user.name}!${role === "admin" ? " 🛡️ دخلت كأدمن" : ""}`, "success");

  // إذا أدمن → وجّهه للوحة التحكم بعد ثانية
  if (role === "admin") {
    setTimeout(() => { window.location.href = "admin.html"; }, 1200);
  }
}

/* ==========================
   CHAT — يُخزن في localStorage
   ويظهر في لوحة الأدمن
   ========================== */
let chatPollTimer = null;

function getOrCreateConvId() {
  let id = localStorage.getItem(KEYS.convId);
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem(KEYS.convId, id);
  }
  return id;
}

function initChat() {
  const launcher = document.getElementById("chatLauncher");
  const panel    = document.getElementById("chatPanel");
  const closeBtn = document.getElementById("chatClose");
  const form     = document.getElementById("chatForm");
  const messages = document.getElementById("chatMessages");
  if (!launcher || !panel || !form || !messages) return;

  const convId = getOrCreateConvId();

  function getConv() {
    const convs = loadStore(KEYS.convs, {});
    const existing = convs[convId];
    if (existing) {
      // تأكد دائماً إن الـ id موجود
      if (!existing.id) existing.id = convId;
      return existing;
    }
    return { id: convId, name: loadStore(KEYS.user, null)?.name || "زائر", messages: [], unread: 0, at: Date.now() };
  }

  function saveConv(conv) {
    const convs = loadStore(KEYS.convs, {});
    // تأكد دائماً إن الـ id محفوظ داخل الـ object
    conv.id = convId;
    convs[convId] = conv;
    saveStore(KEYS.convs, convs);
  }

  function renderMsgs() {
    const conv = getConv();

    // إذا كانت المحادثة مخفية من الأدمن → أظهر رسالة للزبون
    if (conv.hiddenFromBuyer) {
      messages.innerHTML = '<p class="chat-empty">المحادثة غير متاحة حالياً، تواصل معنا عبر واتساب.</p>';
      return;
    }

    const msgs = (conv.messages || []).filter(m => m.text !== "__linked__");
    if (!msgs.length) {
      messages.innerHTML = '<p class="chat-empty">ابدأ رسالتك للدعم، وسيظهر الرد هنا.</p>';
      return;
    }
    const atBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 60;
    messages.innerHTML = "";
    msgs.forEach(m => {
      const el = document.createElement("p");
      el.className = `chat-message ${m.from}`;
      el.textContent = m.text;
      if (m.at) {
        const t = document.createElement("span");
        t.style.cssText = "display:block;font-size:.63rem;opacity:.5;margin-top:3px;";
        t.textContent = new Date(m.at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
        el.appendChild(t);
      }
      messages.appendChild(el);
    });
    if (atBottom) messages.scrollTop = messages.scrollHeight;
  }

  launcher.addEventListener("click", () => {
    panel.hidden = false;
    renderMsgs();
    clearInterval(chatPollTimer);
    chatPollTimer = setInterval(renderMsgs, 3000);
  });

  closeBtn.addEventListener("click", () => {
    panel.hidden = true;
    clearInterval(chatPollTimer);
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    const text  = input.value.trim();
    if (!text) return;

    // لا تسمح بالإرسال إذا كانت المحادثة مخفية أو ممنوع
    const conv = getConv();
    if (conv.hiddenFromBuyer) {
      input.value = "";
      messages.innerHTML = '<p class="chat-empty">المحادثة غير متاحة حالياً، تواصل معنا عبر واتساب.</p>';
      return;
    }
    if (conv.mutedBuyer) {
      input.value = "";
      messages.innerHTML = '<p class="chat-empty">تم إيقاف إرسال الرسائل مؤقتاً، تواصل معنا عبر واتساب.</p>';
      return;
    }

    input.value = "";
    conv.messages = conv.messages || [];
    conv.messages.push({ id: Date.now().toString(36), from: "buyer", text, at: new Date().toISOString() });
    conv.messages = conv.messages.slice(-200);
    conv.unread = (conv.unread || 0) + 1;
    conv.at     = Date.now();
    conv.name   = loadStore(KEYS.user, null)?.name || conv.name || "زائر";
    saveConv(conv);
    renderMsgs();
  });

  renderMsgs();
}

/* ==========================
   FLOATING PARTICLES
   ========================== */
function createParticles() {
  const container = document.getElementById("particles");
  if (!container) return;
  const emojis = ["🎮", "🍓", "🔱", "⚔️", "🎲", "💎", "🌟", "🔪", "👁️", "🐉"];
  const count  = window.innerWidth < 640 ? 8 : 15;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const size = Math.random() * 20 + 14;
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    Object.assign(el.style, {
      position: "absolute", fontSize: `${size}px`,
      left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
      opacity: `${Math.random()*.15+.05}`,
      animation: `floatParticle ${Math.random()*10+12}s ${Math.random()*8}s ease-in-out infinite alternate`,
      pointerEvents: "none", userSelect: "none",
    });
    container.appendChild(el);
  }
  if (!document.getElementById("particleStyle")) {
    const s = document.createElement("style");
    s.id = "particleStyle";
    s.textContent = `@keyframes floatParticle {
      0%  { transform: translate(0,0) rotate(0deg); }
      50% { transform: translate(${rp()},${rp()}) rotate(${ri()}deg); }
      100%{ transform: translate(${rp()},${rp()}) rotate(${ri()}deg); }
    }`;
    document.head.appendChild(s);
  }
}
function rp() { return `${(Math.random()*40-20).toFixed(0)}px`; }
function ri() { return `${(Math.random()*30-15).toFixed(0)}`; }

/* ==========================
   SCROLL REVEAL
   ========================== */
function initScrollReveal() {
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(c => {
    c.style.opacity = "0"; c.style.transform = "translateY(30px)";
    c.style.transition = "opacity .5s ease, transform .5s ease";
  });
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.style.opacity = "1"; en.target.style.transform = "translateY(0)";
        obs.unobserve(en.target);
      }
    });
  }, { threshold: .1, rootMargin: "0px 0px -40px 0px" });
  cards.forEach((c, i) => setTimeout(() => obs.observe(c), i * 40));
}

/* ==========================
   PRODUCT IMAGES
   ========================== */
function initProductImages() {
  const localMap = {
    "حساب بلوكس فروت عشوائي": "images/blox-fruits-account.png",
    "Kitsune Fruit":           "images/kitsune-fruit.png",
    "Leopard Fruit":           "images/leopard-fruit.png",
    "Dough Fruit":             "images/dough-fruit.png",
    "Fruit Notifier":          "images/fruit-notifier.png",
    "Dark Blade":              "images/dark-blade-blox.png",
    "World Ender (GPO)":       "https://static.wikia.nocookie.net/grand-piece-online/images/e/e3/WE.png",
    "CC — Candy Cane (GPO)":   "https://static.wikia.nocookie.net/grand-piece-online/images/b/b9/CandyCane.png",
    "PCC — Prestige Candy Cane (GPO)": "https://static.wikia.nocookie.net/grand-piece-online/images/3/3d/PCC_New.png",
    "Gingerscope":             "images/mm2-gingerscope.png",
    "Traveler's Axe":          "images/mm2/travelers-axe.png",
    "Evergun":                 "images/mm2/evergun.png",
    "Chroma Weapons Set":      "images/mm2/chroma-weapons.png",
    "Soul Set":                "images/mm2/soul-set.png",
    "Ocean Set":               "images/mm2/ocean-set.png",
    "Corrupt":                 "images/mm2/corrupt.png",
    "Flowerwood Set":          "images/mm2/flowerwood-set.png",
    "Harvester":               "images/mm2/harvester.png",
    "Pearl Set":               "images/mm2/pearl-set.png",
    "Icebreaker":              "images/mm2/icebreaker.png",
    "Candy Set":               "images/mm2/candy-set.png",
    "Bringer Set":             "images/mm2/bringer-set.png",
    "Batwing Set":             "images/mm2/batwing-set.png",
    "Makeshift":               "images/mm2/makeshift.png",
    "Swirly Set":              "images/mm2/swirly-set.png",
  };
  const fallbacks = {
    "Blox Fruits": "images/blox-fruits.png",
    "Murder Mystery 2": "images/mm2.png",
    "Grand Piece Online": "images/gpo.png",
  };
  document.querySelectorAll(".product-card").forEach(card => {
    const wrap = card.querySelector(".product-icon-wrap");
    const icon = card.querySelector(".product-icon");
    const nameEl = card.querySelector(".product-name");
    if (!wrap || !nameEl || card.querySelector(".product-image")) return;
    const name = nameEl.textContent.trim();
    const game = card.classList.contains("mm2-card") ? "Murder Mystery 2"
               : card.classList.contains("gpo-card") ? "Grand Piece Online"
               : "Blox Fruits";

    // إذا ما في صورة في localMap — GPO يستخدم إيموجي
    const src = localMap[name];
    if (!src && game === "Grand Piece Online") {
      card.classList.add("emoji-icon"); // أظهر الإيموجي
      return;
    }

    const img = document.createElement("img");
    img.className = "product-image is-loaded";
    img.alt = name; img.loading = "lazy";
    img.src = src || fallbacks[game];
    if (icon) icon.hidden = true;
    wrap.appendChild(img);  });
}

/* ==========================
   ACTIVE NAV ON SCROLL
   ========================== */
function initActiveNav() {
  const sections = document.querySelectorAll("section[id]");
  const anchors  = document.querySelectorAll(".nav-links a[href^='#']");
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting)
        anchors.forEach(a => {
          a.classList.remove("active-nav");
          if (a.getAttribute("href") === `#${en.target.id}`) a.classList.add("active-nav");
        });
    });
  }, { threshold: .4 });
  sections.forEach(s => obs.observe(s));
  const st = document.createElement("style");
  st.textContent = `.active-nav{color:var(--text)!important;background:rgba(124,58,237,.15)!important;}`;
  document.head.appendChild(st);
}

/* ==========================
   REVIEWS
   ========================== */
function initReviews() {
  const form = document.getElementById("reviewForm");
  if (!form) return;

  // تحميل الآراء من السيرفر وعرضها
  loadReviews();

  form.addEventListener("submit", e => {
    e.preventDefault();
    const r = {
      name:   document.getElementById("reviewName").value.trim(),
      rating: document.querySelector('input[name="reviewRating"]:checked')?.value,
      text:   document.getElementById("reviewText").value.trim(),
    };
    if (!r.name || !r.rating || !r.text) return;

    // أرسل للسيرفر
    fetch("/api/reviews/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    })
    .then(() => {
      form.reset();
      showToast("✅ تم إرسال رأيك وسيظهر قريباً", "success");
      loadReviews(); // حدّث القائمة
    })
    .catch(() => {
      // fallback: احفظ محلياً
      const pending = loadStore("fs-pending-reviews", []);
      pending.push({ ...r, at: new Date().toISOString() });
      saveStore("fs-pending-reviews", pending);
      form.reset();
      showToast("✅ تم استلام رأيك وسيظهر بعد المراجعة", "success");
    });
  });
}

function loadReviews() {
  const escHtml = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  fetch("/api/reviews/list")
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById("reviewsList");
      if (!container) return;
      const list = data.reviews || [];
      if (!list.length) { container.innerHTML = ""; return; }
      container.innerHTML = list.slice(0, 10).map(r => `
        <div class="review-card">
          <div class="review-header">
            <strong>${escHtml(r.name)}</strong>
            <span class="review-stars">${"⭐".repeat(Number(r.rating) || 5)}</span>
          </div>
          <p class="review-text">${escHtml(r.text)}</p>
        </div>
      `).join("");
    })
    .catch(() => {}); // صامت لو السيرفر ما رد
}

/* ==========================
   INIT
   ========================== */
document.addEventListener("DOMContentLoaded", () => {
  createParticles();
  initProductImages();
  initScrollReveal();
  initActiveNav();
  initReviews();
  initChat();
  updateAccountButton();

  // تهيئة اللغة والعملة من الذاكرة
  const savedCurrency = localStorage.getItem("fs-currency") || "both";
  document.getElementById("currencySelect").value = savedCurrency;
  setCurrency(savedCurrency);
  applyLang();

  // ── أحداث مودال الحساب ──────────────────────────
  document.getElementById("accountButton")
    ?.addEventListener("click", openAccount);
  document.getElementById("accountClose")
    ?.addEventListener("click", closeAccount);
  document.getElementById("accountOverlay")
    ?.addEventListener("click", e => { if (e.target.id === "accountOverlay") closeAccount(); });
  // الخطوة 1
  document.getElementById("accountForm")
    ?.addEventListener("submit", requestOtp);
  // الخطوة 2
  document.getElementById("otpForm")
    ?.addEventListener("submit", verifyOtp);
  // إعادة إرسال
  document.getElementById("resendOtp")
    ?.addEventListener("click", () => {
      const f = document.getElementById("accountForm");
      const o = document.getElementById("otpForm");
      if (f) { f.hidden = false; f.style.display = "flex"; }
      if (o) { o.hidden = true;  o.style.display = "none"; }
      document.getElementById("accountStatus").textContent = "أدخل اسمك ورقم جوالك للمتابعة";
      _pendingOtp = null;
    });
  // تسجيل الخروج
  document.getElementById("accountLogout")
    ?.addEventListener("click", () => {
      localStorage.removeItem(KEYS.user);
      updateAccountButton();
      closeAccount();
      showToast("✅ تم تسجيل الخروج");
    });

  // ── URL product param ────────────────────────────
  const param = new URLSearchParams(window.location.search).get("product");
  const catalog = {
    kitsune:        ["Kitsune Fruit (فاكهة كايتسوني)", "$8.00",   "30.00 ريال"],
    leopard:        ["Leopard Fruit (فاكهة الفهد)",    "$4.00",   "15.00 ريال"],
    gingerscope:    ["Gingerscope (MM2)",               "$398.00", "1,492.50 ريال"],
    travelersaxe:   ["Traveler's Axe (MM2)",            "$190.00", "712.50 ريال"],
    evergun:        ["Evergun (MM2)",                   "$77.00",  "288.75 ريال"],
    pcc:            ["PCC (Prestige Candy Cane) (MM2)", "$360.00", "1,350.00 ريال"],
    cc:             ["CC (Candy Cane) (MM2)",           "$65.00",  "243.75 ريال"],
    worldender:     ["World Ender (Wender) (MM2)",      "$25.00",  "93.75 ريال"],
    allseeingeye:   ["All Seeing Eye (GPO)",            "$15.00",  "56.25 ريال"],
    mythicalchest:  ["Mythical Chest (GPO)",            "$13.00",  "48.75 ريال"],
    legendarychest: ["Legendary Chest (GPO)",           "$1.50",   "5.60 ريال"],
    darkbladegpo:   ["Dark Blade (GPO)",                "$12.00",  "45.00 ريال"],
  };
  if (param && catalog[param]) openOrder(...catalog[param]);

  document.querySelector(".logo")
    ?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
});
