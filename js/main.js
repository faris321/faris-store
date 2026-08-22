/* ===========================
   FARIS STORE — main.js  (نسخة بدون سيرفر)
   =========================== */

// ─── إعدادات ──────────────────────────────────────────
const WHATSAPP_NUMBER = "966546252805";
const PAYPAL_ME_URL   = "https://paypal.me/farisstore1";

// ─── Telegram إشعارات الطلبات ─────────────────────────
const TG_TOKEN   = "8352531095:AAHLczHeiNIlTfGkCIWVLIClgisRuu7QEo4";
const TG_CHAT_ID = "8084788871";

const PAYMENT_ICONS = {
  "تحويل بنكي": "🏦",
  "PayPal":     "💳",
};

// ─── مفاتيح localStorage ──────────────────────────────
const KEYS = {
  user:   "fs-user",
  convId: "fs-conv-id",
  convs:  "fs-conversations",
  users:  "fs-users",
  orders: "fs-order-seq",
  cart:   "fs-cart-v2",        // سلة التسوق
};

// ─── Storage helpers ──────────────────────────────────
function loadStore(key, def = {}) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; }
  catch { return def; }
}
function saveStore(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ==========================
   CART — نظام السلة
   ========================== */
function getCart() { 
  const cart = loadStore(KEYS.cart, []);
  // تأكد إن كل عنصر صحيح
  return cart.filter(i => i && i.name && i.qty > 0);
}
function saveCart(cart) { saveStore(KEYS.cart, cart.filter(i => i && i.name && i.qty > 0)); updateCartBadge(); }

function addToCart(name, priceUSD, priceSAR, qty = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 99);
  } else {
    cart.push({ name, priceUSD, priceSAR, qty });
  }
  saveCart(cart);
  showToast(`✅ أُضيف للسلة: ${name}`, "success");
}

function removeFromCart(name) {
  saveCart(getCart().filter(i => i.name !== name));
}

function updateCartQty(name, qty) {
  const cart = getCart();
  const item = cart.find(i => i.name === name);
  if (!item) return;
  if (qty < 1) { removeFromCart(name); return; }
  item.qty = Math.min(qty, 99);
  saveCart(cart);
}

function clearCart() { saveCart([]); }

function updateCartBadge() {
  const cart  = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  badge.textContent = total;
  badge.hidden = total === 0;
  // أيضاً أخفِ زر السلة لو فارغة (اختياري)
  const cartBtn = document.getElementById("cartBtn");
  if (cartBtn) cartBtn.style.opacity = total === 0 ? "0.5" : "1";
}

function openCart() {
  const panel   = document.getElementById("cartPanel");
  const overlay = document.getElementById("cartOverlay");
  if (!panel) return;
  panel.style.display   = "flex";
  if (overlay) overlay.style.display = "block";
  renderCartPanel(getCart());
  document.body.style.overflow = "hidden";
}

function closeCart() {
  const panel   = document.getElementById("cartPanel");
  const overlay = document.getElementById("cartOverlay");
  if (panel)   panel.style.display   = "none";
  if (overlay) overlay.style.display = "none";
  document.body.style.overflow = "";
}

