// Masrofy v2.0 - Smart Expense Tracker (100% client-side, localStorage)
const $ = (id) => document.getElementById(id);

const CATEGORIES = {
  expense: [
    { id: 'food', name: '🍔 طعام ومطاعم' },
    { id: 'transport', name: '🚗 مواصلات' },
    { id: 'housing', name: '🏠 سكن وفواتير' },
    { id: 'shopping', name: '🛍️ تسوق' },
    { id: 'health', name: '💊 صحة' },
    { id: 'entertainment', name: '🎮 ترفيه' },
    { id: 'education', name: '📚 تعليم' },
    { id: 'other-exp', name: '📌 أخرى' },
  ],
  income: [
    { id: 'salary', name: '💼 راتب' },
    { id: 'freelance', name: '💻 عمل حر' },
    { id: 'business', name: '🏪 تجارة' },
    { id: 'other-inc', name: '📌 أخرى' },
  ],
};

const EMOJI = { food:'🍔', transport:'🚗', housing:'🏠', shopping:'🛍️', health:'💊', entertainment:'🎮', education:'📚', 'other-exp':'📌', salary:'💼', freelance:'💻', business:'🏪', 'other-inc':'📌' };

const CAT_GRAD = {
  food: 'linear-gradient(135deg,#fb923c,#f43f5e)', transport: 'linear-gradient(135deg,#38bdf8,#6366f1)',
  housing: 'linear-gradient(135deg,#a78bfa,#7c3aed)', shopping: 'linear-gradient(135deg,#f472b6,#e11d48)',
  health: 'linear-gradient(135deg,#34d399,#059669)', entertainment: 'linear-gradient(135deg,#facc15,#f97316)',
  education: 'linear-gradient(135deg,#22d3ee,#2563eb)', 'other-exp': 'linear-gradient(135deg,#94a3b8,#64748b)',
  salary: 'linear-gradient(135deg,#4ade80,#16a34a)', freelance: 'linear-gradient(135deg,#2dd4bf,#0d9488)',
  business: 'linear-gradient(135deg,#fbbf24,#b45309)', 'other-inc': 'linear-gradient(135deg,#94a3b8,#64748b)',
};

const CURRENCIES = ['ر.س', 'ر.ي', 'د.إ', 'د.ك', 'د.ب', 'ر.ع', 'ق.ر', 'ج.م', 'ل.س', '$', '€'];
const CUSTOM_EMOJIS = ['📌','☕','🎁','🧾','✈️','🐾','💡','💰','🎯'];
const CUSTOM_GRADS = [
  'linear-gradient(135deg,#0ea5e9,#2563eb)', 'linear-gradient(135deg,#f97316,#db2777)',
  'linear-gradient(135deg,#14b8a6,#059669)', 'linear-gradient(135deg,#8b5cf6,#6366f1)',
  'linear-gradient(135deg,#eab308,#f97316)', 'linear-gradient(135deg,#64748b,#334155)',
];

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

let state = { type: 'expense', txs: [], budget: 0, currency: 'ر.س', editingId: null, plan: null, accounts: [{ id: 'cash', name: 'كاش', icon: '💵', openingBalance: 0, archived: false }], customCategories: { expense: [], income: [] }, challenges: [], lock: { enabled: false, pin: '' } };
let catChart = null, monthChart = null, balChart = null, weekChart = null;
let calCursor = null; // يضبط في init بعد تعريف helpers
let curTab = 'home';

const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const validDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && localDate(new Date(`${v}T12:00:00`)) === v;
const safeText = (v, max = 80) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const escapeHtml = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const newId = () => Date.now() + Math.floor(Math.random() * 1000000);
const normalizeCustomCategories = (raw) => {
  const out = { expense: [], income: [] };
  const used = new Set([...CATEGORIES.expense, ...CATEGORIES.income].map(c => c.id));
  ['expense', 'income'].forEach(type => {
    const rows = raw && Array.isArray(raw[type]) ? raw[type] : [];
    rows.slice(0, 80).forEach((c, i) => {
      if (!c) return;
      const id = safeText(c.id, 64);
      const name = safeText(c.name, 24);
      if (!id || !name || used.has(id)) return;
      used.add(id);
      const emoji = CUSTOM_EMOJIS.includes(c.emoji) ? c.emoji : '📌';
      const color = CUSTOM_GRADS.includes(c.color) ? c.color : CUSTOM_GRADS[i % CUSTOM_GRADS.length];
      out[type].push({ id, name, emoji, color });
    });
  });
  return out;
};
const categoriesFor = (type, customs = state.customCategories) => [
  ...CATEGORIES[type],
  ...((customs && Array.isArray(customs[type])) ? customs[type].map(c => ({ ...c, name: `${c.emoji} ${c.name}` })) : []),
];
const cleanCategory = (id, type, customs = state.customCategories) => categoriesFor(type, customs).some(c => c.id === id) ? id : (type === 'income' ? 'other-inc' : 'other-exp');

// ---------- storage ----------
function load() {
  try {
    const raw = localStorage.getItem('masrofy-v1');
    if (raw) state = { ...state, ...JSON.parse(raw), editingId: null };
  } catch {}
  if (!CURRENCIES.includes(state.currency)) state.currency = 'ر.س';
  if (!Array.isArray(state.txs)) state.txs = [];
  // migration: accounts
  if (!Array.isArray(state.accounts) || !state.accounts.length) {
    state.accounts = [{ id: 'cash', name: 'كاش', icon: '💵', openingBalance: 0, archived: false }];
  }
  const seenAccounts = new Set();
  state.accounts = state.accounts.filter(a => a && !seenAccounts.has(String(a.id)) && seenAccounts.add(String(a.id))).map(a => ({
    id: safeText(a.id, 64) || String(newId()), name: safeText(a.name || 'حساب', 20), icon: safeText(a.icon || '💵', 4),
    openingBalance: Number.isFinite(Number(a.openingBalance)) ? Number(a.openingBalance) : 0, archived: a.archived === true,
  }));
  if (!state.accounts.length) state.accounts = [{ id: 'cash', name: 'كاش', icon: '💵', openingBalance: 0, archived: false }];
  if (!state.accounts.some(a => !a.archived)) state.accounts[0].archived = false;
  state.customCategories = normalizeCustomCategories(state.customCategories);
  state.txs.forEach(t => {
    t.accountId = String(t.accountId || '');
    if (!state.accounts.some(a => a.id === t.accountId)) t.accountId = state.accounts[0].id;
  });
  state.txs = state.txs.filter(t => t && Number.isFinite(Number(t.amount)) && Number(t.amount) > 0 && validDate(String(t.date || '').slice(0, 10))).map(t => ({
    ...t, id: Number.isFinite(Number(t.id)) ? Number(t.id) : newId(), amount: Number(t.amount),
    type: t.type === 'income' ? 'income' : 'expense', category: cleanCategory(t.category, t.type === 'income' ? 'income' : 'expense'),
    date: String(t.date).slice(0, 10), note: safeText(t.note), recur: ['daily', 'weekly', 'monthly'].includes(t.recur) ? t.recur : 'none',
    accountId: safeText(t.accountId || state.accounts[0].id, 64), transfer: t.transfer === true,
    transferId: t.transferId ? safeText(t.transferId, 64) : undefined,
    seriesId: t.seriesId == null ? undefined : Number(t.seriesId),
    nextDate: validDate(t.nextDate) ? t.nextDate : undefined,
    anchorDay: Math.min(31, Math.max(1, Number(t.anchorDay) || Number(String(t.date).slice(8, 10)) || 1)),
  }));
  const unmatchedTransfers = state.txs.filter(t => t.transfer && !t.transferId);
  unmatchedTransfers.forEach((t, i) => {
    if (t.transferId || t.type !== 'expense') return;
    const mate = unmatchedTransfers.slice(i + 1).find(x => !x.transferId && x.type === 'income' && x.amount === t.amount && x.date === t.date);
    if (mate) t.transferId = mate.transferId = `legacy-${t.id}-${mate.id}`;
  });
  if (!Array.isArray(state.challenges)) state.challenges = [];
  state.challenges = state.challenges.filter(c => c && Number(c.target) > 0).map(c => ({
    id: Number.isFinite(Number(c.id)) ? Number(c.id) : newId(), name: safeText(c.name || 'تحدي', 30),
    target: Number(c.target), weeks: Math.max(1, Math.round(Number(c.weeks) || 8)),
    start: validDate(c.start) ? c.start : localDate(), log: Array.isArray(c.log) ? c.log.filter(e => e && Number(e.amount) > 0 && validDate(e.date)).map(e => ({ date: e.date, amount: Number(e.amount) })) : [],
  }));
  if (!state.lock || typeof state.lock !== 'object') state.lock = { enabled: false, pin: '' };
}
function save() {
  try {
    localStorage.setItem('masrofy-v1', JSON.stringify({ txs: state.txs, budget: state.budget, currency: state.currency, plan: state.plan, accounts: state.accounts, customCategories: state.customCategories, challenges: state.challenges, lock: state.lock }));
    return true;
  } catch {
    alert('تعذر حفظ البيانات على الجهاز. صدّر نسخة احتياطية وتأكد من توفر مساحة تخزين.');
    return false;
  }
}

// operations affecting real income/expense (transfers excluded)
const REAL = (t) => !t.transfer;
const accOf = (id) => state.accounts.find(a => String(a.id) === String(id)) || state.accounts[0];
const accName = (id) => accOf(id).name;
const accIcon = (id) => accOf(id).icon || '💵';
const activeAccounts = () => state.accounts.filter(a => !a.archived);
const accBalance = (id) => (Number(accOf(id).openingBalance) || 0) + state.txs.filter(t => String(t.accountId) === String(id)).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);

// ---------- helpers ----------
const fmt = (n) => Number(n || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 }) + ' ' + state.currency;
const customCategory = (id) => [...(state.customCategories?.expense || []), ...(state.customCategories?.income || [])].find(c => c.id === id);
const catName = (id) => [...CATEGORIES.expense, ...CATEGORIES.income].find(c => c.id === id)?.name || customCategory(id)?.name || id;
const catEmoji = (id) => EMOJI[id] || customCategory(id)?.emoji || '📌';
const catGradient = (id) => CAT_GRAD[id] || customCategory(id)?.color || 'var(--border)';

// ---------- toast ----------
let toastTimer = null;
function toast(msg, actionLabel, action, duration) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('actionable', !!actionLabel);
  if (actionLabel && typeof document.createElement === 'function' && typeof t.appendChild === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'toast-action'; btn.textContent = actionLabel;
    btn.onclick = () => { clearTimeout(toastTimer); action(); };
    t.appendChild(btn);
  }
  t.classList.remove('show');
  t.classList.remove('hidden');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.classList.add('hidden'), 250);
  }, duration || 2400);
}

