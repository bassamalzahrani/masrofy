// Masrofy - Smart Expense Tracker (100% client-side, localStorage)
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

let state = { type: 'expense', txs: [], budget: 0 };
let catChart = null, monthChart = null;

// ---------- storage ----------
function load() {
  try {
    const raw = localStorage.getItem('masrofy-v1');
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch {}
}
function save() {
  localStorage.setItem('masrofy-v1', JSON.stringify({ txs: state.txs, budget: state.budget }));
}

// ---------- theme ----------
function initTheme() {
  const t = localStorage.getItem('masrofy-theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
  $('themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
}
$('themeBtn').onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', cur);
  localStorage.setItem('masrofy-theme', cur);
  $('themeBtn').textContent = cur === 'dark' ? '☀️' : '🌙';
  renderCharts();
};

// ---------- form ----------
function fillCategories() {
  const sel = $('category');
  sel.innerHTML = CATEGORIES[state.type].map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const f = $('filterCat');
  const all = [...CATEGORIES.expense, ...CATEGORIES.income];
  f.innerHTML = '<option value="">كل الفئات</option>' + all.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  state.type = b.dataset.type;
  fillCategories();
});

$('txForm').onsubmit = (e) => {
  e.preventDefault();
  const amount = parseFloat($('amount').value);
  const date = $('date').value || new Date().toISOString().slice(0, 10);
  if (!amount || amount <= 0) return alert('ادخل مبلغ صحيح');
  state.txs.unshift({
    id: Date.now(),
    type: state.type,
    amount,
    category: $('category').value,
    date,
    note: $('note').value.trim(),
  });
  $('amount').value = ''; $('note').value = '';
  if (navigator.vibrate) navigator.vibrate(20);
  save(); render();
};

$('date').value = new Date().toISOString().slice(0, 10);

// ---------- budget ----------
$('saveBudgetBtn').onclick = () => {
  state.budget = parseFloat($('budgetInput').value) || 0;
  save(); render();
};
$('exportBtn').onclick = () => {
  if (!state.txs.length) return alert('لا توجد بيانات للتصدير');
  const rows = [['id','type','amount','category','date','note'], ...state.txs.map(t => [t.id, t.type, t.amount, t.category, t.date, `"${(t.note||'').replace(/"/g,'""')}"`])];
  const blob = new Blob(['\ufeff' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'masrofy-export.csv';
  a.click();
};
$('clearBtn').onclick = () => { if (confirm('متأكد تبي تمسح كل البيانات؟')) { state.txs = []; save(); render(); } };
$('sampleBtn').onclick = () => {
  const today = new Date();
  const d = (offset) => { const x = new Date(today); x.setDate(x.getDate() - offset); return x.toISOString().slice(0,10); };
  state.txs = [
    { id: 1, type: 'income', amount: 8000, category: 'salary', date: d(20), note: 'راتب الشهر' },
    { id: 2, type: 'income', amount: 1200, category: 'freelance', date: d(12), note: 'مشروع تصميم' },
    { id: 3, type: 'expense', amount: 900, category: 'housing', date: d(18), note: 'إيجار + كهرباء' },
    { id: 4, type: 'expense', amount: 650, category: 'food', date: d(5), note: 'مطاعم' },
    { id: 5, type: 'expense', amount: 320, category: 'transport', date: d(3), note: 'بنزين' },
    { id: 6, type: 'expense', amount: 450, category: 'shopping', date: d(2), note: 'ملابس' },
    { id: 7, type: 'expense', amount: 200, category: 'entertainment', date: d(1), note: 'سينما' },
  ];
  state.budget = 3000;
  save(); render();
};

// ---------- filters ----------
['search','filterCat','filterType'].forEach(id => $(id).addEventListener('input', renderList));

// ---------- render ----------
const fmt = (n) => Number(n).toLocaleString('ar-SA', { maximumFractionDigits: 0 }) + ' ر.س';
const catName = (id) => [...CATEGORIES.expense, ...CATEGORIES.income].find(c => c.id === id)?.name || id;

function render() {
  const income = state.txs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const expense = state.txs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const balance = income - expense;
  $('totalIncome').textContent = fmt(income);
  $('totalExpense').textContent = fmt(expense);
  $('balance').textContent = fmt(balance);
  $('incomeCount').textContent = state.txs.filter(t => t.type==='income').length + ' عملية';
  $('expenseCount').textContent = state.txs.filter(t => t.type==='expense').length + ' عملية';
  $('savingRate').textContent = 'معدل الادخار: ' + (income > 0 ? Math.max(0, Math.round(balance/income*100)) : 0) + '%';

  // budget
  const monthExp = state.txs.filter(t => t.type==='expense' && t.date.slice(0,7) === new Date().toISOString().slice(0,7)).reduce((s,t)=>s+t.amount,0);
  $('budgetInput').value = state.budget || '';
  if (state.budget > 0) {
    const pct = Math.min(100, Math.round(monthExp / state.budget * 100));
    $('budgetBar').style.width = pct + '%';
    $('budgetBar').style.background = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
    $('budgetText').textContent = `صرفت ${fmt(monthExp)} من ${fmt(state.budget)} (${pct}%)`;
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

  renderList();
  renderCharts();
  renderInsights(income, expense, balance);
}

function renderList() {
  const q = $('search').value.trim();
  const fc = $('filterCat').value, ft = $('filterType').value;
  let list = [...state.txs];
  if (ft) list = list.filter(t => t.type === ft);
  if (fc) list = list.filter(t => t.category === fc);
  if (q) list = list.filter(t => (t.note||'').includes(q) || String(t.amount).includes(q));
  const box = $('txList');
  if (!list.length) { box.innerHTML = '<div class="empty">لا توجد عمليات — أضف أول عملية من الأعلى 👆</div>'; return; }
  box.innerHTML = list.map(t => `
    <div class="tx">
      <div class="tx-info">
        <div class="tx-emoji">${EMOJI[t.category] || '📌'}</div>
        <div><b>${catName(t.category)}</b><small>${t.date} ${t.note ? ' • ' + t.note : ''}</small></div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="tx-amount ${t.type}">${t.type==='income'?'+':'-'} ${Number(t.amount).toLocaleString('ar-SA')}</span>
        <button class="tx-del" onclick="delTx(${t.id})">🗑️</button>
      </div>
    </div>`).join('');
}
window.delTx = (id) => { state.txs = state.txs.filter(t => t.id !== id); save(); render(); };

// ---------- charts ----------
function renderCharts() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = dark ? '#2a3354' : '#e5e7eb';
  const tickColor = dark ? '#94a3b8' : '#6b7280';
  Chart.defaults.color = tickColor;
  Chart.defaults.borderColor = gridColor;

  const byCat = {};
  state.txs.filter(t => t.type==='expense').forEach(t => byCat[t.category] = (byCat[t.category]||0) + t.amount);
  if (catChart) catChart.destroy();
  catChart = new Chart($('catChart'), {
    type: 'doughnut',
    data: { labels: Object.keys(byCat).map(catName), datasets: [{ data: Object.values(byCat), backgroundColor: ['#4f46e5','#ef4444','#10b981','#f59e0b','#06b6d4','#8b5cf6','#ec4899','#84cc16'] }] },
    options: { plugins: { legend: { position: 'bottom' } } }
  });

  // last 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth()-i); months.push(d.toISOString().slice(0,7)); }
  const sum = (m, type) => state.txs.filter(t => t.date.slice(0,7)===m && t.type===type).reduce((s,t)=>s+t.amount,0);
  if (monthChart) monthChart.destroy();
  monthChart = new Chart($('monthChart'), {
    type: 'bar',
    data: { labels: months, datasets: [
      { label: 'دخل', data: months.map(m=>sum(m,'income')), backgroundColor: '#10b981' },
      { label: 'مصروف', data: months.map(m=>sum(m,'expense')), backgroundColor: '#ef4444' },
    ]},
    options: { scales: { x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom' } } }
  });
}

// ---------- smart insights (rule-based AI) ----------
function renderInsights(income, expense, balance) {
  const box = $('insights');
  const tips = [];
  if (!state.txs.length) {
    box.innerHTML = '<div class="insight">👋 أضف عملياتك وبتظهر لك تحليلات ذكية هنا تلقائياً.</div>';
    return;
  }
  const byCat = {};
  state.txs.filter(t=>t.type==='expense').forEach(t=>byCat[t.category]=(byCat[t.category]||0)+t.amount);
  const top = Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
  if (top) {
    const pct = expense ? Math.round(top[1]/expense*100) : 0;
    tips.push(`🏆 أعلى فئة صرف: <b>${catName(top[0])}</b> — ${fmt(top[1])} (${pct}% من المصاريف)`);
  }
  const days = new Set(state.txs.map(t=>t.date)).size || 1;
  tips.push(`📊 متوسط صرفك اليومي: <b>${fmt(expense/days)}</b> (محسوب من ${days} يوم)`);
  if (income > 0) {
    const rate = Math.round(balance/income*100);
    tips.push(rate >= 20 ? `💪 ممتاز! معدل ادخارك <b>${rate}%</b> — استمر.` : rate >= 0 ? `⚠️ معدل ادخارك <b>${rate}%</b> — حاول توصله 20% بتقليل ${top?catName(top[0]):'المصاريف'}.` : `🚨 تصرف أكثر من دخلك! العجز <b>${fmt(-balance)}</b> — لازم خطة تقشف.`);
  }
  if (top && top[0]==='food' && expense>0) tips.push('🍔 نصيحة ذكية: مصاريف المطاعم عالية — الطبخ في البيت يوفر ~40%.');
  if (top && top[0]==='entertainment') tips.push('🎮 مصاريف الترفيه مرتفعة — حدد لها سقف أسبوعي.');
  const monthExp = state.txs.filter(t=>t.type==='expense'&&t.date.slice(0,7)===new Date().toISOString().slice(0,7)).reduce((s,t)=>s+t.amount,0);
  if (state.budget>0 && monthExp < state.budget) tips.push(`🎯 باقي في ميزانيتك <b>${fmt(state.budget-monthExp)}</b> لهذا الشهر.`);
  box.innerHTML = tips.map(t=>`<div class="insight">${t}</div>`).join('');
}

// ---------- init ----------
load();
initTheme();
fillCategories();
if (state.budget) $('budgetInput').value = state.budget;
render();

// ---------- Mobile: PWA install + bottom nav + FAB ----------
// 1) Service Worker (offline for mobile)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
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

// 3) Bottom nav scroll
document.querySelectorAll('.bnav').forEach((b) => b.onclick = () => {
  document.querySelectorAll('.bnav').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  const el = document.getElementById(b.dataset.goto);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (navigator.vibrate) navigator.vibrate(10);
});

// 4) FAB -> go to add form + focus amount
if ($('fab')) $('fab').onclick = () => {
  const f = $('formCard');
  if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => $('amount').focus({ preventScroll: true }), 400);
  if (navigator.vibrate) navigator.vibrate(15);
};