function renderCartPanel(cart) {
  const body   = document.getElementById("cartBody");
  const footer = document.getElementById("cartFooter");
  const count  = document.getElementById("cartCount");
  const total  = document.getElementById("cartTotalVal");
  if (!body) return;

  const itemCount = cart.reduce((s, i) => s + i.qty, 0);
  if (count) count.textContent = itemCount ? `(${itemCount})` : "";

  if (!cart.length) {
    body.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
        <div style="font-size:3rem;margin-bottom:14px;opacity:.4">🛒</div>
        <p style="font-size:.9rem;">السلة فارغة</p>
        <p style="font-size:.8rem;margin-top:6px;opacity:.6;">أضف منتجات بالضغط على "سلة"</p>
      </div>`;
    if (footer) { footer.hidden = true; footer.style.display = "none"; }
    return;
  }

  // حساب الإجمالي حسب العملة المختارة
  const currency  = localStorage.getItem("fs-currency") || "both";
  const totUSD    = cart.reduce((s, i) => s + (parsePrice(i.priceUSD) * i.qty), 0);
  const totSAR    = cart.reduce((s, i) => s + (parsePrice(i.priceSAR) * i.qty), 0);
  if (total) {
    if (currency === "sar")      total.textContent = `${totSAR.toFixed(2)} ريال`;
    else if (currency === "usd") total.textContent = `$${totUSD.toFixed(2)}`;
    else                         total.textContent = `$${totUSD.toFixed(2)} | ${totSAR.toFixed(2)} ريال`;
  }

  body.innerHTML = cart.map((item) => {
    let priceLabel;
    if (currency === "sar")      priceLabel = item.priceSAR + " للقطعة";
    else if (currency === "usd") priceLabel = item.priceUSD + " للقطعة";
    else                         priceLabel = item.priceUSD + " | " + item.priceSAR + " للقطعة";
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <div style="flex:1;overflow:hidden;">
        <div style="font-size:.88rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
        <div style="font-size:.76rem;color:var(--text-muted);margin-top:3px;">${priceLabel}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
        <button onclick="updateCartQty('${escHtmlCart(item.name)}',${item.qty-1});renderCartPanel(getCart());"
          style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(124,58,237,.4);background:rgba(124,58,237,.1);color:#f0eeff;cursor:pointer;font-size:1rem;font-family:var(--font);display:flex;align-items:center;justify-content:center;transition:.2s;">−</button>
        <span style="min-width:24px;text-align:center;font-weight:800;font-size:.95rem;">${item.qty}</span>
        <button onclick="updateCartQty('${escHtmlCart(item.name)}',${item.qty+1});renderCartPanel(getCart());"
          style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(124,58,237,.4);background:rgba(124,58,237,.1);color:#f0eeff;cursor:pointer;font-size:1rem;font-family:var(--font);display:flex;align-items:center;justify-content:center;transition:.2s;">+</button>
        <button onclick="removeFromCart('${escHtmlCart(item.name)}');renderCartPanel(getCart());"
          style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:#ef4444;cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;transition:.2s;margin-right:2px;">
          <i class="fas fa-times"></i></button>
      </div>
    </div>`;
  }).join("");

  if (footer) { footer.hidden = false; footer.style.display = "flex"; }
}

function checkoutCart() {
  const cart = getCart();
  if (!cart.length) return;

  // بناء رسالة واتساب بالسلة كاملة
  const user  = loadStore("fs-user", null);
  const name  = user?.name || "زائر";
  const lines = cart.map(i => `• ${i.name} × ${i.qty} — ${i.priceUSD}`).join("\n");

  const seq  = Number(localStorage.getItem(KEYS.orders) || 0) + 1;
  localStorage.setItem(KEYS.orders, String(seq));
  const date = new Date().toISOString().slice(0,10).replace(/-/g,"");
  const orderNumber = `FS-${date}-${String(seq).padStart(4,"0")}`;

  const msg = `🛒 *طلب سلة — فارس ستور*\n🧾 *رقم الطلب:* \`${orderNumber}\`\n\n👤 *الاسم:* ${name}\n\n━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━\n⚡ الحالة: قيد التحضير`;

  // حفظ في admin orders
  const orderData = {
    orderNumber,
    product: cart.map(i => `${i.name} × ${i.qty}`).join(" | "),
    priceUSD: cart.map(i => i.priceUSD).join(" + "),
    priceSAR: cart.map(i => i.priceSAR).join(" + "),
    payment: "—",
    contact: "—",
    notes: "",
    userName: name,
    userEmail: user?.email || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  try {
    const saved = JSON.parse(localStorage.getItem("fs-admin-orders") || "[]");
    saved.unshift(orderData);
    localStorage.setItem("fs-admin-orders", JSON.stringify(saved));
  } catch(e) {}

  sendTelegramNotification(msg);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  closeCart();
  clearCart();
  showToast(`✅ تم إرسال الطلب ${orderNumber}`, "success");
}

function escHtmlCart(s) {
  return String(s||"").replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

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

if (header && scrollTopBtn) {
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 50);
    scrollTopBtn.classList.toggle("visible", window.scrollY > 400);
  });
}

if (hamburger && navLinks) {
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
}