// ---------- animated numbers ----------
const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function animateNum(el, to) {
  const from = parseFloat(el.dataset.v || '0');
  el.dataset.v = to;
  if (from === to || reducedMotion()) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 650;
  function fr(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(fr);
  }
  requestAnimationFrame(fr);
}
const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_AR[m - 1] || ''} ${y || ''}`.trim();
};
const curMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const prevMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const RECUR_NAMES = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري' };

// ---------- recurring engine ----------
function addInterval(dateStr, recur, anchorDay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (recur === 'daily') {
    dt.setDate(dt.getDate() + 1);
  } else if (recur === 'weekly') {
    dt.setDate(dt.getDate() + 7);
  } else {
    const day = Math.min(31, Math.max(1, Number(anchorDay) || dt.getDate()));
    dt.setDate(1);
    dt.setMonth(dt.getMonth() + 1);
    const dim = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    dt.setDate(Math.min(day, dim));
  }
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
// يولّد النسخ المستحقة من العمليات المتكررة حتى تاريخ اليوم
function processRecurring() {
  const today = localDate();
  let changed = false;
  const templates = state.txs.filter(t => t.recur && t.recur !== 'none');
  templates.forEach(t => {
    if (!t.recur || t.recur === 'none') return;
    if (accOf(t.accountId).archived) return;
    if (!t.anchorDay) t.anchorDay = Number(String(t.date).slice(8, 10)) || 1;
    if (!t.nextDate) t.nextDate = addInterval(t.date, t.recur, t.anchorDay);
    let guard = 0;
    while (t.nextDate && t.nextDate <= today && guard < 36) {
      const occurrence = t.nextDate;
      if (!state.txs.some(x => String(x.seriesId) === String(t.id) && x.date === occurrence)) {
        state.txs.unshift({ id: newId(), type: t.type, amount: t.amount, category: t.category, date: occurrence,
          note: t.note || '', recur: 'none', seriesId: t.id, accountId: t.accountId });
      }
      t.nextDate = addInterval(t.nextDate, t.recur, t.anchorDay);
      guard++;
      changed = true;
    }
  });
  if (changed) save();
}

// ---------- theme ----------
function initTheme() {
  const t = localStorage.getItem('masrofy-theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
  $('themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
  let a = 'indigo';
  try { a = localStorage.getItem('masrofy-accent') || 'indigo'; } catch {}
  if (!ACCENTS[a]) a = 'indigo';
  document.documentElement.dataset.accent = a;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = ACCENTS[a].meta;
}
$('themeBtn').onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', cur);
  localStorage.setItem('masrofy-theme', cur);
  $('themeBtn').textContent = cur === 'dark' ? '☀️' : '🌙';
  renderCharts();
};

// ---------- accent themes ----------
const ACCENTS = {
  indigo: { name: 'بنفسجي', c1: '#6366f1', c2: '#8b5cf6', meta: '#4f46e5' },
  mint: { name: 'نعناعي', c1: '#10b981', c2: '#34d399', meta: '#059669' },
  gold: { name: 'ذهبي', c1: '#f59e0b', c2: '#f97316', meta: '#b45309' },
  rose: { name: 'وردي', c1: '#f43f5e', c2: '#fb7185', meta: '#e11d48' },
  sky: { name: 'سماوي', c1: '#0ea5e9', c2: '#38bdf8', meta: '#0284c7' },
};
const accColor = () => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--grad2').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  } catch {}
  return '#8b5cf6';
};
function renderSwatches() {
  const box = $('swatches');
  if (!box) return;
  const cur = document.documentElement.dataset.accent || 'indigo';
  box.innerHTML = Object.entries(ACCENTS).map(([k, v]) =>
    `<button class="sw${cur === k ? ' sel' : ''}" onclick="applyAccent('${k}')"><span style="--sw1:${v.c1};--sw2:${v.c2}"></span>${v.name}</button>`).join('');
}
function applyAccent(a) {
  if (!ACCENTS[a]) a = 'indigo';
  document.documentElement.dataset.accent = a;
  try { localStorage.setItem('masrofy-accent', a); } catch {}
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = ACCENTS[a].meta;
  renderSwatches();
  renderCharts();
  if (navigator.vibrate) navigator.vibrate(10);
}
window.applyAccent = applyAccent;
$('accentBtn').onclick = () => { renderSwatches(); syncThemeInputs(); $('themeSheet').classList.remove('hidden'); };
$('themeSheet').addEventListener('click', (e) => { if (e.target === $('themeSheet')) $('themeSheet').classList.add('hidden'); });

// ---------- glass + name ----------
function applyGlass(on) {
  document.documentElement.dataset.glass = on ? '1' : '0';
  try { localStorage.setItem('masrofy-glass', on ? '1' : '0'); } catch {}
  const t = $('glassToggle');
  if (t) t.checked = !!on;
}
function syncThemeInputs() {
  renderSwatches();
  try {
    $('userName').value = localStorage.getItem('masrofy-name') || '';
    $('glassToggle').checked = (localStorage.getItem('masrofy-glass') || '1') === '1';
  } catch {}
}
$('glassToggle').onchange = () => { applyGlass($('glassToggle').checked); toast($('glassToggle').checked ? 'تم تفعيل الطابع الزجاجي 🪟' : 'تم إيقاف الطابع الزجاجي'); };
$('userName').onchange = () => {
  try { localStorage.setItem('masrofy-name', $('userName').value.trim().slice(0, 20)); } catch {}
  renderHero();
  toast('تم حفظ الاسم 👋');
};

// ---------- hero greeting ----------
const QUOTES = [
  'الادخار الصغير اليوم هو الحرية المالية غداً 🌱',
  'لا تدخر ما يتبقى بعد الإنفاق، بل أنفق ما يتبقى بعد الادخار 💡',
  'كل ريال توفره هو موظف يعمل لصالحك 💪',
  'الثراء عادة وليس مبلغاً ✨',
  'راقب مصاريفك الصغيرة فهي تثقب السفينة الكبيرة 🚢',
  'الانضباط المالي أقوى من الدخل العالي 🎯',
  'اشترِ ما تحتاجه فعلاً وادخر الباقي بذكاء 🧠',
  'الحرية المالية تبدأ من معرفة أين تذهب فلوسك 🗺️',
];
function renderHero() {
  const h = new Date().getHours();
  const g = (h >= 5 && h < 12) ? ['صباح الخير', '☀️'] : (h >= 12 && h < 17) ? ['طاب يومك', '🌤️'] : (h >= 17 && h < 23) ? ['مساء الخير', '🌙'] : ['ليلة سعيدة', '🌟'];
  let name = '';
  try { name = (localStorage.getItem('masrofy-name') || '').trim().slice(0, 20); } catch {}
  if ($('heroTxt')) $('heroTxt').textContent = `${g[0]}${name ? ' يا ' + name : ''} ${g[1]}`;
  if ($('heroEmoji')) $('heroEmoji').textContent = g[1];
  if ($('heroSub')) {
    const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
    $('heroSub').textContent = QUOTES[doy % QUOTES.length];
  }
}

// ---------- confetti ----------
function confettiBurst(n) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  n = n || 130;
  let c = document.getElementById('confetti');
  if (!c) { c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c); }
  c.width = window.innerWidth; c.height = window.innerHeight;
  const ctx = c.getContext('2d');
  const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#38bdf8', '#f472b6'];
  const ps = [];
  for (let i = 0; i < n; i++) ps.push({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 140, y: window.innerHeight * 0.32,
    vx: (Math.random() - 0.5) * 9, vy: Math.random() * -7 - 2,
    s: Math.random() * 7 + 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    col: colors[i % colors.length], life: 90 + Math.random() * 50,
  });
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    let alive = false;
    ps.forEach(p => {
      if (f > p.life) return;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1 - f / p.life);
      ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
      ctx.restore();
    });
    f++;
    if (alive) requestAnimationFrame(tick);
    else if (c.parentNode) c.parentNode.removeChild(c);
  })();
}
window.confettiBurst = confettiBurst;

// ---------- selectors ----------
function fillCategories() {
  const sel = $('category');
  const keepCategory = sel.value;
  sel.innerHTML = categoriesFor(state.type).map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
  if ([...sel.options].some(o => o.value === keepCategory)) sel.value = keepCategory;
  const f = $('filterCat');
  const keep = f.value;
  const all = [...categoriesFor('expense'), ...categoriesFor('income')];
  f.innerHTML = '<option value="">كل الفئات</option>' + all.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
  if ([...f.options].some(o => o.value === keep)) f.value = keep;
}
function fillCurrency() {
  const sel = $('currency');
  sel.innerHTML = CURRENCIES.map(c => `<option value="${c}">${c}</option>`).join('');
  sel.value = state.currency;
}
function fillMonthFilter() {
  const sel = $('filterMonth');
  const keep = sel.value;
  const months = [...new Set(state.txs.map(t => (t.date || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  sel.innerHTML = '<option value="">كل الشهور</option>' + months.map(m => `<option value="${m}">${monthLabel(m)}</option>`).join('');
  if (months.includes(keep)) sel.value = keep;
}
function selectedReportMonth() { return ($('reportMonth') && $('reportMonth').value) || curMonth(); }
function fillReportMonth() {
  const sel = $('reportMonth');
  if (!sel) return;
  const keep = sel.value || curMonth();
  const months = [...new Set([curMonth(), ...state.txs.map(t => (t.date || '').slice(0, 7)).filter(Boolean)])].sort().reverse();
  sel.innerHTML = months.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(monthLabel(m))}</option>`).join('');
  sel.value = months.includes(keep) ? keep : curMonth();
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  state.type = b.dataset.type;
  fillCategories();
});
$('currency').onchange = () => {
  const next = $('currency').value || 'ر.س';
  if (state.txs.length && next !== state.currency && !confirm('تغيير العملة يغيّر رمز العرض فقط ولا يحوّل مبالغ العمليات. متابعة؟')) {
    $('currency').value = state.currency;
    return;
  }
  state.currency = next;
  save(); render();
};

// ---------- form (add + edit) ----------
function setTypeTab(type) {
  state.type = type;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.type === type));
  fillCategories();
}
function cancelEdit() {
  state.editingId = null;
  $('txForm').reset();
  $('date').value = localDate();
  $('submitBtn').textContent = 'إضافة ✅';
  $('formTitle').textContent = '➕ إضافة عملية جديدة';
  $('cancelEditBtn').classList.add('hidden');
}
$('cancelEditBtn').onclick = cancelEdit;
document.querySelectorAll('.quick-amounts [data-amount]').forEach(btn => btn.onclick = () => {
  $('amount').value = btn.dataset.amount;
  $('amount').focus();
});

$('txForm').onsubmit = (e) => {
  e.preventDefault();
  const amount = parseFloat($('amount').value);
  const date = $('date').value || localDate();
  if (!amount || amount <= 0) return alert('ادخل مبلغ صحيح');
  const data = {
    type: state.type,
    amount,
    category: $('category').value,
    date,
    note: $('note').value.trim(),
    recur: $('recur').value || 'none',
    accountId: ($('txAccount') && $('txAccount').value) || (state.accounts[0] && state.accounts[0].id) || 'cash',
  };
  try { localStorage.setItem('masrofy-last-account', data.accountId); } catch {}
  if (state.editingId) {
    const tx = state.txs.find(t => t.id === state.editingId);
    if (tx) {
      const scheduleChanged = tx.recur !== data.recur || tx.date !== data.date;
      Object.assign(tx, data);
      if (data.recur === 'none') delete tx.nextDate;
      else if (scheduleChanged || !tx.nextDate) {
        tx.anchorDay = Number(data.date.slice(8, 10));
        tx.nextDate = addInterval(data.date, data.recur, tx.anchorDay);
      }
    }
    cancelEdit();
    toast('تم حفظ التعديل ✅');
  } else {
    const tx = { id: newId(), ...data };
    if (data.recur !== 'none') {
      tx.anchorDay = Number(data.date.slice(8, 10));
      tx.nextDate = addInterval(data.date, data.recur, tx.anchorDay);
    }
    state.txs.unshift(tx);
    $('amount').value = ''; $('note').value = '';
    if (!catAlert(tx)) toast('تمت الإضافة ✅');
  }
  if (navigator.vibrate) navigator.vibrate(20);
  save(); render();
};

window.editTx = (id) => {
  const tx = state.txs.find(t => t.id === id);
  if (!tx) return;
  state.editingId = id;
  setTypeTab(tx.type);
  $('category').value = tx.category;
  $('amount').value = tx.amount;
  $('date').value = tx.date;
  $('note').value = tx.note || '';
  $('recur').value = tx.recur || 'none';
  if ($('txAccount')) $('txAccount').value = tx.accountId || (state.accounts[0] && state.accounts[0].id);
  $('submitBtn').textContent = 'حفظ التعديل ✅';
  $('formTitle').textContent = '✏️ تعديل العملية';
  $('cancelEditBtn').classList.remove('hidden');
  showPage('add');
  setTimeout(() => { const a = $('amount'); if (a) a.focus({ preventScroll: true }); }, 350);
};

$('date').value = localDate();

// ---------- budget ----------
$('saveBudgetBtn').onclick = () => {
  state.budget = parseFloat($('budgetInput').value) || 0;
  save(); render();
  toast('تم حفظ الميزانية 🎯');
};

