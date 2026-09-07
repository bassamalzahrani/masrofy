# 💰 مَصرفي | Masrofy 📱

> تطبيق جوال (PWA) عربي لتتبع المصاريف والدخل مع تحليلات ذكية — يتثبت على الجوال ويعمل بدون نت.

![PWA](https://img.shields.io/badge/PWA-ready-purple) ![Mobile](https://img.shields.io/badge/Mobile--first-green) ![License](https://img.shields.io/badge/license-MIT-green)

## 📱 التثبيت على الجوال

**أندرويد (كروم):**
1. افتح رابط GitHub Pages على جوالك
2. اضغط ⋮ ← **تثبيت التطبيق / Add to Home screen**
3. بيصير عندك أيقونة مَصرفي مثل أي تطبيق

**آيفون (سفاري):**
1. افتح الرابط في سفاري
2. زر **مشاركة** ← **إضافة إلى الشاشة الرئيسية**

**يعمل بدون نت** بعد أول فتح (Service Worker).

## 📦 تحويله لـ APK (اختياري للـ CV)

أسهل طريقة مجانية بدون كود:
1. ارفع المشروع على GitHub Pages
2. روح [pwabuilder.com](https://www.pwabuilder.com) وحط رابط موقعك
3. حمّل ملف APK جاهز — وتقدر ترفعه على GitHub Releases

## ✨ المميزات (نسخة الجوال)

- ➕ إضافة دخل / مصاريف مع فئات جاهزة
- 📊 رسوم بيانية (دائري + شهري) بـ Chart.js
- 🤖 **تحليلات ذكية محلية**: أعلى فئة صرف، متوسط الصرف اليومي، معدل الادخار، نصائح توفير
- 🎯 ميزانية شهرية مع تنبيهات (أخضر / أصفر / أحمر)
- 🌙 وضع ليلي + عربي RTL كامل + تصميم موبايل-فيرست
- 📲 شريط سفلي + زر + عائم + اهتزاز عند الإضافة
- 💾 حفظ تلقائي في `localStorage` — خصوصية كاملة
- 📥 تصدير CSV بضغطة زر
- ⚡ يعمل أوفلاين (PWA + Service Worker)

## 🚀 التشغيل

بدون أي تثبيت — افتح الملف مباشرة:

```bash
# الطريقة 1: فتح مباشر
# دبل كلك على index.html

# الطريقة 2: سيرفر محلي
npx serve .
# أو
python -m http.server 8000
# ثم افتح http://localhost:8000
```

## 📁 هيكل المشروع

```
├── index.html      # الواجهة
├── style.css       # التصميم + دارك مود
├── app.js          # المنطق + التحليلات الذكية + الرسوم
├── manifest.json   # إعدادات PWA
├── README.md
└── LICENSE
```

## 🧠 كيف تشتغل التحليلات الذكية؟

محرك قواعد (Rule-based) في `app.js` دالة `renderInsights()`:
1. يحسب أعلى فئة صرف ونسبتها
2. يحسب متوسط الصرف اليومي ومعدل الادخار
3. يقارن المصروف الشهري بالميزانية
4. يولّد نصائح توفير حسب الفئة الأعلى

تقدر تطورها لاحقاً لاستخدام AI API حقيقي.

## 🌐 النشر على GitHub Pages (مجاناً)

1. ارفع المشروع على GitHub (الخطوات تحت)
2. روح `Settings → Pages → Deploy from branch → main → / (root)`
3. بيطلع لك رابط مثل: `https://username.github.io/masrofy`
4. حطه أعلى الـ README عشان أصحاب التوظيف يجربونه

## 📤 الرفع على GitHub

```bash
git init
git add .
git commit -m "feat: initial Masrofy expense tracker 🎉"
git branch -M main
git remote add origin https://github.com/USERNAME/masrofy.git
git push -u origin main
```

## 🔮 أفكار تطوير (للمساهمة)

- [ ] ربط Firebase للمزامنة بين الأجهزة
- [ ] تنبيهات واتساب عند تجاوز الميزانية
- [ ] استيراد كشف حساب بنكي (CSV)
- [ ] نسخة Flutter للجوال
- [ ] ربط OpenAI لتصنيف تلقائي للمصاريف

## 📄 الرخصة

MIT — استخدمه بحرية في معرض أعمالك.

---
صُنع بـ ❤️ كمشروع بورتفوليو عربي