if (scrollTopBtn) {
  scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ==========================
   ORDER MODAL
   ========================== */
const modal = document.getElementById("orderModal");
let currentProduct = { name: "", priceUSD: "", priceSAR: "" };

// ─── استخراج قيمة رقمية من نص السعر ───────────────
function parsePrice(priceStr) {
  // يزيل كل شيء ما عدا الأرقام والنقطة
  return parseFloat(String(priceStr).replace(/[^0-9.]/g, "")) || 0;
}

function updateModalTotal() {
  const qty = Math.max(1, parseInt(document.getElementById("orderQty")?.value) || 1);
  const usdUnit = parsePrice(currentProduct.priceUSD);
  const sarUnit = parsePrice(currentProduct.priceSAR);
  const totalUSD = (usdUnit * qty).toFixed(2);
  const totalSAR = (sarUnit * qty).toFixed(2);

  const infoEl = document.getElementById("modalProductInfo");
  if (!infoEl) return;
  infoEl.innerHTML = `
    <div class="pname">🛍️ ${currentProduct.name}</div>
    <div class="pprice">
      <span style="color:var(--primary-light);font-weight:900">$${totalUSD}</span>
      &nbsp;|&nbsp;
      <span style="color:var(--text-muted)">${totalSAR} ريال</span>
      ${qty > 1 ? `<span style="font-size:.75rem;color:var(--text-muted);margin-right:6px">(${qty} × ${currentProduct.priceUSD})</span>` : ""}
    </div>`;
}

function openOrder(productName, priceUSD, priceSAR) {
  currentProduct = { name: productName, priceUSD, priceSAR };

  // إظهار الفورم وإخفاء شاشة التأكيد
  const form    = document.getElementById("orderForm");
  const confirm = document.getElementById("orderConfirm");
  if (form)    { form.hidden = false;    form.style.display    = "flex"; }
  if (confirm) { confirm.hidden = true;  confirm.style.display = "none"; }

  if (modal) modal.classList.add("active");
  document.body.style.overflow = "hidden";
  document.getElementById("orderForm")?.reset();

  // اعرض السعر بعد الـ reset عشان الكمية ترجع 1
  const qtyInp = document.getElementById("orderQty");
  if (qtyInp) qtyInp.value = 1;
  updateModalTotal();

  setTimeout(() => document.getElementById("buyerContact")?.focus(), 300);
}

function closeOrder() {
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

if (modal) {
  modal.addEventListener("click", e => { if (e.target === modal) closeOrder(); });
}
document.addEventListener("keydown", e => {
  if (modal && e.key === "Escape" && modal.classList.contains("active")) closeOrder();
});

/* ==========================
   SUBMIT ORDER → WHATSAPP
   ========================== */
async function submitOrder(e) {
  e.preventDefault();

  const user    = loadStore(KEYS.user, null);
  const contact = document.getElementById("buyerContact")?.value.trim() ?? "";
  const sel     = document.querySelector('input[name="payment"]:checked');
  const payment = sel ? sel.value : "";
  const notes   = document.getElementById("orderNotes").value.trim();

  if (!contact || !payment) {
    showToast("⚠️ يرجى ملء جميع الحقول المطلوبة", "error");
    return;
  }

  // الكمية والأسعار
  const qty     = Math.max(1, parseInt(document.getElementById("orderQty")?.value) || 1);
  const usdUnit = parsePrice(currentProduct.priceUSD);
  const sarUnit = parsePrice(currentProduct.priceSAR);
  const totalUSD = qty > 1 ? `$${(usdUnit * qty).toFixed(2)} (${qty} × ${currentProduct.priceUSD})` : currentProduct.priceUSD;
  const totalSAR = qty > 1 ? `${(sarUnit * qty).toFixed(2)} ريال (${qty} × ${currentProduct.priceSAR})` : currentProduct.priceSAR;

  // رقم الطلب
  let orderNumber;
  try {
    const data = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      },
      body: JSON.stringify({
        product:   qty > 1 ? `${currentProduct.name} × ${qty}` : currentProduct.name,
        priceUSD:  totalUSD,
        priceSAR:  totalSAR,
        payment, contact, notes,
        userName:  user?.name  || "زائر",
        userEmail: user?.email || "",
      }),
    }).then(r => r.json());
    if (data.orderNumber) orderNumber = data.orderNumber;
  } catch { /* نكمل */ }

  if (!orderNumber) {
    const seq = Number(localStorage.getItem(KEYS.orders) || 0) + 1;
    localStorage.setItem(KEYS.orders, String(seq));
    const date = new Date().toISOString().slice(0,10).replace(/-/g,"");
    orderNumber = `FS-${date}-${String(seq).padStart(4,"0")}`;
  }

  const name = user?.name  || "زائر";
  const icon = PAYMENT_ICONS[payment] || "💳";
  
  // عرض "(الأفضل)" في الرسائل
  const paymentDisplay = payment === "تحويل بنكي" ? "تحويل بنكي (الأفضل)" : payment;

  // حفظ محلي في لوحة الأدمن
  try {
    const saved = JSON.parse(localStorage.getItem("fs-admin-orders") || "[]");
    saved.unshift({
      orderNumber,
      product:   qty > 1 ? `${currentProduct.name} × ${qty}` : currentProduct.name,
      priceUSD:  totalUSD,
      priceSAR:  totalSAR,
      payment, contact, notes,
      userName:  name,
      userEmail: user?.email || "",
      status:    "pending",
      createdAt: new Date().toISOString(),
    });
    if (saved.length > 500) saved.pop();
    localStorage.setItem("fs-admin-orders", JSON.stringify(saved));
  } catch(err) {}

  // رسالة التيليجرام
  const tgMsg = `🛒 *طلب جديد — فارس ستور*
🧾 *رقم الطلب:* \`${orderNumber}\`

━━━━━━━━━━━━━━━━
🛍️ *المنتج:* ${currentProduct.name}${qty > 1 ? ` × ${qty}` : ""}
💵 *السعر:* ${totalUSD} | ${totalSAR}
━━━━━━━━━━━━━━━━
👤 *الاسم:* ${name}
${user?.email ? `📧 *الإيميل:* ${user.email}\n` : ""}📱 *التواصل:* ${contact}
${icon} *طريقة الدفع:* ${paymentDisplay}${notes ? `\n📝 *ملاحظات:* ${notes}` : ""}
━━━━━━━━━━━━━━━━
⚡ الحالة: *قيد التحضير*`;

  sendTelegramNotification(tgMsg);

  // معالجة حسب طريقة الدفع
  if (payment === "PayPal") {
    const amount = (usdUnit * qty).toFixed(2);
    window.open(`${PAYPAL_ME_URL}/${amount}USD`, "_blank");
    showPaymentPending(orderNumber, "PayPal");
  } else {
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

/* ==========================
   ACCOUNT — اسم + إيميل للزبون
   إيميل + كلمة مرور للأدمن
   ========================== */

// token محفوظ في localStorage
const TOKEN_KEY = "fs-token";

function getAuthToken()  { return localStorage.getItem(TOKEN_KEY); }
function setAuthToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearAuth()     { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem("fs-user"); }

function apiCall(method, path, body) {
  const token = getAuthToken();
  return fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

function updateAccountButton() {
  const user  = loadStore("fs-user", null);
  const label = document.getElementById("accountButtonLabel");
  if (!label) return;
  label.textContent = user ? `${user.role === "admin" ? "🛡️" : "👤"} ${user.name}` : "تسجيل الدخول";
  
  // تحديث زر لوحة التحكم في الـ navbar أيضاً (لو موجود)
  const adminBtn = document.getElementById("adminPanelBtn");
  if (adminBtn && user?.role === "admin") {
    adminBtn.hidden = false;
    adminBtn.style.display = "flex";
  } else if (adminBtn) {
    adminBtn.hidden = true;
    adminBtn.style.display = "none";
  }
  
  // جلب آخر بيانات المستخدم من السيرفر (لو متغيرة)
  if (user && getAuthToken()) {
    apiCall("GET", "/api/me")
      .then(data => {
        if (data.user && data.user.role !== user.role) {
          // الرتبة تغيرت — حدّث localStorage
          const updatedUser = { ...user, role: data.user.role };
          saveStore("fs-user", updatedUser);
          updateAccountButton(); // حدّث الزر مرة ثانية
          showToast(`✨ تم تحديث رتبتك إلى: ${data.user.role === "admin" ? "أدمن" : "زبون"}`, "success");
        }
      })
      .catch(() => {
        // السيرفر مو متاح — استمر بالبيانات المحلية
      });
  }
}

function openAccount() {
  const user = loadStore("fs-user", null);
  const overlay = document.getElementById("accountOverlay");
  if (!overlay) return;
  overlay.hidden = false;

  const statusEl  = document.getElementById("accountStatus");
  const profileEl = document.getElementById("accountProfile");
  const formEl    = document.getElementById("accountForm");
  const otpEl     = document.getElementById("otpForm");
  const logoutEl  = document.getElementById("accountLogout");
  const iconEl    = document.getElementById("acctIcon");
  const adminBtn  = document.getElementById("adminPanelBtn");

  if (formEl)    { formEl.hidden = true;    formEl.style.display = "none"; }
  if (otpEl)     { otpEl.hidden  = true;    otpEl.style.display  = "none"; }
  if (profileEl) { profileEl.hidden = true; }
  if (logoutEl)  { logoutEl.hidden = true; }
  if (adminBtn)  { adminBtn.hidden = true; adminBtn.style.display = "none"; }

  if (user) {
    const isAdmin = user.role === "admin";
    if (iconEl) iconEl.textContent = isAdmin ? "🛡️" : "👤";
    if (statusEl) statusEl.textContent = `أهلاً بك، ${user.name} 👋`;
    if (profileEl) {
      profileEl.hidden = false;
      const nameEl  = document.getElementById("profileName");
      const emailEl = document.getElementById("profileEmail");
      const roleEl  = document.getElementById("profileRole");
      
      if (nameEl) nameEl.textContent = user.name;
      if (emailEl) emailEl.textContent = user.email || "";
      
      if (roleEl) {
        if (isAdmin) {
          // الأدمن — نعرض معلوماته مع شارة خاصة
          roleEl.hidden = false;
          roleEl.textContent = "🛡️ أدمن";
          roleEl.style.color = "#fbbf24";
          roleEl.style.background = "rgba(251,191,36,.15)";
          roleEl.style.border = "1px solid rgba(251,191,36,.3)";
          // إظهار زر لوحة التحكم للأدمن فقط
          if (adminBtn) {
            adminBtn.hidden = false;
            adminBtn.style.display = "flex";
          }
        } else {
          roleEl.hidden = false;
          roleEl.textContent = "👤 زبون";
          roleEl.style.color = "#9d9bc0";
          roleEl.style.background = "rgba(255,255,255,.06)";
          roleEl.style.border = "1px solid rgba(255,255,255,.12)";
          // التأكد من إخفاء زر لوحة التحكم للزبون
          if (adminBtn) {
            adminBtn.hidden = true;
            adminBtn.style.display = "none";
          }
        }
      }
    }
    if (logoutEl) logoutEl.hidden = false;
  } else {
    // ما في مستخدم — خلّي كل شيء على وضع التسجيل
    if (iconEl) iconEl.textContent = "👤";
    if (statusEl) statusEl.textContent = "أدخل اسمك وإيميلك للتسجيل";
    if (formEl) { formEl.hidden = false; formEl.style.display = "flex"; }
    if (logoutEl) logoutEl.hidden = true;  // إخفاء زر تسجيل الخروج
  }
}

function closeAccount() {
  const o = document.getElementById("accountOverlay");
  if (o) o.hidden = true;
  // تحديث القائمة بعد إغلاق المودال
  updateAccountButton();
}

// ── تسجيل الزبون (اسم + إيميل) ──────────────────────
// ── فورم موحّد — يتعرف تلقائياً على الأدمن ─────────────
// الزبون: اسم + إيميل عادي → تسجيل مباشر
// الأدمن: يكتب إيميله في "الاسم" وكلمة المرور في "الإيميل" → يُحوَّل للوحة التحكم
function submitAccountForm(e) {
  e && e.preventDefault();
  const field1 = (document.getElementById("accountName")?.value  || "").trim();
  const field2 = (document.getElementById("accountPhone")?.value || "").trim();

  if (!field1 || !field2) { showToast("⚠️ يرجى ملء جميع الحقول", "error"); return; }

  // ── فحص صامت: هل هذا الأدمن؟ ──
  function _h(s){let h=0;for(let i=0;i<s.length;i++)h=Math.imul(31,h)+s.charCodeAt(i)|0;return h.toString(36);}
  const ADMIN_EMAIL = "otaibi511@";
  const ADMIN_HASH  = _h("otaibi511@");

  if (field1 === ADMIN_EMAIL && _h(field2) === ADMIN_HASH) {
    // دخول أدمن — جرّب السيرفر أولاً
    apiCall("POST", "/api/admin/login", { email: field1, password: field2 })
      .then(data => {
        if (data.token) setAuthToken(data.token);
        const user = data.user || { name: "فارس", email: ADMIN_EMAIL, role: "admin" };
        saveStore("fs-user", user);
        closeAccount();
        window.location.href = "admin.html";
      })
      .catch(() => {
        // fallback محلي
        saveStore("fs-user", { name: "فارس", email: ADMIN_EMAIL, role: "admin" });
        closeAccount();
        window.location.href = "admin.html";
      });
    return;
  }

  // ── تسجيل زبون عادي ──
  const name  = field1;
  const email = field2;

  apiCall("POST", "/api/register", { name, email })
    .then(data => {
      if (data.token) setAuthToken(data.token);
      const user = data.user || { name, email, role: "customer" };
      saveStore("fs-user", user);
      closeAccount();
      updateAccountButton();
      showToast(`✅ أهلاً ${name}!`, "success");
    })
    .catch(err => {
      console.error("Registration failed:", err);
      // fallback محلي - لكن نحاول نرسل للسيرفر بعدين
      const user = { name, email, role: "customer" };
      saveStore("fs-user", user);
      
      // محاولة إرسال للسيرفر في الخلفية
      fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      }).catch(() => {}); // صامت
      
      closeAccount();
      updateAccountButton();
      showToast(`✅ أهلاً ${name}!`, "success");
    });
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

  const convId   = getOrCreateConvId();
  const userName = () => loadStore(KEYS.user, null)?.name || "زائر";

  // ── رسم الرسائل من مصفوفة ─────────────────────────
  function renderMsgs(msgList) {
    if (!msgList || !msgList.length) {
      messages.innerHTML = '<p class="chat-empty">ابدأ رسالتك للدعم، وسيظهر الرد هنا.</p>';
      return;
    }
    const atBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 60;
    messages.innerHTML = "";
    msgList.forEach(m => {
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

  // ── جلب الرسائل من السيرفر ────────────────────────
  function fetchMsgs() {
    fetch(`/api/chat/messages?convId=${encodeURIComponent(convId)}`)
      .then(r => r.json())
      .then(data => {
        // فحص: هل المحادثة مخفية عن الزبون؟
        if (data.hiddenFromBuyer === true) {
          // أخفِ panel المحادثة وامسح localStorage
          const panel = document.getElementById("chatPanel");
          if (panel) panel.hidden = true;
          clearInterval(chatPollTimer);
          const convs = loadStore(KEYS.convs, {});
          delete convs[convId];
          saveStore(KEYS.convs, convs);
          showToast("⚠️ هذه المحادثة غير متاحة حالياً", "error");
          return;
        }

        const serverMsgs = (data.messages || []).filter(m => m.text !== "__linked__");
        // استخدم رسائل السيرفر فقط (مو localStorage) عشان الحذف يشتغل صح
        renderMsgs(serverMsgs);
        
        // حدّث localStorage بالرسائل الجديدة من السيرفر
        const convs = loadStore(KEYS.convs, {});
        if (convs[convId]) {
          convs[convId].messages = serverMsgs;
          saveStore(KEYS.convs, convs);
        }
      })
      .catch(() => {
        // fallback: اقرأ من localStorage
        const conv = loadStore(KEYS.convs, {})[convId];
        const msgs = ((conv?.messages) || []).filter(m => m.text !== "__linked__");
        renderMsgs(msgs);
      });
  }

  launcher.addEventListener("click", () => {
    panel.hidden = false;
    fetchMsgs();
    clearInterval(chatPollTimer);
    chatPollTimer = setInterval(fetchMsgs, 3000);
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

    const name = userName();

    // فحص أولاً: هل الزبون ممنوع من الكتابة؟
    fetch(`/api/chat/messages?convId=${encodeURIComponent(convId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.mutedBuyer === true) {
          showToast("⚠️ غير مسموح لك بإرسال رسائل حالياً", "error");
          input.value = ""; // امسح النص
          return;
        }
        if (data.hiddenFromBuyer === true) {
          showToast("⚠️ هذه المحادثة غير متاحة حالياً", "error");
          const panel = document.getElementById("chatPanel");
          if (panel) panel.hidden = true;
          clearInterval(chatPollTimer);
          input.value = "";
          return;
        }

        // الزبون مسموح له — أرسل الرسالة
        input.value = "";

        // أضف الرسالة محلياً فوراً عشان تظهر بدون انتظار السيرفر
        const convs = loadStore(KEYS.convs, {});
        const localConv = convs[convId] || { id: convId, name, messages: [], unread: 0, at: Date.now() };
        localConv.messages = localConv.messages || [];
        const newMsg = { id: Date.now().toString(36), from: "buyer", text, at: new Date().toISOString() };
        localConv.messages.push(newMsg);
        localConv.messages = localConv.messages.slice(-200);
        localConv.unread = (localConv.unread || 0) + 1;
        localConv.at = Date.now();
        localConv.name = name;
        convs[convId] = localConv;
        saveStore(KEYS.convs, convs);
        fetchMsgs(); // أظهر الرسالة فوراً

        // أرسل للسيرفر
        fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ convId, text, name, email: loadStore(KEYS.user, null)?.email || "" }),
        })
        .then(() => fetchMsgs())
        .catch(() => {
          // fallback localStorage
          const convs = loadStore(KEYS.convs, {});
          const conv  = convs[convId] || { id: convId, name, messages: [], unread: 0, at: Date.now() };
          conv.id = convId;
          conv.messages = conv.messages || [];
          conv.messages.push({ id: Date.now().toString(36), from: "buyer", text, at: new Date().toISOString() });
          conv.messages = conv.messages.slice(-200);
          conv.unread = (conv.unread || 0) + 1;
          conv.at = Date.now();
          conv.name = name;
          convs[convId] = conv;
          saveStore(KEYS.convs, convs);
          fetchMsgs();
        });

        // إشعار تيليجرام
        sendTelegramNotification(
          `💬 *رسالة دعم جديدة — فارس ستور*\n\n` +
          `👤 *المرسل:* ${name}\n` +
          `📝 *الرسالة:* ${text}\n\n` +
          `⏰ ${new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`
        );
      })
      .catch(() => {
        // لو فشل الفحص، ما نرسل الرسالة
        showToast("⚠️ حدث خطأ، حاول مرة أخرى", "error");
        input.value = "";
      });
  });

  fetchMsgs();
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
    "World Ender (GPO)":              null,
    "CC — Candy Cane (GPO)":          null,
    "PCC — Prestige Candy Cane (GPO)":null,
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
    if (src === null) {
      // منتج GPO بدون صورة — حدّد الإيموجي المناسب
      card.classList.add("emoji-icon");
      if (icon) {
        if (name.includes("World Ender")) icon.textContent = "⚔️";
        else if (name.includes("Candy Cane") && name.includes("Prestige")) icon.textContent = "🍬";
        else if (name.includes("Candy Cane")) icon.textContent = "🍭";
        else icon.textContent = "🌊";
      }
      return;
    }
    if (!src && game === "Grand Piece Online") {
      card.classList.add("emoji-icon");
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
    .then(res => res.json())
    .then(data => {
      if (data.ok === false) {
        showToast("⚠️ " + (data.error || "فشل الإرسال"), "error");
        return;
      }
      form.reset();
      showToast("✅ تم نشر رأيك!", "success");
      // انتظر ثانية ثم حدّث القائمة
      setTimeout(loadReviews, 800);
    })
    .catch(() => {
      // fallback: احفظ محلياً وأظهره مباشرة
      const pending = loadStore("fs-pending-reviews", []);
      const newReview = { ...r, at: new Date().toISOString(), id: Date.now().toString(36) };
      pending.unshift(newReview);
      saveStore("fs-pending-reviews", pending);
      form.reset();
      showToast("✅ تم نشر رأيك!", "success");
      // أعد تحميل الآراء عشان تظهر
      loadReviews();
    });
  });
}

function loadReviews() {
  const escHtml = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  fetch("/api/reviews/list")
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById("reviewsList");
      const emptyEl   = document.querySelector(".reviews-empty");
      const subtitleEl = document.querySelector(".reviews-header .section-subtitle");
      if (!container) return;
      const list = data.reviews || [];

      if (!list.length) {
        container.innerHTML = "";
        if (emptyEl) emptyEl.hidden = false;
        return;
      }

      // إخفاء placeholder "لا توجد تقييمات"
      if (emptyEl) emptyEl.hidden = true;
      // حدّث subtitle ليعكس عدد التقييمات
      if (subtitleEl) subtitleEl.textContent = `${list.length} تقييم حقيقي من عملائنا`;

      container.innerHTML = list.slice(0, 10).map(r => `
        <div class="review-card" style="
          background:var(--bg3);border:1px solid rgba(124,58,237,.2);
          border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;
        ">
          <div class="review-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <strong style="font-size:.95rem;">${escHtml(r.name)}</strong>
            <span style="font-size:.85rem;letter-spacing:.05em">${"⭐".repeat(Math.min(5, Number(r.rating) || 5))}</span>
          </div>
          <p class="review-text" style="font-size:.88rem;color:var(--text-muted);line-height:1.55;margin:0;">${escHtml(r.text)}</p>
          <span style="font-size:.72rem;color:var(--text-muted);opacity:.6;">${new Date(r.at).toLocaleDateString("ar-SA")}</span>
        </div>
      `).join("");
    })
    .catch(() => {
      // عرض الآراء المحلية كـ fallback
      const pending = loadStore("fs-pending-reviews", []);
      const container = document.getElementById("reviewsList");
      const emptyEl   = document.querySelector(".reviews-empty");
      if (!container) return;
      if (!pending.length) { if (emptyEl) emptyEl.hidden = false; return; }
      if (emptyEl) emptyEl.hidden = true;
      const escHtml = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      container.innerHTML = pending.slice(0,10).map(r => `
        <div class="review-card" style="background:var(--bg3);border:1px solid rgba(124,58,237,.2);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <strong style="font-size:.95rem;">${escHtml(r.name)}</strong>
            <span>${"⭐".repeat(Math.min(5, Number(r.rating)||5))}</span>
          </div>
          <p style="font-size:.88rem;color:var(--text-muted);line-height:1.55;margin:0;">${escHtml(r.text)}</p>
        </div>
      `).join("");
    });
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
  
  // تحديث دوري لبيانات المستخدم (كل 10 ثواني)
  setInterval(() => {
    const user = loadStore("fs-user", null);
    if (user && getAuthToken()) {
      updateAccountButton(); // يفحص الرتبة ويحدثها لو تغيرت
    }
  }, 10000);
  
  try {
    const raw = JSON.parse(localStorage.getItem(KEYS.cart));
    if (!Array.isArray(raw)) {
      localStorage.removeItem(KEYS.cart);
    } else {
      const clean = raw.filter(i => i && typeof i === "object" && i.name && Number(i.qty) > 0 && Number(i.qty) <= 99);
      // لو في فرق أو البيانات كبيرة جداً → نظّف
      localStorage.setItem(KEYS.cart, JSON.stringify(clean));
    }
  } catch(e) { localStorage.removeItem(KEYS.cart); }
  saveCart(getCart());
  updateCartBadge();

  // تهيئة اللغة والعملة من الذاكرة
  const savedCurrency = localStorage.getItem("fs-currency") || "both";
  const currencyEl = document.getElementById("currencySelect");
  if (currencyEl) currencyEl.value = savedCurrency;
  setCurrency(savedCurrency);
  applyLang();

  // ── أحداث مودال الحساب ──────────────────────────
  document.getElementById("accountButton")
    ?.addEventListener("click", openAccount);
  document.getElementById("accountClose")
    ?.addEventListener("click", closeAccount);
  document.getElementById("accountOverlay")
    ?.addEventListener("click", e => { if (e.target.id === "accountOverlay") closeAccount(); });
  // فورم تسجيل الزبون
  document.getElementById("accountForm")
    ?.addEventListener("submit", submitAccountForm);
  // تسجيل الخروج
  document.getElementById("accountLogout")
    ?.addEventListener("click", () => {
      clearAuth();
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