// ---------- backup: CSV / JSON / import ----------
function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  if (window.MasrofyAndroid && typeof window.MasrofyAndroid.saveFile === 'function') {
    const reader = new FileReader();
    reader.onload = () => window.MasrofyAndroid.saveFile(name, mime, String(reader.result).split(',')[1] || '');
    reader.readAsDataURL(blob);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportCSV() {
  if (!state.txs.length) return alert('لا توجد بيانات للتصدير');
  const csvCell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = [['id','type','amount','category','date','note','accountId','recurrence','transferId'], ...state.txs.map(t => [t.id, t.type, t.amount, t.category, t.date, t.note, t.accountId, t.recur || 'none', t.transferId || ''])];
  downloadFile('masrofy-export.csv', '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير CSV 📥');
}
function exportJSON() {
  const backup = {
    app: 'masrofy',
    version: 4,
    exported: new Date().toISOString(),
    currency: state.currency,
    budget: state.budget,
    accounts: state.accounts,
    customCategories: state.customCategories,
    challenges: state.challenges,
    plan: state.plan,
    txs: state.txs,
  };
  const d = localDate();
  downloadFile(`masrofy-backup-${d}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
  toast('تم حفظ النسخة الاحتياطية 💾');
}
$('exportBtn').onclick = exportCSV;
$('exportCsvBtn').onclick = exportCSV;
$('exportJsonBtn').onclick = exportJSON;
$('importFile').onchange = (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data) && (!data || data.app !== 'masrofy')) throw new Error('bad format');
      const sourceTxs = Array.isArray(data) ? data : (Array.isArray(data.txs) ? data.txs : []);
      const sourceAccounts = !Array.isArray(data) && Array.isArray(data.accounts) && data.accounts.length ? data.accounts : [{ id: 'cash', name: 'كاش', icon: '💵', openingBalance: 0, archived: false }];
      const customCategories = !Array.isArray(data) ? normalizeCustomCategories(data.customCategories) : { expense: [], income: [] };
      const accountIds = new Set();
      const accounts = sourceAccounts.filter(a => a && a.id != null).map(a => ({ id: safeText(a.id, 64), name: safeText(a.name || 'حساب', 20), icon: safeText(a.icon || '💵', 4), openingBalance: Number.isFinite(Number(a.openingBalance)) ? Number(a.openingBalance) : 0, archived: a.archived === true }))
        .filter(a => a.id && !accountIds.has(a.id) && accountIds.add(a.id));
      if (!accounts.length) accounts.push({ id: 'cash', name: 'كاش', icon: '💵', openingBalance: 0, archived: false });
      if (!accounts.some(a => !a.archived)) accounts[0].archived = false;
      const ids = new Set();
      const clean = sourceTxs.map(t => {
        if (!t || !(Number(t.amount) > 0) || !validDate(String(t.date || '').slice(0, 10))) throw new Error('bad transaction');
        let id = Number(t.id); if (!Number.isFinite(id) || ids.has(id)) id = newId(); ids.add(id);
        const recur = ['daily', 'weekly', 'monthly'].includes(t.recur) ? t.recur : 'none';
        const row = { id, type: t.type === 'income' ? 'income' : 'expense', amount: Number(t.amount),
          category: cleanCategory(t.category, t.type === 'income' ? 'income' : 'expense', customCategories), date: String(t.date).slice(0, 10), note: safeText(t.note), recur,
          accountId: accountIds.has(String(t.accountId)) ? String(t.accountId) : accounts[0].id, transfer: t.transfer === true };
        if (t.transferId) row.transferId = safeText(t.transferId, 64);
        if (t.seriesId != null && Number.isFinite(Number(t.seriesId))) row.seriesId = Number(t.seriesId);
        if (recur !== 'none') {
          row.anchorDay = Math.min(31, Math.max(1, Number(t.anchorDay) || Number(row.date.slice(8, 10))));
          row.nextDate = validDate(t.nextDate) ? t.nextDate : addInterval(row.date, recur, row.anchorDay);
        }
        return row;
      });
      const challenges = !Array.isArray(data) && Array.isArray(data.challenges) ? data.challenges.map(c => {
        if (!c || !(Number(c.target) > 0) || (c.log != null && !Array.isArray(c.log))) throw new Error('bad challenge');
        return { id: Number.isFinite(Number(c.id)) ? Number(c.id) : newId(), name: safeText(c.name || 'تحدي', 30), target: Number(c.target),
          weeks: Math.max(1, Math.round(Number(c.weeks) || 8)), start: validDate(c.start) ? c.start : localDate(),
          log: (c.log || []).map(x => { if (!x || !(Number(x.amount) > 0) || !validDate(x.date)) throw new Error('bad challenge entry'); return { date: x.date, amount: Number(x.amount) }; }) };
      }) : [];
      if (!confirm(`سيتم استبدال بياناتك الحالية بـ ${clean.length} عملية من النسخة الاحتياطية. متابعة؟`)) return;
      state.txs = clean;
      state.accounts = accounts;
      state.customCategories = customCategories;
      state.challenges = challenges;
      if (!Array.isArray(data) && isFinite(data.budget)) state.budget = Math.max(0, Number(data.budget) || 0);
      if (!Array.isArray(data) && data.currency && CURRENCIES.includes(data.currency)) {
        state.currency = data.currency;
        $('currency').value = state.currency;
      }
      if (!Array.isArray(data) && data.plan && typeof data.plan === 'object') {
        const p = data.plan;
        const alloc = {};
        PLAN_CATS.forEach(k => { alloc[k] = Math.max(0, Number(p.alloc && p.alloc[k]) || 0); });
        state.plan = { salary: Math.max(0, Number(p.salary) || 0), fixed: Math.max(0, Number(p.fixed) || 0),
          mode: Object.hasOwn(MODES, p.mode) ? p.mode : 'balanced', modeName: safeText(p.modeName || '', 30),
          rate: Math.max(0, Number(p.rate) || 0), savings: Math.max(0, Number(p.savings) || 0),
          spending: Math.max(0, Number(p.spending) || 0), alloc };
      } else if (!Array.isArray(data)) state.plan = null;
      cancelEdit();
      save(); processRecurring(); render();
      toast('تم الاستيراد بنجاح ✅');
    } catch {
      alert('تعذر قراءة الملف — تأكد أنه نسخة احتياطية من مَصرفي');
    }
  };
  reader.readAsText(file);
};

$('clearBtn').onclick = () => { if (confirm('متأكد تبي تمسح كل العمليات؟ (ننصح بأخذ نسخة احتياطية أولاً 💾)')) { cancelEdit(); state.txs = []; save(); render(); toast('تم مسح العمليات 🧹'); } };
$('sampleBtn').onclick = () => {
  if (state.txs.length && !confirm('البيانات التجريبية ستستبدل عملياتك الحالية. خذ نسخة احتياطية أولاً. متابعة؟')) return;
  const today = new Date();
  const d = (offset) => { const x = new Date(today); x.setDate(x.getDate() - offset); return localDate(x); };
  cancelEdit();
  state.txs = [
    { id: 1, type: 'income', amount: 8000, category: 'salary', date: d(20), note: 'راتب الشهر', accountId: 'cash' },
    { id: 2, type: 'income', amount: 1200, category: 'freelance', date: d(12), note: 'مشروع تصميم', accountId: 'cash' },
    { id: 3, type: 'expense', amount: 900, category: 'housing', date: d(18), note: 'إيجار + كهرباء', accountId: 'cash' },
    { id: 4, type: 'expense', amount: 650, category: 'food', date: d(5), note: 'مطاعم', accountId: 'cash' },
    { id: 5, type: 'expense', amount: 320, category: 'transport', date: d(3), note: 'بنزين', accountId: 'cash' },
    { id: 6, type: 'expense', amount: 450, category: 'shopping', date: d(2), note: 'ملابس', accountId: 'cash' },
    { id: 7, type: 'expense', amount: 200, category: 'entertainment', date: d(1), note: 'سينما', accountId: 'cash' },
  ];
  if (!state.budget) state.budget = 3000;
  save(); render();
  toast('تم تحميل بيانات تجريبية ✨');
};

// ---------- filters ----------
['search','filterCat','filterType','filterMonth','filterSort','filterAcc'].forEach(id => $(id) && $(id).addEventListener('input', renderList));

// ---------- render ----------
function render() {
  const cm = curMonth();
  const monthTxs = state.txs.filter(t => REAL(t) && (t.date || '').slice(0, 7) === cm);
  const income = monthTxs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const expense = monthTxs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const balance = income - expense;
  $('totalIncome').textContent = fmt(income);
  $('totalExpense').textContent = fmt(expense);
  $('balance').textContent = fmt(balance);
  try {
    animateNum($('totalIncome'), income);
    animateNum($('totalExpense'), expense);
    animateNum($('balance'), balance);
  } catch {}
  $('incomeCount').textContent = monthTxs.filter(t => t.type==='income').length + ' عملية';
  $('expenseCount').textContent = monthTxs.filter(t => t.type==='expense').length + ' عملية';
  $('savingRate').textContent = income > 0 ? 'معدل الشهر: ' + Math.round(balance/income*100) + '%' : 'لا يوجد دخل مسجل هذا الشهر';
  $('curAmount').textContent = state.currency;
  $('curBudget').textContent = state.currency;

  // budget (current month)
  const monthExp = expense;
  if (document.activeElement !== $('budgetInput')) $('budgetInput').value = state.budget || '';
  if (state.budget > 0) {
    const pct = Math.round(monthExp / state.budget * 100);
    $('budgetBar').style.width = Math.min(100, pct) + '%';
    $('budgetBar').style.background = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(0, daysInMonth - now.getDate());
    const remain = state.budget - monthExp;
    $('budgetText').textContent = remain >= 0
      ? `صرفت ${fmt(monthExp)} من ${fmt(state.budget)} (${pct}%) • باقي ${fmt(remain)} • ${daysLeft} يوم`
      : `تجاوزت الميزانية بـ ${fmt(-remain)}!`;
    const b = $('budgetBanner');
    b.classList.remove('hidden');
    if (pct >= 100) { b.className = 'banner danger'; b.textContent = '🚨 تجاوزت ميزانية الشهر! قلل المصاريف غير الضرورية.'; }
    else if (pct >= 80) { b.className = 'banner warn'; b.textContent = `⚠️ وصلت لـ ${pct}% من الميزانية — انتبه.`; }
    else { b.className = 'banner ok'; b.textContent = `✅ وضعك ممتاز — صرفت ${pct}% فقط من الميزانية.`; }
  } else {
    $('budgetBar').style.width = '0%';
    $('budgetText').textContent = 'حدد ميزانيتك لتفعيل التنبيهات';
    $('budgetBanner').classList.add('hidden');
  }

  // daily digest
  const todayStr = localDate();
  const dayExp = state.txs.filter(t => REAL(t) && t.type === 'expense' && t.date === todayStr).reduce((s, t) => s + t.amount, 0);
  const dayInc = state.txs.filter(t => REAL(t) && t.type === 'income' && t.date === todayStr).reduce((s, t) => s + t.amount, 0);
  $('digestDate').textContent = todayStr;
  $('digestExp').textContent = fmt(dayExp);
  $('digestInc').textContent = fmt(dayInc);
  if (state.budget > 0) {
    const nowD = new Date();
    const dimD = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate();
    const leftD = Math.max(1, dimD - nowD.getDate() + 1);
    const safeD = Math.max(0, (state.budget - monthExp) / leftD);
    $('digestSafe').textContent = fmt(safeD);
    const avgD = expense / Math.max(1, new Date().getDate());
    $('digestTip').textContent = (avgD > 0 && dayExp > avgD * 1.5)
      ? '⚠️ صرفت اليوم أكثر من معتادك — هدّئ السرعة قليلاً.'
      : `💡 المتاح لك اليوم ${fmt(safeD)} لتبقى ضمن الميزانية.`;
  } else {
    $('digestSafe').textContent = '—';
    $('digestTip').textContent = state.txs.length ? '🎯 حدد ميزانيتك لتظهر لك حدود الصرف اليومية.' : '👋 سجّل أول عملية وابدأ رحلتك المالية!';
  }

  fillMonthFilter();
  fillReportMonth();
  renderList();
  renderCharts();
  renderInsights();
  renderPlan();
  renderHero();
  fillAccounts();
  renderRecurring();
  renderCustomCategories();
  renderCalendar();
  renderChallenges();
  // احتفال شهري عند بلوغ ادخار ممتاز
  if (income > 0 && balance > 0 && Math.round(balance / income * 100) >= 20) {
    const fk = 'masrofy-fete-' + curMonth();
    let seen = '';
    try { seen = localStorage.getItem(fk) || ''; } catch {}
    if (!seen) {
      try { localStorage.setItem(fk, '1'); } catch {}
      confettiBurst(90);
      toast('💪 معدل ادخارك ممتاز! استمر 🎉');
    }
  }
}

// ---------- monthly plan card ----------
function renderPlan() {
  const card = $('planCard');
  const p = state.plan;
  if (!p) { card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  $('planMode').textContent = p.modeName || '';
  const cm = curMonth();
  const spent = (cat) => state.txs.filter(t => REAL(t) && t.type === 'expense' && t.category === cat && (t.date || '').slice(0, 7) === cm).reduce((s, t) => s + t.amount, 0);
  $('planSummary').innerHTML = `
    <div class="plan-row"><span>💰 الراتب الشهري</span><b>${fmt(p.salary)}</b></div>
    <div class="plan-row"><span>🏠 التزامات ثابتة</span><b>${fmt(p.fixed)}</b></div>
    <div class="plan-row"><span>💪 هدف الادخار (${Math.round((p.rate || 0) * 100)}%)</span><b>${fmt(p.savings)}</b></div>
    <div class="plan-row total"><span>🎯 ميزانية الصرف</span><b>${fmt(p.spending)}</b></div>`;
  const order = ['food', 'transport', 'health', 'education', 'shopping', 'entertainment', 'other-exp'];
  $('planRows').innerHTML = order.filter(c => (p.alloc[c] || 0) > 0).map(c => {
    const a = p.alloc[c], s = spent(c);
    const pct = a > 0 ? Math.min(100, Math.round(s / a * 100)) : 0;
    const col = pct >= 100 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
    return `<div class="plan-cat"><div class="plan-row"><span>${catName(c)}</span><small>${fmt(s)} / ${fmt(a)}</small></div><div class="progress"><div style="width:${pct}%;background:${col}"></div></div></div>`;
  }).join('');
  const fun = (p.alloc.entertainment || 0) + (p.alloc.shopping || 0);
  $('planFun').innerHTML = `🎉 للتمشيات والوناسة (ترفيه + تسوق) تقدر تصرف حتى <b>${fmt(fun)}</b> هذا الشهر — والأساسيات أولاً ✅`;
}
$('editPlanBtn').onclick = () => openWizardEdit();
$('delPlanBtn').onclick = () => { if (confirm('حذف خطة الميزانية؟ (عملياتك وميزانيتك الحالية تبقى كما هي)')) { state.plan = null; save(); render(); toast('تم حذف الخطة'); } };

function getFilteredList() {
  const q = $('search').value.trim();
  const fc = $('filterCat').value, ft = $('filterType').value;
  const fm = $('filterMonth').value, sort = $('filterSort').value;
  const fa = $('filterAcc') ? $('filterAcc').value : '';
  let list = [...state.txs];
  if (ft) list = list.filter(t => t.type === ft);
  if (fc) list = list.filter(t => t.category === fc);
  if (fm) list = list.filter(t => (t.date||'').slice(0,7) === fm);
  if (fa) list = list.filter(t => String(t.accountId) === fa);
  if (q) list = list.filter(t => (t.note||'').includes(q) || String(t.amount).includes(q) || catName(t.category).includes(q) || (t.date||'').includes(q));
  if (sort === 'old') list.sort((a,b) => (a.date||'').localeCompare(b.date||'') || a.id - b.id);
  else if (sort === 'high') list.sort((a,b) => b.amount - a.amount);
  else if (sort === 'low') list.sort((a,b) => a.amount - b.amount);
  else list.sort((a,b) => (b.date||'').localeCompare(a.date||'') || b.id - a.id);
  return list;
}

function renderList() {
  const list = getFilteredList();
  const box = $('txList');
  const hasFilter = $('search').value.trim() || $('filterCat').value || $('filterType').value || $('filterMonth').value || ($('filterAcc') && $('filterAcc').value);
  if (!list.length) {
    box.innerHTML = `<div class="empty">${hasFilter ? 'لا توجد نتائج مطابقة للفلاتر 🔍' : 'لا توجد عمليات — أضف أول عملية من الأعلى 👆'}</div>`;
    $('listSummary').textContent = '';
    return;
  }
  box.innerHTML = list.map(t => `
    <div class="tx" data-tx-id="${escapeHtml(t.id)}">
      <div class="tx-info">
        <div class="tx-emoji" style="background:${catGradient(t.category)}">${escapeHtml(catEmoji(t.category))}</div>
        <div><b>${escapeHtml(catName(t.category))}${t.recur && t.recur !== 'none' ? ` <span class="recur-badge">🔁 ${escapeHtml(RECUR_NAMES[t.recur] || '')}</span>` : ''}</b><small>${escapeHtml(t.date)} • ${escapeHtml(accIcon(t.accountId))}${t.note ? ' • ' + escapeHtml(t.note) : ''}</small></div>
      </div>
      <div class="tx-actions">
        <span class="tx-amount ${t.type}">${t.type==='income'?'+':'-'} ${Number(t.amount).toLocaleString('ar-SA')}</span>
        ${t.transfer ? '' : '<button class="tx-edit" title="تعديل">✏️</button>'}
        <button class="tx-del" title="حذف">🗑️</button>
      </div>
    </div>`).join('');
  box.querySelectorAll('.tx').forEach(row => {
    const id = Number(row.dataset.txId);
    const edit = row.querySelector('.tx-edit');
    const del = row.querySelector('.tx-del');
    if (edit) edit.addEventListener('click', () => editTx(id));
    if (del) del.addEventListener('click', () => delTx(id));
  });
  const net = list.reduce((s,t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  $('listSummary').textContent = `عرض ${list.length} من ${state.txs.length} • صافي المعروض: ${net >= 0 ? '+' : '-'} ${Math.abs(net).toLocaleString('ar-SA')} ${state.currency}`;
}
window.delTx = (id) => {
  const tx = state.txs.find(t => t.id === id);
  if (!tx) return;
  let linkedTransferIds = [];
  if (tx.transfer) {
    linkedTransferIds = tx.transferId
      ? state.txs.filter(t => t.transferId === tx.transferId).map(t => t.id)
      : state.txs.filter(t => t.transfer && t.date === tx.date && t.amount === tx.amount && t.type !== tx.type).slice(0, 1).map(t => t.id).concat(tx.id);
    if (!confirm(`حذف التحويل بمبلغ ${Number(tx.amount).toLocaleString('ar-SA')} ${state.currency} من الحسابين؟`)) return;
  } else if (tx.recur && tx.recur !== 'none') {
    if (!confirm(`هذه عملية متكررة (${RECUR_NAMES[tx.recur] || ''}) — حذفها يوقف التكرار التلقائي. متابعة؟`)) return;
  } else if (!confirm(`حذف ${catName(tx.category)} بمبلغ ${Number(tx.amount).toLocaleString('ar-SA')} ${state.currency}؟`)) return;
  if (state.editingId === id) cancelEdit();
  const removed = state.txs.filter(t => linkedTransferIds.length ? linkedTransferIds.includes(t.id) : t.id === id);
  state.txs = state.txs.filter(t => !removed.includes(t));
  save(); render();
  toast(removed.length > 1 ? 'تم حذف التحويل من الحسابين 🗑️' : 'تم حذف العملية 🗑️', 'تراجع', () => {
    const existing = new Set(state.txs.map(t => t.id));
    state.txs.push(...removed.filter(t => !existing.has(t.id)));
    state.txs.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
    save(); render(); toast('تمت استعادة العملية ✅');
  }, 6000);
};

// ---------- charts ----------
function renderCharts() {
  const reportYm = selectedReportMonth();
  const allReal = state.txs.filter(REAL);
  const expenses = state.txs.filter(t => REAL(t) && t.type === 'expense' && (t.date || '').slice(0, 7) === reportYm);
  const catEmpty = !expenses.length;
  const monthEmpty = !allReal.length;
  $('catEmpty').classList.toggle('hidden', !catEmpty);
  $('catChart').style.display = catEmpty ? 'none' : '';
  $('monthEmpty').classList.toggle('hidden', !monthEmpty);
  $('monthChart').style.display = monthEmpty ? 'none' : '';
  if (monthEmpty) {
    ['balEmpty', 'weekEmpty'].forEach(id => $(id).classList.remove('hidden'));
    ['balChart', 'weekChart'].forEach(id => $(id).style.display = 'none');
  }
  if (!window.Chart || monthEmpty) {
    if (catChart) { catChart.destroy(); catChart = null; }
    if (monthChart) { monthChart.destroy(); monthChart = null; }
    if (balChart) { balChart.destroy(); balChart = null; }
    if (weekChart) { weekChart.destroy(); weekChart = null; }
    return;
  }

  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = dark ? '#2a3354' : '#e5e7eb';
  const tickColor = dark ? '#94a3b8' : '#6b7280';
  Chart.defaults.color = tickColor;
  Chart.defaults.borderColor = gridColor;

  try {
    const byCat = {};
    expenses.forEach(t => byCat[t.category] = (byCat[t.category]||0) + t.amount);
    if (catChart) { catChart.destroy(); catChart = null; }
    if (!catEmpty) {
      catChart = new Chart($('catChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(byCat).map(catName), datasets: [{ data: Object.values(byCat), backgroundColor: ['#4f46e5','#ef4444','#10b981','#f59e0b','#06b6d4','#8b5cf6','#ec4899','#84cc16'] }] },
        options: { plugins: { legend: { position: 'bottom' } } }
      });
    }

    // last 6 months with Arabic labels
    const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }
    const sum = (m, type) => state.txs.filter(t => REAL(t) && (t.date||'').slice(0,7)===m && t.type===type).reduce((s,t)=>s+t.amount,0);
    if (monthChart) { monthChart.destroy(); monthChart = null; }
    if (!monthEmpty) {
      monthChart = new Chart($('monthChart'), {
        type: 'bar',
        data: { labels: months.map(monthLabel), datasets: [
          { label: 'دخل', data: months.map(m=>sum(m,'income')), backgroundColor: '#10b981' },
          { label: 'مصروف', data: months.map(m=>sum(m,'expense')), backgroundColor: '#ef4444' },
        ]},
        options: { scales: { x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } } }, plugins: { legend: { position: 'bottom' } } }
      });
    }

    // balance line: last 30 days cumulative
    const days30 = [];
    for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days30.push(localDate(d)); }
    const nets = days30.map(ds => state.txs.filter(t => REAL(t) && t.date === ds).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0));
    const opening = state.txs.filter(t => REAL(t) && t.date < days30[0]).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const balEmpty = opening === 0 && nets.every(v => v === 0);
    $('balEmpty').classList.toggle('hidden', !balEmpty);
    $('balChart').style.display = balEmpty ? 'none' : '';
    if (balChart) { balChart.destroy(); balChart = null; }
    if (!balEmpty) {
      const AC = accColor();
      let run = opening;
      const cum = nets.map(v => (run += v));
      balChart = new Chart($('balChart'), {
        type: 'line',
        data: { labels: days30.map(ds => ds.slice(8) + '/' + ds.slice(5, 7)), datasets: [{ label: 'الرصيد', data: cum, borderColor: AC, backgroundColor: AC + '2E', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }] },
        options: { scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } } }, plugins: { legend: { display: false } } }
      });
    }

    // weekly expenses: last 6 rolling weeks
    const weeks = [];
    for (let w = 5; w >= 0; w--) {
      const end = new Date(); end.setDate(end.getDate() - w * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      weeks.push([localDate(start), localDate(end), `${end.getDate()}/${end.getMonth() + 1}`]);
    }
    const wsum = weeks.map(([a, b]) => state.txs.filter(t => REAL(t) && t.type === 'expense' && t.date >= a && t.date <= b).reduce((s, t) => s + t.amount, 0));
    const weekEmpty = wsum.every(v => v === 0);
    $('weekEmpty').classList.toggle('hidden', !weekEmpty);
    $('weekChart').style.display = weekEmpty ? 'none' : '';
    if (weekChart) { weekChart.destroy(); weekChart = null; }
    if (!weekEmpty) {
      weekChart = new Chart($('weekChart'), {
        type: 'bar',
        data: { labels: weeks.map(([, , l]) => l), datasets: [{ label: 'مصروف الأسبوع', data: wsum, backgroundColor: accColor(), borderRadius: 6 }] },
        options: { scales: { x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
      });
    }
  } catch (err) {
    $('catEmpty').classList.remove('hidden');
    $('monthEmpty').classList.remove('hidden');
    $('balEmpty').classList.remove('hidden');
    $('weekEmpty').classList.remove('hidden');
  }
}

// ---------- smart insights (rule-based AI) ----------
function renderInsights() {
  const box = $('insights');
  const tips = [];
  const ym = selectedReportMonth();
  const periodTxs = state.txs.filter(t => REAL(t) && (t.date || '').slice(0, 7) === ym);
  const income = periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  if (!periodTxs.length) {
    box.innerHTML = '<div class="insight">👋 لا توجد عمليات في هذا الشهر حتى الآن.</div>';
    return;
  }
  const byCat = {};
  periodTxs.filter(t => t.type === 'expense').forEach(t => byCat[t.category] = (byCat[t.category] || 0) + t.amount);
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const pct = expense ? Math.round(top[1] / expense * 100) : 0;
    tips.push(`🏆 أعلى فئة صرف: <b>${catName(top[0])}</b> — ${fmt(top[1])} (${pct}% من المصاريف)`);
  }
  const [yy, mm] = ym.split('-').map(Number);
  const days = ym === curMonth() ? Math.max(1, new Date().getDate()) : new Date(yy, mm, 0).getDate();
  tips.push(`📊 متوسط الصرف: <b>${fmt(expense / days)}</b> يومياً • <b>${fmt(expense / Math.max(1, days / 7))}</b> أسبوعياً`);

  const templates = state.txs.filter(t => t.recur && t.recur !== 'none');
  if (templates.length) {
    const mEq = templates.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount * (t.recur === 'daily' ? 30 : t.recur === 'weekly' ? 4.33 : 1), 0);
    if (mEq > 0) tips.push(`🔁 التزاماتك المتكررة ≈ <b>${fmt(mEq)}</b> شهرياً من ${templates.length} عملية مجدولة.`);
  }

  const prevDate = new Date(yy, mm - 2, 1);
  const pm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const cutoff = ym === curMonth() ? new Date().getDate() : new Date(yy, mm, 0).getDate();
  const prvExp = state.txs.filter(t => REAL(t) && t.type === 'expense' && (t.date || '').slice(0, 7) === pm && Number((t.date || '').slice(8, 10)) <= cutoff).reduce((s, t) => s + t.amount, 0);
  if (prvExp > 0 && expense > 0) {
    const diff = Math.round((expense - prvExp) / prvExp * 100);
    if (diff > 5) tips.push(`📈 الصرف أعلى من الفترة المماثلة في ${monthLabel(pm)} بـ <b>${diff}%</b>.`);
    else if (diff < -5) tips.push(`📉 الصرف انخفض <b>${-diff}%</b> عن الفترة المماثلة في ${monthLabel(pm)}.`);
    else tips.push(`➖ الصرف قريب من الفترة المماثلة في ${monthLabel(pm)}.`);
  } else if (prvExp === 0 && expense > 0) {
    tips.push('🆕 لا توجد بيانات كافية في الشهر السابق للمقارنة.');
  }

  if (income > 0) {
    const rate = Math.round(balance / income * 100);
    tips.push(rate >= 20 ? `💪 معدل الادخار <b>${rate}%</b> — ممتاز.` : rate >= 0 ? `⚠️ معدل الادخار <b>${rate}%</b> — راقب ${top ? catName(top[0]) : 'المصاريف'}.` : `🚨 عجز الشهر <b>${fmt(-balance)}</b> — مصروفك أعلى من دخلك.`);
  }
  if (top && top[0] === 'food') tips.push('🍔 مصاريف الطعام هي الأعلى — جرّب تحديد عدد الوجبات الخارجية أسبوعياً ومتابعة الفرق.');
  if (top && top[0] === 'entertainment') tips.push('🎮 مصاريف الترفيه مرتفعة — حدد لها سقفاً أسبوعياً.');
  if (top && top[0] === 'shopping') tips.push('🛍️ التسوق أعلى فئاتك — جرّب قاعدة 48 ساعة قبل الشراء.');
  if (top && top[0] === 'transport') tips.push('🚗 المواصلات تستهلك كثيراً — قارن خيارات التنقل شهرياً.');

  if (ym === curMonth() && state.plan && state.plan.alloc) {
    const over = Object.keys(state.plan.alloc).filter(c => (state.plan.alloc[c] || 0) > 0 &&
      periodTxs.filter(t => t.type === 'expense' && t.category === c).reduce((s, t) => s + t.amount, 0) > state.plan.alloc[c]);
    if (over.length) tips.push(`🔔 تجاوزت حد: <b>${over.map(catName).join('، ')}</b> — راجع خطتك الشهرية.`);
  }
  if (ym === curMonth() && state.budget > 0) {
    const remain = state.budget - expense;
    if (remain > 0) {
      const now = new Date();
      const daysLeft = Math.max(1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1);
      tips.push(`🎯 باقي <b>${fmt(remain)}</b> لنهاية الشهر — المتاح يومياً <b>${fmt(remain / daysLeft)}</b>.`);
    }
  } else if (ym === curMonth()) {
    tips.push('🎯 حدد ميزانيتك الشهرية لتفعيل التنبيهات وحد الصرف اليومي.');
  }
  box.innerHTML = tips.map(t => `<div class="insight">${t}</div>`).join('');
}

// ---------- onboarding tour ----------
const OB_SLIDES = [
  { e: '💰', t: 'أهلاً بك في مَصرفي', d: 'رفيقك الذكي لإدارة فلوسك بالعربية: سجّل معاملاتك، خطط ميزانيتك، وادّخر — وكله يشتغل بدون نت.' },
  { e: '🧾', t: 'تسجيل المعاملات', d: 'سجّل دخلك ومصاريفك في ثوانٍ مع فئات جاهزة، وابحث وفلتر سجلك بالشهر أو الفئة أو المبلغ.' },
  { e: '🔁', t: 'تكرار العمليات', d: 'الراتب والإيجار والاشتراكات؟ حدد التكرار (يومي / أسبوعي / شهري) مرة واحدة والتطبيق يضيفها لك تلقائياً.' },
  { e: '🎯', t: 'الميزانية الشهرية', d: 'اختر أسلوبك: محكمة 🛡️ أو متوازنة ⚖️ أو مريحة 🎉 — ووزّع راتبك على أولوياتك: الأساسيات أولاً والوناسة بحساب.' },
];
let obIndex = 0;
function showOnboarding() { obIndex = 0; renderOb(); $('onboarding').classList.remove('hidden'); }
function renderOb() {
  const s = OB_SLIDES[obIndex];
  $('obSlides').innerHTML = `<div class="slide-emoji">${s.e}</div><h2 class="center" style="margin:10px 0 6px">${s.t}</h2><p class="muted center line">${s.d}</p>`;
  $('obDots').textContent = `${obIndex + 1} / ${OB_SLIDES.length}`;
  $('obNext').textContent = obIndex === OB_SLIDES.length - 1 ? 'ابدأ الإعداد ⚙️' : 'التالي';
  $('obSkip').style.visibility = obIndex === OB_SLIDES.length - 1 ? 'hidden' : '';
}
$('obNext').onclick = () => {
  if (navigator.vibrate) navigator.vibrate(10);
  if (obIndex < OB_SLIDES.length - 1) { obIndex++; renderOb(); }
  else { $('onboarding').classList.add('hidden'); finishOnboarding(); openWizard(); }
};
$('obSkip').onclick = () => { $('onboarding').classList.add('hidden'); finishOnboarding(); };
function finishOnboarding() { try { localStorage.setItem('masrofy-onboarded', '1'); } catch {} }
$('replayBtn').onclick = () => showOnboarding();

// ---------- setup wizard ----------
const MODES = {
  strict: { name: 'محكمة 🛡️', desc: 'ادخار عالٍ والتزام صارم — لأهدافك الكبيرة والطوارئ', rate: 0.30, w: { food: 35, transport: 20, health: 10, education: 8, shopping: 12, entertainment: 8, 'other-exp': 7 } },
  balanced: { name: 'متوازنة ⚖️', desc: 'توازن ذكي بين الادخار والاستمتاع بالحياة', rate: 0.20, w: { food: 30, transport: 18, health: 8, education: 6, shopping: 15, entertainment: 15, 'other-exp': 8 } },
  flexible: { name: 'مريحة 🎉', desc: 'مساحة أكبر للتمشيات والوناسة مع ادخار بسيط', rate: 0.10, w: { food: 27, transport: 15, health: 7, education: 5, shopping: 18, entertainment: 20, 'other-exp': 8 } },
  custom: { name: 'مخصص ✏️', desc: 'حدد بنفسك مبلغ كل فئة والادخار', rate: null, custom: true },
};
const PLAN_CATS = ['food', 'transport', 'health', 'education', 'shopping', 'entertainment', 'other-exp'];
let wz = { step: 1, salary: '', fixed: '', mode: 'balanced', custom: { savings: '', alloc: {} }, customInit: false };
const WZ_TITLES = { 1: '💼 راتبك الشهري التقريبي؟', 2: '🏠 التزاماتك الثابتة؟', 3: '🎯 اختر أسلوب ميزانيتك', 4: '✨ خطتك جاهزة', 5: '✏️ وزّع ميزانيتك بنفسك' };
function openWizard() { wz = { step: 1, salary: '', fixed: '', mode: 'balanced', custom: { savings: '', alloc: {} }, customInit: false }; renderWz(); $('wizard').classList.remove('hidden'); }
function openWizardEdit() {
  const p = state.plan || {};
  wz = { step: 1, salary: p.salary ?? '', fixed: p.fixed ?? '', mode: p.mode || 'balanced', custom: { savings: '', alloc: {} }, customInit: false };
  if (p.mode === 'custom' && p.alloc) {
    const a = {};
    PLAN_CATS.forEach(c => a[c] = String(p.alloc[c] || ''));
    wz.custom = { savings: String(p.savings ?? ''), alloc: a };
    wz.customInit = true;
  }
  renderWz();
  $('wizard').classList.remove('hidden');
}
function wzCollect() {
  if (wz.step === 1 && $('wzSalary')) wz.salary = $('wzSalary').value;
  if (wz.step === 2 && $('wzFixed')) wz.fixed = $('wzFixed').value;
  if (wz.step === 5) {
    if ($('wzSavings')) wz.custom.savings = $('wzSavings').value;
    document.querySelectorAll('.wzAlloc').forEach(i => { wz.custom.alloc[i.dataset.cat] = i.value; });
  }
}
function ensureCustomDefaults() {
  if (wz.customInit) return;
  const salary = parseFloat(wz.salary) || 0, fixed = parseFloat(wz.fixed) || 0;
  const avail = Math.max(0, salary - fixed);
  const b = MODES.balanced;
  const savings = Math.round(avail * b.rate);
  const spending = avail - savings;
  const alloc = {};
  Object.entries(b.w).forEach(([c, pct]) => alloc[c] = String(Math.round(spending * pct / 100)));
  wz.custom = { savings: String(savings), alloc };
  wz.customInit = true;
}
function computePlan() {
  const salary = parseFloat(wz.salary) || 0, fixed = parseFloat(wz.fixed) || 0;
  const avail = Math.max(0, salary - fixed);
  if (wz.mode === 'custom') {
    const c = wz.custom || { savings: '', alloc: {} };
    const savings = Math.max(0, Math.round(parseFloat(c.savings) || 0));
    const alloc = {};
    PLAN_CATS.forEach(k => alloc[k] = Math.max(0, Math.round(parseFloat((c.alloc || {})[k]) || 0)));
    const spending = Object.values(alloc).reduce((a, b) => a + b, 0);
    return { salary, fixed, mode: 'custom', modeName: MODES.custom.name, rate: avail > 0 ? savings / avail : 0, savings, spending, alloc };
  }
  const mode = MODES[wz.mode] || MODES.balanced;
  const savings = Math.round(avail * mode.rate);
  const spending = avail - savings;
  const alloc = {};
  Object.entries(mode.w).forEach(([c, pct]) => alloc[c] = Math.round(spending * pct / 100));
  return { salary, fixed, mode: wz.mode, modeName: mode.name, rate: mode.rate, savings, spending, alloc };
}
function renderWz() {
  $('wzTitle').textContent = WZ_TITLES[wz.step];
  const body = $('wzBody'), nav = $('wzNav');
  if (wz.step === 1) {
    body.innerHTML = `<p class="muted line">ادخل صافي راتبك أو دخلك الشهري التقريبي عشان نوزعه لك بذكاء.</p>
      <label>الراتب الشهري (${state.currency})<input id="wzSalary" type="number" min="1" step="any" inputmode="decimal" placeholder="مثال: 3000" value="${wz.salary}" /></label>`;
    nav.innerHTML = `<button class="btn btn-outline" onclick="wzSkip()">تخطي الإعداد</button><button class="btn btn-primary" style="flex:1" onclick="wzNext()">التالي</button>`;
    setTimeout(() => $('wzSalary') && $('wzSalary').focus(), 300);
  } else if (wz.step === 2) {
    body.innerHTML = `<p class="muted line">المصاريف الثابتة اللي تنخصم منك كل شهر (إيجار، أقساط، فواتير) — نستبعدها أولاً ثم نوزع الباقي.</p>
      <label>الالتزامات الثابتة (${state.currency})<input id="wzFixed" type="number" min="0" step="any" inputmode="decimal" placeholder="مثال: 1000 (اتركها 0 لو ما فيه)" value="${wz.fixed}" /></label>`;
    nav.innerHTML = `<button class="btn btn-outline" onclick="wzBack()">رجوع</button><button class="btn btn-primary" style="flex:1" onclick="wzNext()">التالي</button>`;
  } else if (wz.step === 3) {
    body.innerHTML = `<p class="muted line">كل أسلوب يحدد نسبة الادخار وتوزيع الباقي بين الأساسيات والوناسة:</p>` +
      Object.entries(MODES).map(([k, m]) => `<div class="mode-card${wz.mode === k ? ' selected' : ''}" onclick="wzMode('${k}')"><b>${m.name}</b><div class="mode-desc">${m.desc}${m.custom ? ' — توزيع حر بالكامل' : ` — ادخار ${Math.round(m.rate * 100)}%`}</div></div>`).join('');
    nav.innerHTML = `<button class="btn btn-outline" onclick="wzBack()">رجوع</button><button class="btn btn-primary" style="flex:1" onclick="wzNext()">${wz.mode === 'custom' ? 'توزيع المبالغ' : 'عرض خطتي'}</button>`;
  } else if (wz.step === 5) {
    ensureCustomDefaults();
    const salary = parseFloat(wz.salary) || 0, fixed = parseFloat(wz.fixed) || 0;
    const avail = Math.max(0, salary - fixed);
    body.innerHTML = `<p class="muted line">المتاح بعد الالتزامات: <b>${fmt(avail)}</b> — وزّعه على الادخار والفئات:</p>
      <div class="wz-total" id="wzTotal"></div>
      <label>💪 الادخار (${state.currency})<input id="wzSavings" type="number" min="0" step="any" inputmode="decimal" placeholder="مثال: 400" value="${wz.custom.savings}" oninput="wzCustomCalc()" /></label>
      ${PLAN_CATS.map(c => `<div class="budget-row custom-row"><span>${catName(c)}</span><input class="wzAlloc" data-cat="${c}" type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="${wz.custom.alloc[c] || ''}" oninput="wzCustomCalc()" /></div>`).join('')}`;
    nav.innerHTML = `<button class="btn btn-outline" onclick="wzBack()">رجوع</button><button class="btn btn-primary" style="flex:1" onclick="wzNext()">مراجعة الخطة</button>`;
    wzCustomCalc();
  } else {
    const p = computePlan();
    const order = ['food', 'transport', 'health', 'education', 'shopping', 'entertainment', 'other-exp'];
    body.innerHTML = `
      <div class="plan-summary">
        <div class="plan-row"><span>💰 الراتب</span><b>${fmt(p.salary)}</b></div>
        <div class="plan-row"><span>🏠 التزامات ثابتة</span><b>${fmt(p.fixed)}</b></div>
        <div class="plan-row"><span>💪 ادخار (${Math.round(p.rate * 100)}%)</span><b>${fmt(p.savings)}</b></div>
        <div class="plan-row total"><span>🎯 ميزانية الصرف</span><b>${fmt(p.spending)}</b></div>
      </div>
      ${order.map(c => `<div class="plan-row"><span>${catName(c)}</span><b>${fmt(p.alloc[c] || 0)}</b></div>`).join('')}
      <label class="check-row"><input id="addSalaryTx" type="checkbox" checked /><span>➕ إضافة راتبي كدخل <b>شهري متكرر</b> تلقائياً (يوم 1 من كل شهر)</span></label>`;
    nav.innerHTML = `<button class="btn btn-outline" onclick="wzBack()">رجوع</button><button class="btn btn-primary" style="flex:1" onclick="wzSave()">💾 حفظ وابدأ 🎉</button>`;
  }
}
window.wzCustomCalc = () => {
  const salary = parseFloat(wz.salary) || 0, fixed = parseFloat(wz.fixed) || 0;
  const avail = Math.max(0, salary - fixed);
  const sav = Math.max(0, parseFloat($('wzSavings') && $('wzSavings').value) || 0);
  let sum = sav;
  document.querySelectorAll('.wzAlloc').forEach(i => { sum += Math.max(0, parseFloat(i.value) || 0); });
  const rem = avail - sum;
  const box = $('wzTotal');
  if (box) box.innerHTML = `<div class="plan-row"><span>تم توزيع</span><b>${fmt(sum)}</b></div><div class="plan-row"><span>المتبقي</span><b style="color:${rem < 0 ? '#ef4444' : '#10b981'}">${fmt(rem)}</b></div>`;
  return { avail, sum, rem };
};
window.wzNext = () => {
  wzCollect();
  if (wz.step === 1) {
    if (!(parseFloat(wz.salary) > 0)) return alert('ادخل راتبك الشهري التقريبي (رقم أكبر من صفر)');
  }
  if (wz.step === 2) {
    const s = parseFloat(wz.salary) || 0, f = parseFloat(wz.fixed) || 0;
    if (f < 0) return alert('الالتزامات لا تكون بالسالب');
    if (f >= s) return alert('التزاماتك أكبر من راتبك! راجع الأرقام 👀');
  }
  if (wz.step === 3) wz.step = (wz.mode === 'custom') ? 5 : 4;
  else if (wz.step === 5) {
    const t = wzCustomCalc();
    if (t.rem < 0) return alert(`تجاوزت المتاح بـ ${fmt(-t.rem)}! خفّض المبالغ 👀`);
    wz.step = 4;
  }
  else if (wz.step < 4) wz.step++;
  renderWz();
  if (navigator.vibrate) navigator.vibrate(10);
};
window.wzBack = () => {
  wzCollect();
  if (wz.step === 4) wz.step = (wz.mode === 'custom') ? 5 : 3;
  else if (wz.step === 5) wz.step = 3;
  else if (wz.step > 1) wz.step--;
  renderWz();
};
window.wzSkip = () => { $('wizard').classList.add('hidden'); finishOnboarding(); };
window.wzMode = (m) => { wz.mode = m; renderWz(); if (navigator.vibrate) navigator.vibrate(10); };
window.wzSave = () => {
  const p = computePlan();
  state.plan = p;
  // الميزانية الشهرية تشمل الالتزامات الثابتة ومصاريف الفئات، وتستبعد الادخار.
  state.budget = p.fixed + p.spending;
  if ($('addSalaryTx') && $('addSalaryTx').checked && p.salary > 0) {
    const dup = state.txs.some(t => t.type === 'income' && t.category === 'salary' && t.recur && t.recur !== 'none');
    if (!dup) {
      const n = new Date();
      const first = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
      state.txs.unshift({ id: newId(), type: 'income', amount: p.salary, category: 'salary', date: first, note: 'راتب شهري', recur: 'monthly', anchorDay: 1, nextDate: addInterval(first, 'monthly', 1), accountId: (state.accounts[0] && state.accounts[0].id) || 'cash' });
    }
  }
  $('wizard').classList.add('hidden');
  finishOnboarding();
  save(); render();
  toast('تم حفظ خطتك بنجاح 🎉 ابدأ التسجيل!');
};

// ---------- category limit alert on add ----------
function catAlert(tx) {
  if (!tx || tx.type !== 'expense' || tx.transfer) return false;
  const p = state.plan;
  if (!p || !p.alloc || !(p.alloc[tx.category] > 0)) return false;
  const lim = p.alloc[tx.category];
  const spent = state.txs.filter(t => REAL(t) && t.type === 'expense' && t.category === tx.category && (t.date || '').slice(0, 7) === curMonth()).reduce((s, t) => s + t.amount, 0);
  if (spent > lim) { toast(`🚨 تجاوزت حد ${catName(tx.category)}! (${fmt(spent)} من ${fmt(lim)})`); return true; }
  if (spent >= lim * 0.8) { toast(`⚠️ وصلت ${Math.round(spent / lim * 100)}% من حد ${catName(tx.category)}`); return true; }
  return false;
}

// ---------- recurring schedules ----------
function renderRecurring() {
  const box = $('recurringList');
  if (!box) return;
  const rows = state.txs.filter(t => !t.transfer && t.recur && t.recur !== 'none')
    .sort((a, b) => String(a.nextDate || a.date).localeCompare(String(b.nextDate || b.date)));
  $('recurringCount').textContent = String(rows.length);
  if (!rows.length) {
    box.innerHTML = '<div class="empty compact">لا توجد عمليات مجدولة حالياً.</div>';
    return;
  }
  box.innerHTML = rows.map(t => `<div class="manage-item">
    <div class="manage-icon" style="background:${catGradient(t.category)}">${escapeHtml(catEmoji(t.category))}</div>
    <div class="manage-copy">
      <b>${escapeHtml(catName(t.category))} · ${fmt(t.amount)}</b>
      <small>${escapeHtml(RECUR_NAMES[t.recur] || '')} · الموعد القادم ${escapeHtml(t.nextDate || addInterval(t.date, t.recur, t.anchorDay))} · ${escapeHtml(accName(t.accountId))}</small>
    </div>
    <div class="manage-actions">
      <button class="btn btn-outline btn-sm rec-edit" data-id="${escapeHtml(t.id)}">تعديل</button>
      <button class="btn btn-danger btn-sm rec-stop" data-id="${escapeHtml(t.id)}">إيقاف</button>
    </div>
  </div>`).join('');
  box.querySelectorAll('.rec-edit').forEach(btn => btn.onclick = () => editTx(Number(btn.dataset.id)));
  box.querySelectorAll('.rec-stop').forEach(btn => btn.onclick = () => stopRecurring(Number(btn.dataset.id)));
}
function stopRecurring(id) {
  const tx = state.txs.find(t => t.id === id);
  if (!tx || tx.recur === 'none') return;
  tx.recur = 'none';
  delete tx.nextDate;
  delete tx.anchorDay;
  save();
  render();
  toast('تم إيقاف التكرار مع الاحتفاظ بالسجل ✅');
}

// ---------- custom categories ----------
function renderCustomCategories() {
  const box = $('customCatList');
  if (!box) return;
  const rows = ['expense', 'income'].flatMap(type => (state.customCategories[type] || []).map(c => ({ ...c, type })));
  if (!rows.length) {
    box.innerHTML = '<div class="empty compact">لم تضف فئات مخصصة بعد.</div>';
    return;
  }
  box.innerHTML = rows.map(c => {
    const used = state.txs.filter(t => t.category === c.id).length;
    return `<div class="manage-item">
      <div class="manage-icon" style="background:${c.color}">${escapeHtml(c.emoji)}</div>
      <div class="manage-copy"><b>${escapeHtml(c.name)}</b><small>${c.type === 'expense' ? 'مصروف' : 'دخل'} · ${used} عملية</small></div>
      <div class="manage-actions"><button class="btn btn-danger btn-sm custom-cat-del" data-id="${escapeHtml(c.id)}" data-type="${c.type}">حذف</button></div>
    </div>`;
  }).join('');
  box.querySelectorAll('.custom-cat-del').forEach(btn => btn.onclick = () => deleteCustomCategory(btn.dataset.type, btn.dataset.id));
}
$('addCustomCatBtn').onclick = () => {
  const type = $('customCatType').value === 'income' ? 'income' : 'expense';
  const name = safeText($('customCatName').value, 24);
  if (!name) return alert('ادخل اسم الفئة');
  if (categoriesFor(type).some(c => String(c.name).replace(/^\S+\s+/, '').trim().toLocaleLowerCase('ar') === name.toLocaleLowerCase('ar'))) {
    return alert('هذه الفئة موجودة بالفعل');
  }
  const rows = state.customCategories[type];
  rows.push({
    id: `custom-${newId()}`,
    name,
    emoji: CUSTOM_EMOJIS.includes($('customCatEmoji').value) ? $('customCatEmoji').value : '📌',
    color: CUSTOM_GRADS[rows.length % CUSTOM_GRADS.length],
  });
  $('customCatName').value = '';
  save();
  fillCategories();
  render();
  toast('تمت إضافة الفئة ✅');
};
function deleteCustomCategory(type, id) {
  const used = state.txs.some(t => t.category === id);
  if (used) return alert('لا يمكن حذف فئة مستخدمة. غيّر فئة العمليات التابعة لها أولاً.');
  state.customCategories[type] = (state.customCategories[type] || []).filter(c => c.id !== id);
  save();
  fillCategories();
  render();
  toast('تم حذف الفئة');
}

// ---------- accounts ----------
function fillAccounts() {
  const txSel = $('txAccount'), fSel = $('filterAcc'), from = $('trFrom'), to = $('trTo');
  if (!txSel || !fSel || !from || !to) return;
  const keep = [txSel.value, fSel.value, from.value, to.value];
  const active = activeAccounts();
  const activeOpts = active.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.icon)} ${escapeHtml(a.name)}</option>`).join('');
  const allOpts = state.accounts.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.icon)} ${escapeHtml(a.name)}${a.archived ? ' (مؤرشف)' : ''}</option>`).join('');
  txSel.innerHTML = activeOpts;
  fSel.innerHTML = '<option value="">كل الحسابات</option>' + allOpts;
  from.innerHTML = activeOpts;
  to.innerHTML = activeOpts;
  const has = (sel, v) => v && [...sel.options].some(o => o.value === String(v));
  let lastAccount = '';
  try { lastAccount = localStorage.getItem('masrofy-last-account') || ''; } catch {}
  if (has(txSel, keep[0])) txSel.value = keep[0];
  else if (has(txSel, lastAccount)) txSel.value = lastAccount;
  if (state.editingId) {
    const tx = state.txs.find(t => t.id === state.editingId);
    if (tx && !has(txSel, tx.accountId)) {
      const a = accOf(tx.accountId);
      txSel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(a.id)}">${escapeHtml(a.icon)} ${escapeHtml(a.name)} (مؤرشف)</option>`);
    }
    if (tx) txSel.value = tx.accountId;
  }
  if (has(fSel, keep[1])) fSel.value = keep[1];
  if (has(from, keep[2])) from.value = keep[2];
  if (has(to, keep[3])) to.value = keep[3];
  renderAccList();
}
const ACC_GRAD = [
  'linear-gradient(135deg,#4f46e5,#8b5cf6)',
  'linear-gradient(135deg,#059669,#34d399)',
  'linear-gradient(135deg,#d97706,#f59e0b)',
  'linear-gradient(135deg,#db2777,#f472b6)',
  'linear-gradient(135deg,#0891b2,#22d3ee)',
];
function renderAccList() {
  const sel = $('filterAcc') ? $('filterAcc').value : '';
  const total = state.accounts.reduce((s, a) => s + accBalance(a.id), 0);
  const tEl = $('accTotal');
  if (tEl) tEl.textContent = 'الإجمالي: ' + fmt(total);
  $('accList').innerHTML = state.accounts.map((a, i) => {
    const bal = accBalance(a.id);
    const n = state.txs.filter(t => String(t.accountId) === String(a.id)).length;
    const isSel = sel === String(a.id);
    return `<div class="acc-chip${isSel ? ' sel' : ''}${a.archived ? ' archived' : ''}" data-account-id="${escapeHtml(a.id)}" style="background:${ACC_GRAD[i % ACC_GRAD.length]}">
      <div class="acc-top"><span class="acc-ic">${escapeHtml(a.icon)}</span>${a.archived ? '<span class="acc-check">مؤرشف</span>' : (isSel ? '<span class="acc-check">✓ محدد</span>' : '')}</div>
      <div class="acc-bal">${fmt(bal)}</div>
      <div class="acc-meta"><b>${escapeHtml(a.name)}</b><small>${n} عملية · افتتاحي ${fmt(a.openingBalance)}</small></div>
      <div class="acc-card-actions">
        <button class="acc-action acc-archive" title="${a.archived ? 'استعادة الحساب' : 'أرشفة الحساب'}">${a.archived ? '↩️ استعادة' : '📦 أرشفة'}</button>
        ${!a.archived && n === 0 && Number(a.openingBalance) === 0 ? '<button class="acc-action acc-del" title="حذف الحساب">🗑️ حذف</button>' : ''}
      </div>
    </div>`;
  }).join('');
  $('accList').querySelectorAll('.acc-chip').forEach(card => {
    const id = card.dataset.accountId;
    card.addEventListener('click', () => accFilter(id));
    const archive = card.querySelector('.acc-archive');
    if (archive) archive.addEventListener('click', e => { e.stopPropagation(); toggleAccountArchive(id); });
    const del = card.querySelector('.acc-del');
    if (del) del.addEventListener('click', e => { e.stopPropagation(); accDel(id); });
  });
}
window.accFilter = (id) => {
  const f = $('filterAcc');
  f.value = (f.value === String(id)) ? '' : String(id);
  renderList(); renderAccList();
};
$('addAccBtn').onclick = () => {
  const name = $('accName').value.trim().slice(0, 20);
  const openingBalance = Number($('accOpening').value || 0);
  if (!name) return alert('ادخل اسم الحساب');
  if (!Number.isFinite(openingBalance)) return alert('ادخل رصيداً افتتاحياً صحيحاً');
  state.accounts.push({ id: String(newId()), name, icon: $('accIcon').value || '💵', openingBalance, archived: false });
  $('accName').value = '';
  $('accOpening').value = '';
  save(); render();
  toast('تمت إضافة الحساب ✅');
};
window.accDel = (id) => {
  const acc = accOf(id);
  const used = state.txs.filter(t => String(t.accountId) === String(id)).length;
  if (used || Number(acc.openingBalance) !== 0) return alert('هذا الحساب يحتوي رصيداً أو عمليات. أرشفه للحفاظ على السجل.');
  if (state.accounts.length <= 1) return alert('لا يمكن حذف الحساب الوحيد');
  if (!confirm(`حذف حساب "${acc.name}"؟`)) return;
  state.accounts = state.accounts.filter(a => String(a.id) !== String(id));
  save(); render();
  toast('تم حذف الحساب');
};
window.toggleAccountArchive = (id) => {
  const acc = accOf(id);
  if (!acc || !state.accounts.some(a => String(a.id) === String(id))) return;
  if (acc.archived) {
    acc.archived = false;
    save(); render(); toast('تمت استعادة الحساب ✅');
    return;
  }
  if (activeAccounts().length <= 1) return alert('لا يمكن أرشفة الحساب النشط الوحيد');
  const schedules = state.txs.filter(t => String(t.accountId) === String(id) && t.recur && t.recur !== 'none');
  schedules.forEach(t => { t.recur = 'none'; delete t.nextDate; delete t.anchorDay; });
  acc.archived = true;
  if ($('filterAcc').value === String(id)) $('filterAcc').value = '';
  save(); render();
  toast(schedules.length ? `تمت الأرشفة وإيقاف ${schedules.length} عملية مجدولة` : 'تمت أرشفة الحساب 📦');
};
$('trSwap').onclick = () => {
  const f = $('trFrom'), t = $('trTo');
  if (!f || !t) return;
  const v = f.value;
  f.value = t.value;
  t.value = v;
  if (navigator.vibrate) navigator.vibrate(8);
};
$('trBtn').onclick = () => {
  const from = $('trFrom').value, to = $('trTo').value;
  const amount = parseFloat($('trAmount').value);
  if (!from || !to) return;
  if (String(from) === String(to)) return alert('اختر حسابين مختلفين');
  if (!amount || amount <= 0) return alert('ادخل مبلغ صحيح');
  if (accBalance(from) < amount) return alert(`رصيد ${accName(from)} لا يكفي (${fmt(accBalance(from))})`);
  const date = localDate();
  const base = newId();
  const transferId = `tr-${base}`;
  state.txs.unshift({ id: base, type: 'expense', amount, category: 'other-exp', date, note: `تحويل إلى ${accName(to)} 🔄`, accountId: from, recur: 'none', transfer: true, transferId });
  state.txs.unshift({ id: base + 1, type: 'income', amount, category: 'other-inc', date, note: `تحويل من ${accName(from)} 🔄`, accountId: to, recur: 'none', transfer: true, transferId });
  $('trAmount').value = '';
  if (navigator.vibrate) navigator.vibrate(20);
  save(); render();
  toast('تم التحويل 🔄');
};

