# 🚀 دليل البدء السريع - Quick Start Guide

## لماذا هذا الملف؟

تم إعداد كل شيء لك! الآن تحتاج فقط إلى:
1. قراءة هذا الملف (5 دقائق)
2. تشغيل الأوامر (10 دقائق)
3. اختبار النتائج (15 دقيقة)

**المجموع: 30 دقيقة لتشغيل كامل النظام! ⚡**

---

## 📋 خطوات البدء السريع

### الخطوة 1️⃣: تثبيت Mock API (15 دقيقة)

**في Terminal 1 (Terminal جديد)**:

```powershell
# انتقل إلى مجلد المشروع
cd c:\Users\Abd\ al\ Rhman\ ky\Desktop\Next\factory

# شغل script الإعداد
bash setup-mock-api.sh

# هذا سيفعل تلقائيًا:
# ✅ إنشاء مجلد mock-api/
# ✅ إنشاء package.json
# ✅ إنشاء server.js مع جميع الـ endpoints

# الآن ادخل المجلد وثبت المكتبات
cd mock-api
npm install

# شغل الـ Server
npm start

# يجب أن ترى هذا الإخراج:
# ✅ Mock API Server running on http://localhost:3001
# 📝 Test Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**✅ النتيجة**: Mock API يعمل على `localhost:3001`

---

### الخطوة 2️⃣: تكوين Frontend (5 دقائق)

**في Terminal 2 (Terminal جديد)**:

```powershell
# انتقل إلى مجلد المشروع
cd c:\Users\Abd\ al\ Rhman\ ky\Desktop\Next\factory

# افتح ملف .env.local (أو أنشئه إن لم يكن موجودًا)
# أضف هذا السطر:
# NEXT_PUBLIC_API_URL=http://localhost:3001

# يمكنك فعل ذلك يدويًا في محرر النصوص:
# 1. افتح .env.local في VS Code
# 2. أضف السطر أعلاه
# 3. احفظ الملف
```

**أو باستخدام PowerShell**:

```powershell
# التحقق من وجود الملف
Test-Path .env.local

# إذا كان الملف موجودًا:
Add-Content -Path .env.local -Value "NEXT_PUBLIC_API_URL=http://localhost:3001" -Force

# إذا لم يكن موجودًا:
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

**✅ النتيجة**: Frontend معروف أين يجد API

---

### الخطوة 3️⃣: تشغيل Frontend (10 دقائق)

**في Terminal 2 (نفس الـ Terminal السابق)**:

```powershell
# تأكد أنك في مجلد المشروع الرئيسي (وليس mock-api)
cd c:\Users\Abd\ al\ Rhman\ ky\Desktop\Next\factory

# شغل الـ Frontend
npm run dev

# يجب أن ترى هذا:
# > next dev
# - ready started server on 0.0.0.0:3000
# - event compiled client and server successfully
```

**✅ النتيجة**: Frontend يعمل على `localhost:3000`

---

### الخطوة 4️⃣: اختبار التكامل (5 دقائق)

**في المتصفح**:

```
1. افتح: http://localhost:3000/dashboard/home
2. يجب أن تظهر Dashboard مع:
   ✅ بطاقة "الموظفين الكلي" = 3
   ✅ بطاقة "الحاضرين اليوم" = 2
   ✅ بطاقة "الغائبين" = 0
   ✅ بطاقة "المتأخرين" = 1 (سارة - 30 دقيقة)
   ✅ بطاقة "ساعات إضافية" = 15 دقيقة
   ✅ بطاقة "الرواتب المستحقة" = 410,000,000.00 SYP

3. انقر على بطاقة "الحاضرين":
   ✅ يجب أن يظهر modal مع:
   - أحمد محمود | 08:05
   - سارة علي | 08:45

4. انقر على بطاقة "المتأخرين":
   ✅ يجب أن يظهر modal مع:
   - سارة علي | 30 دقيقة متأخرة

5. افتح DevTools (F12) → Console:
   ✅ لا يجب أن تظهر أخطاء حمراء
```

---

## 🎯 الخطوات التالية بعد التشغيل الناجح

### اختبار شامل (2-3 ساعات)

استخدم دليل الاختبار الشامل:

```
اقرأ الملف: INTEGRATION_TESTING_GUIDE.md

اختبر هذه الحالات:
✅ اختبار 1: تحميل صفحة Dashboard
✅ اختبار 2: فتح Modal الحاضرين
✅ اختبار 3: فتح Modal المتأخرين
✅ اختبار 4: تحميل قائمة الموظفين
✅ اختبار 5: إنشاء موظف جديد
✅ اختبار 6: جلب بيانات الرواتب
✅ حالات الأخطاء: 401, 404, 500, Timeout
✅ قياس الأداء: Lighthouse
```

### خطة التطوير (أسبوع واحد)

استخدم خطة التطبيق:

```
اقرأ الملف: NEXT_IMPLEMENTATION_STEPS.md

المهام:
📋 اليوم: تفعيل Mock API ✅
📋 غدًا: اختبار شامل
📋 الأربعاء: اختبارات الوحدة
📋 الخميس: تحسين الأداء
📋 الجمعة: Responsive Design
```

### تتبع الحالة

استخدم لوحة التحكم:

```
اقرأ الملف: PROJECT_STATUS_DASHBOARD.md

فيها:
📊 نسبة الإكمال الحالية: 33%
📊 قائمة المهام الفورية
📊 الجدول الزمني الأسبوعي
📊 المشاكل المعروفة والحلول
📊 مؤشرات الأداء الرئيسية
```

---

## 🔧 استكشاف الأخطاء

### المشكلة: "خطأ في الاتصال بـ localhost:3001"

```
الحل:
1. تأكد من تشغيل Mock API:
   - افتح Terminal 1 وتحقق من الرسالة "running on http://localhost:3001"
   
2. تأكد من إضافة NEXT_PUBLIC_API_URL:
   - افتح .env.local
   - تحقق من وجود: NEXT_PUBLIC_API_URL=http://localhost:3001
   - أعد تشغيل Frontend (npm run dev)
   
3. تحقق من الحريق (Firewall):
   - إذا كان هناك firewall، اسمح بـ localhost:3001
```

### المشكلة: "لا ترى بيانات في Dashboard"

```
الحل:
1. افتح DevTools → Network:
   - يجب أن ترى requests إلى http://localhost:3001/api/...
   
2. افتح DevTools → Console:
   - ابحث عن أخطاء تتعلق بـ CORS أو التوثيق
   
3. تحقق من Token:
   - في .env.local، تأكد أن TOKEN محفوظ بشكل صحيح
```

### المشكلة: "npm install فشل"

```
الحل:
1. حذف node_modules:
   rm -r node_modules
   
2. حذف package-lock.json:
   rm package-lock.json
   
3. إعادة التثبيت:
   npm install
```

---

## 📚 الملفات المهمة

```
📄 NEXT_IMPLEMENTATION_STEPS.md
   → الخطوات الفعلية للتطوير
   → اقرأ هذا أولاً بعد البدء

📄 INTEGRATION_TESTING_GUIDE.md
   → دليل اختبار شامل
   → 6 حالات اختبار رئيسية
   → 4 حالات أخطاء

📄 PROJECT_STATUS_DASHBOARD.md
   → تتبع حالة المشروع
   → نسبة الإكمال
   → الجدول الزمني

📄 BACKEND_API_REQUIREMENTS.md
   → مواصفات API الكاملة
   → لمشاركتها مع فريق Backend

📄 setup-mock-api.sh
   → script لإنشاء Mock API
   → تم تشغيله بالفعل في الخطوة 1

📄 INTEGRATION_STATUS_AR.md
   → ملخص الحالة الحالية بالعربية
   → لمدير المشروع
```

---

## 🎓 نصائح مهمة

### 1️⃣ حافظ على Terminals مفتوحة

```
Terminal 1: Mock API (npm start)
Terminal 2: Frontend (npm run dev)
Terminal 3: للأوامر الأخرى
```

### 2️⃣ عند إجراء تغييرات

```
في Frontend:
- أي تعديل على الملفات ينعكس تلقائيًا (Hot Reload)
- لا حاجة لإعادة تشغيل

في Mock API:
- تحتاج لإعادة التشغيل (Ctrl+C ثم npm start)
```

### 3️⃣ لتفكيك النظام

```
1. اضغط Ctrl+C في Terminal 1 (Mock API)
2. اضغط Ctrl+C في Terminal 2 (Frontend)
3. يمكنك الآن التعديل وإعادة التشغيل
```

---

## ⚡ المفاتيح السريعة

| المفتاح | الفائدة |
|--------|--------|
| `Ctrl+C` | إيقاف الـ Server |
| `F12` | فتح DevTools |
| `Ctrl+Shift+I` | فتح Inspector |
| `Ctrl+Shift+J` | فتح Console |
| `Ctrl+Shift+E` | فتح Network |

---

## 📞 احتاج مساعدة؟

| السؤال | الملف المناسب |
|--------|------------|
| كيف أشغل المشروع؟ | هذا الملف (README.md) |
| ما هي الخطوات الفعلية؟ | NEXT_IMPLEMENTATION_STEPS.md |
| كيف أختبر؟ | INTEGRATION_TESTING_GUIDE.md |
| ما هي الحالة الحالية؟ | PROJECT_STATUS_DASHBOARD.md |
| ما هي متطلبات Backend؟ | BACKEND_API_REQUIREMENTS.md |

---

## ✅ قائمة التحقق

قبل الانتقال للاختبار الشامل:

- [ ] Mock API يعمل على localhost:3001
- [ ] Frontend يعمل على localhost:3000
- [ ] .env.local يحتوي على NEXT_PUBLIC_API_URL
- [ ] Dashboard يحمل البيانات الحقيقية
- [ ] 3 موظفين يظهرون في البيانات
- [ ] Modals تفتح وتعرض البيانات
- [ ] لا توجد أخطاء حمراء في Console
- [ ] DevTools → Network يظهر requests إلى API

---

## 🎉 تهانينا!

عند اكتمال جميع النقاط أعلاه:

```
✅ تم تثبيت المشروع بنجاح
✅ التكامل الأساسي يعمل
✅ جاهز للاختبار الشامل
✅ جاهز للتطوير اللاحق
```

**الخطوة التالية**: اقرأ `INTEGRATION_TESTING_GUIDE.md` لتشغيل الاختبارات الشاملة

---

**آخر تحديث**: 12 مايو 2026  
**الحالة**: 🟢 جاهز للاستخدام  
**المدة المتوقعة**: 30 دقيقة للتشغيل الكامل