// ---------- calendar ----------
function renderCalendar() {
  if (!calCursor) calCursor = curMonth();
  const [Y, M] = calCursor.split('-').map(Number);
  $('calLabel').textContent = monthLabel(calCursor);
  const first = new Date(Y, M - 1, 1).getDay();
  const dim = new Date(Y, M, 0).getDate();
  const today = localDate();
  const byDay = {};
  state.txs.forEach(t => {
    if (!t.date || (t.date || '').slice(0, 7) !== calCursor || t.transfer) return;
    const d = byDay[t.date] || (byDay[t.date] = { exp: 0, inc: 0 });
    if (t.type === 'expense') d.exp += t.amount; else d.inc += t.amount;
  });
  const max = Math.max(1, ...Object.values(byDay).map(d => d.exp));
  let html = '';
  for (let i = 0; i < first; i++) html += '<div class="cal-day blank"></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = `${Y}-${String(M).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const info = byDay[ds];
    const lv = !info || !info.exp ? '' : info.exp >= max ? 'l4' : info.exp >= max * 0.66 ? 'l3' : info.exp >= max * 0.33 ? 'l2' : 'l1';
    html += `<button class="cal-day ${lv}${info && info.inc ? ' has-inc' : ''}${ds === today ? ' is-today' : ''}${ds > today ? ' future' : ''}" onclick="calDay('${ds}')"${!info ? ' disabled' : ''}>${d}${info && info.exp ? `<small>${Number(info.exp).toLocaleString('ar-SA')}</small>` : ''}</button>`;
  }
  $('calGrid').innerHTML = html;
}
function calMove(k) {
  const [Y, M] = calCursor.split('-').map(Number);
  const d = new Date(Y, M - 1 + k, 1);
  calCursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  $('calDetail').innerHTML = '';
  renderCalendar();
}
$('calPrev').onclick = () => calMove(-1);
$('calNext').onclick = () => calMove(1);
$('calToday').onclick = () => { calCursor = curMonth(); $('calDetail').innerHTML = ''; renderCalendar(); };
window.calDay = (ds) => {
  let exp = 0, inc = 0, n = 0;
  state.txs.forEach(t => { if (t.date === ds && REAL(t)) { n++; if (t.type === 'expense') exp += t.amount; else inc += t.amount; } });
  $('calDetail').innerHTML = `<div class="plan-row"><span>📅 ${ds}</span><b>${n} عملية</b></div>
    <div class="plan-row"><span>💸 مصروف</span><b>${fmt(exp)}</b></div>
    <div class="plan-row"><span>💰 دخل</span><b>${fmt(inc)}</b></div>
    <button class="btn btn-outline btn-sm cal-go" onclick="calGo('${ds}')">عرض في السجل 🔍</button>`;
};
window.calGo = (ds) => {
  $('filterMonth').value = '';
  $('filterCat').value = ''; $('filterType').value = '';
  if ($('filterAcc')) $('filterAcc').value = '';
  $('search').value = ds;
  renderList(); renderAccList();
  showPage('list');
};

// ---------- challenges ----------
function chalSaved(c) { return (c.log || []).reduce((s, e) => s + e.amount, 0); }
function chalWeeksLeft(c) {
  const start = new Date((c.start || localDate()) + 'T00:00:00').getTime();
  const el = Math.max(0, Math.floor((Date.now() - start) / 6048e5));
  return Math.max(1, (c.weeks || 8) - el);
}
function renderChallenges() {
  const box = $('chalList');
  if (!box) return;
  if (!state.challenges.length) { box.innerHTML = '<div class="empty">لا توجد تحديات — ابدأ أول تحدي وحقق هدفك 🏆</div>'; return; }
  box.innerHTML = state.challenges.map(c => {
    const saved = chalSaved(c), pct = c.target > 0 ? Math.min(100, Math.round(saved / c.target * 100)) : 0;
    const done = saved >= c.target;
    const weekly = done ? 0 : Math.ceil((c.target - saved) / chalWeeksLeft(c));
    return `<div class="chal${done ? ' done' : ''}" data-challenge-id="${escapeHtml(c.id)}">
      <div class="chal-top"><b>${done ? '🏆 ' : '🎯 '}${escapeHtml(c.name)}</b><button class="tx-del chal-delete" title="حذف التحدي">🗑️</button></div>
      <div class="chal-meta">الهدف: ${fmt(c.target)} • جمعت: ${fmt(saved)} (${pct}%)${done ? ' — مكتمل! 🎉' : ` • باقي ${fmt(c.target - saved)} • ~${fmt(weekly)} أسبوعياً`}</div>
      <div class="progress"><div style="width:${pct}%;background:${done ? '#10b981' : 'var(--grad1)'}"></div></div>
      ${done ? '' : `<div class="chal-add"><input class="chal-input" type="number" min="0.01" step="any" placeholder="مبلغ المساهمة" /><button class="btn btn-primary btn-sm chal-save">➕ حوّش</button></div>`}
    </div>`;
  }).join('');
  box.querySelectorAll('.chal').forEach(card => {
    const id = Number(card.dataset.challengeId);
    card.querySelector('.chal-delete')?.addEventListener('click', () => chalDel(id));
    card.querySelector('.chal-save')?.addEventListener('click', () => chalAdd(id, card.querySelector('.chal-input')));
  });
}
window.chalPreset = (name, target, weeks) => {
  $('chalName').value = name; $('chalTarget').value = target; $('chalWeeks').value = weeks;
  if (navigator.vibrate) navigator.vibrate(10);
};
$('addChalBtn').onclick = () => {
  const name = $('chalName').value.trim().slice(0, 30);
  const target = parseFloat($('chalTarget').value);
  const weeks = Math.max(1, Math.round(parseFloat($('chalWeeks').value) || 8));
  if (!name) return alert('ادخل اسم التحدي');
  if (!target || target <= 0) return alert('ادخل المبلغ المستهدف');
  state.challenges.unshift({ id: newId(), name, target, weeks, start: localDate(), log: [] });
  $('chalName').value = ''; $('chalTarget').value = ''; $('chalWeeks').value = '';
  save(); renderChallenges();
  toast('بدأ التحدي! بالتوفيق 🎯');
};
window.chalAdd = (id, inputEl) => {
  const c = state.challenges.find(x => x.id === id);
  if (!c) return;
  const inp = inputEl;
  const amount = parseFloat(inp && inp.value);
  if (!amount || amount <= 0) return alert('ادخل مبلغ صحيح');
  c.log.push({ date: localDate(), amount });
  save(); renderChallenges();
  if (chalSaved(c) >= c.target) { toast('🏆 مبروك! أكملت التحدي!'); confettiBurst(); }
  else toast('تمت الإضافة للتحدي ✅');
  if (navigator.vibrate) navigator.vibrate(20);
};
window.chalDel = (id) => {
  if (!confirm('حذف هذا التحدي؟')) return;
  state.challenges = state.challenges.filter(x => x.id !== id);
  save(); renderChallenges();
};

// ---------- monthly report ----------
function monthStats(ym) {
  const inM = (t) => REAL(t) && (t.date || '').slice(0, 7) === ym;
  const inc = state.txs.filter(t => inM(t) && t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = state.txs.filter(t => inM(t) && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const n = state.txs.filter(inM).length;
  const byCat = {};
  state.txs.filter(t => inM(t) && t.type === 'expense').forEach(t => byCat[t.category] = (byCat[t.category] || 0) + t.amount);
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { inc, exp, bal: inc - exp, n, top };
}
function buildReportText() {
  const ym = selectedReportMonth();
  const s = monthStats(ym);
  const rate = s.inc > 0 ? Math.round(s.bal / s.inc * 100) : 0;
  const L = [`📊 تقرير مَصرفي — ${monthLabel(ym)}`, `💰 الدخل: ${fmt(s.inc)}`, `💸 المصروف: ${fmt(s.exp)}`, `⚖️ الصافي: ${fmt(s.bal)} (ادخار ${rate}%)`];
  if (s.top.length) L.push('🏆 أعلى الفئات: ' + s.top.map(([c, v]) => `${catName(c)} ${fmt(v)}`).join(' • '));
  if (ym === curMonth() && state.budget > 0) L.push(`🎯 الميزانية: صرفت ${Math.round(s.exp / state.budget * 100)}% من ${fmt(state.budget)}`);
  L.push(`🧾 ${s.n} عملية`);
  return L.join('\n');
}
$('repBtn').onclick = () => {
  const ym = selectedReportMonth();
  $('repMonth').textContent = monthLabel(ym);
  const s = monthStats(ym);
  const rate = s.inc > 0 ? Math.round(s.bal / s.inc * 100) : 0;
  $('repBody').innerHTML = `
    <div class="rep-row"><span>💰 الدخل</span><b>${fmt(s.inc)}</b></div>
    <div class="rep-row"><span>💸 المصروف</span><b>${fmt(s.exp)}</b></div>
    <div class="rep-row"><span>⚖️ الصافي (ادخار ${rate}%)</span><b>${fmt(s.bal)}</b></div>
    ${s.top.map(([c, v]) => `<div class="rep-row"><span>${catName(c)}</span><b>${fmt(v)}</b></div>`).join('')}
    ${ym === curMonth() && state.budget > 0 ? `<div class="rep-row"><span>🎯 من الميزانية</span><b>${Math.round(s.exp / state.budget * 100)}%</b></div>` : ''}
    <div class="rep-row"><span>🧾 العمليات</span><b>${s.n}</b></div>`;
  $('reportModal').classList.remove('hidden');
};
$('repClose').onclick = () => $('reportModal').classList.add('hidden');
$('reportMonth').onchange = () => { renderCharts(); renderInsights(); };
$('reportModal').addEventListener('click', (e) => { if (e.target === $('reportModal')) $('reportModal').classList.add('hidden'); });
$('repCopy').onclick = async () => {
  const txt = buildReportText();
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(txt);
    else throw 0;
    toast('تم نسخ التقرير 📋');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('تم نسخ التقرير 📋'); }
    catch { toast('تعذر النسخ'); }
    ta.remove();
  }
};
$('repShare').onclick = async () => {
  const txt = buildReportText();
  if (navigator.share) {
    try { await navigator.share({ title: 'تقرير مَصرفي', text: txt }); } catch {}
  } else {
    $('repCopy').onclick();
  }
};

// ---------- app lock ----------
function buildPad(boxId, dotsId, onDone) {
  const box = $(boxId);
  if (!box) return;
  box.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'del'].map(k => `<button class="pin-key" data-k="${k}">${k === 'C' ? 'مسح' : k === 'del' ? '⌫' : k}</button>`).join('');
  let pin = '';
  const paint = () => {
    const dots = dotsId && $(dotsId);
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i < pin.length));
  };
  box.querySelectorAll('.pin-key').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k === 'C') pin = '';
    else if (k === 'del') pin = pin.slice(0, -1);
    else if (pin.length < 4 && /[0-9]/.test(k)) pin += k;
    paint();
    if (navigator.vibrate) navigator.vibrate(8);
    if (pin.length === 4) { const done = pin; setTimeout(() => { pin = ''; paint(); onDone(done); }, 150); }
  });
  paint();
}
function pinErr(dotsId) {
  const d = dotsId && $(dotsId);
  if (d) { d.classList.add('err'); setTimeout(() => d.classList.remove('err'), 600); }
  if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60]); } catch {} }
}
let lockFlow = null;
function lockMsg(t) { const m = $('lockMsg'); if (m) m.textContent = t || ''; }
function openLockSheet() {
  const dots = '<div class="pin-dots" id="setupDots"><span></span><span></span><span></span><span></span></div>';
  if (!state.lock.enabled) {
    lockFlow = { step: 'new1', first: '' };
    $('lockSetupBody').innerHTML = '<p class="muted line">اختر رقماً سرياً من 4 أرقام:</p><div class="pin-msg" id="lockMsg"></div>' + dots + '<div id="lockSetupPad" class="pin-pad"></div>';
    buildPad('lockSetupPad', 'setupDots', lockPinStep);
  } else {
    lockFlow = { step: 'verify', first: '', next: null };
    $('lockSetupBody').innerHTML = `<div class="preset-row">
      <button class="btn btn-outline btn-sm" onclick="lockChange()">🔄 تغيير الرقم</button>
      <button class="btn btn-danger btn-sm" onclick="lockDisable()">🔓 إيقاف القفل</button>
    </div><div class="pin-msg" id="lockMsg"></div>` + dots + '<div id="lockSetupPad" class="pin-pad"></div><p class="muted">اختر إجراءً ثم ادخل رقمك الحالي:</p>';
    buildPad('lockSetupPad', 'setupDots', lockPinStep);
  }
  $('lockSheet').classList.remove('hidden');
}
function lockPinStep(pin) {
  if (!lockFlow) return;
  if (lockFlow.step === 'new1') { lockFlow.first = pin; lockFlow.step = 'new2'; lockMsg('أكد الرقم مرة ثانية:'); }
  else if (lockFlow.step === 'new2') {
    if (pin === lockFlow.first) {
      state.lock = { enabled: true, pin };
      save(); updateLockBtn();
      $('lockSheet').classList.add('hidden');
      toast('تم تفعيل القفل 🔐');
      showLockScreen();
    } else { lockFlow.step = 'new1'; lockFlow.first = ''; lockMsg('غير متطابق! ابدأ من جديد:'); pinErr('setupDots'); }
  }
  else if (lockFlow.step === 'verify') {
    if (pin === state.lock.pin) {
      lockMsg('');
      if (lockFlow.next === 'disable') {
        state.lock = { enabled: false, pin: '' };
        save(); updateLockBtn();
        $('lockSheet').classList.add('hidden');
        toast('تم إيقاف القفل 🔓');
      } else if (lockFlow.next === 'change') { lockFlow.step = 'new1'; lockFlow.first = ''; lockMsg('ادخل الرقم الجديد:'); }
      else lockMsg('اختر إجراءً من الأعلى 👆');
    } else { lockMsg('رقم خاطئ! حاول مجدداً:'); pinErr('setupDots'); }
  }
}
window.lockChange = () => { if (!lockFlow) return; lockFlow.next = 'change'; lockMsg('ادخل رقمك الحالي:'); };
window.lockDisable = () => { if (!lockFlow) return; lockFlow.next = 'disable'; lockMsg('ادخل رقمك الحالي:'); };
window.closeLockSheet = () => $('lockSheet').classList.add('hidden');
function updateLockBtn() { const b = $('lockBtn'); if (b) b.textContent = state.lock.enabled ? '🔒' : '🔓'; }
$('lockBtn').onclick = () => openLockSheet();
function showLockScreen() {
  if (!state.lock.enabled) return;
  $('lockScreen').classList.remove('hidden');
  buildPad('lockPad', 'lockDots', (pin) => {
    if (pin === state.lock.pin) {
      $('lockScreen').classList.add('hidden');
      toast('أهلاً بعودتك 👋');
    } else {
      pinErr('lockDots');
    }
  });
}
let backgroundedAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) backgroundedAt = Date.now();
  else if (state.lock.enabled && backgroundedAt && Date.now() - backgroundedAt >= 30000) showLockScreen();
});
$('forgotPin').onclick = () => {
  if (!confirm('نسيت الرقم؟ سيتم مسح كل بيانات التطبيق نهائياً للدخول من جديد. متابعة؟')) return;
  if (!confirm('تأكيد أخير: مسح كل شيء؟')) return;
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('masrofy-'))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
  location.reload();
};

// ---------- init ----------
load();
processRecurring();
calCursor = curMonth();
initTheme();
fillCategories();
fillCurrency();
if (state.budget) $('budgetInput').value = state.budget;
try {
  const g = localStorage.getItem('masrofy-glass');
  applyGlass(g === null ? true : g === '1');
} catch { applyGlass(true); }
render();
updateLockBtn();
showLockScreen();
try {
  const t = localStorage.getItem('masrofy-tab');
  showPage(t || 'home');
} catch {}
// الجولة التعريفية للمستخدم الجديد فقط (أصحاب البيانات الحالية يتخطونها تلقائياً)
try {
  if (!localStorage.getItem('masrofy-onboarded')) {
    if (!state.txs.length && !state.plan) showOnboarding();
    else localStorage.setItem('masrofy-onboarded', '1');
  }
} catch {}

// ---------- splash ----------
(function () {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hide = () => { const s = $('splash'); if (s) s.classList.add('hide'); };
  setTimeout(hide, reduced ? 300 : 1600);
  document.addEventListener('click', (e) => {
    const s = $('splash');
    if (s && !s.classList.contains('hide') && s.contains(e.target)) hide();
  }, true);
})();

// ---------- tab pages ----------
function showPage(name) {
  if (!['home', 'reports', 'add', 'cal', 'list'].includes(name)) name = 'home';
  curTab = name;
  document.querySelectorAll('main [data-page]').forEach(s => s.classList.toggle('page-hidden', s.dataset.page !== name));
  document.querySelectorAll('.bnav').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  if (name === 'home') renderPlan();
  try { localStorage.setItem('masrofy-tab', name); } catch {}
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'reports') renderCharts();
  if (navigator.vibrate) navigator.vibrate(8);
}
window.showPage = showPage;

// ---------- Mobile: PWA install + bottom nav + FAB ----------
// 1) Service Worker (offline for mobile)
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; location.reload(); }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      const offerUpdate = () => {
        if (!reg.waiting || !navigator.serviceWorker.controller) return;
        $('updateBanner').classList.remove('hidden');
        $('reloadUpdateBtn').onclick = () => reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      };
      offerUpdate();
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (worker) worker.addEventListener('statechange', () => { if (worker.state === 'installed') offerUpdate(); });
      });
    }).catch(() => {});
  });
}

// 2) Install prompt (Android/Chrome)
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $('installBtn');
  if (btn) btn.classList.remove('hidden');
});
if ($('installBtn')) $('installBtn').onclick = async () => {
  if (!deferredPrompt) { alert('للتثبيت على الآيفون: مشاركة ← إضافة إلى الشاشة الرئيسية 📲'); return; }
  deferredPrompt.prompt();
  deferredPrompt = null;
  $('installBtn').classList.add('hidden');
};
window.addEventListener('appinstalled', () => {
  if ($('installBtn')) $('installBtn').classList.add('hidden');
});

// 3) Bottom nav tabs
document.querySelectorAll('.bnav').forEach((b) => b.onclick = () => showPage(b.dataset.page));

// 4) FAB -> add tab + focus amount
if ($('fab')) $('fab').onclick = () => {
  showPage('add');
  setTimeout(() => { const a = $('amount'); if (a) a.focus({ preventScroll: true }); }, 350);
};
