# إصلاح مشكلة 500 Error في التطوير المحلي

## المشكلة
كانت صفحة الموقع تعرض خطأ 500 عند محاولة جلب البيانات:
```
GET http://localhost:3000/api/employees 500
GET http://localhost:3000/api/employees/resigned 500
```

## السبب الجذري
الملف `.env.local` كان مفقوداً في مجلد Frontend. هذا الملف ضروري لكي يعرف Next.js كيف يتصل بالـ Backend المحلي.

بدون هذا الملف، كان Next.js API Proxy لا يعرف إلى أين يرسل الطلبات، فيفشل بخطأ 500.

## الحل
تم إنشاء الملف `.env.local` بالإعدادات الصحيحة:

```bash
# Backend API base URL (include /api/v1)
NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1
```

## الملفات المحدثة

### 1. ✅ إنشاء `.env.local`
الملف الجديد الذي يحتوي على رابط الـ Backend المحلي.

### 2. ✅ تحديث `start-both.ps1`
- يفحص وجود `.env.local` تلقائياً
- ينشئه إذا كان مفقوداً
- يعرض رسائل مساعدة للأخطاء الشائعة

### 3. ✅ تحديث `DEV-GUIDE.md`
- إضافة قسم Environment Variables مفصّل
- شرح مشكلة 500 Error وحلها
- توثيق متطلبات .env.local

### 4. ✅ إنشاء `check-env.ps1`
سكريبت جديد للتحقق من الإعدادات:
- يفحص وجود `.env.local`
- يفحص أن الـ Backend شغال على port 5003
- يفحص أن الـ Frontend شغال على port 3000
- يعطي تقرير كامل عن حالة البيئة

## كيف تشغل المشروع الآن؟

### الطريقة الأسهل (تلقائي):
1. افتح PowerShell في مجلد `Factory`
2. نفذ الأمر:
   ```powershell
   .\start-both.ps1
   ```
3. انتظر 5 ثواني حتى يشتغل الـ Backend
4. افتح المتصفح على `http://localhost:3000`

### للتحقق من الإعدادات:
```powershell
.\check-env.ps1
```

## كيف يعمل النظام؟

```
المتصفح (Browser)
    ↓
http://localhost:3000 (Next.js Frontend)
    ↓
/api/* (Next.js API Routes - Proxy)
    ↓
http://localhost:5003/api/v1 (NestJS Backend)
    ↓
قاعدة البيانات (Database)
```

### التدفق:
1. المتصفح يطلب بيانات من `/api/employees`
2. Next.js API Route في `/api/[...path]/route.ts` يستقبل الطلب
3. الـ Route يقرأ `NEXT_PUBLIC_API_URL` من `.env.local`
4. يعيد توجيه الطلب للـ Backend على `http://localhost:5003/api/v1/employees`
5. Backend يرجع البيانات
6. Next.js API Route يرسلها للمتصفح

### لماذا `.env.local` ضروري؟
- بدونه، Next.js API Route لا يعرف رابط الـ Backend
- النتيجة: 500 Internal Server Error
- مع `.env.local`: يعيد توجيه الطلبات بشكل صحيح

## الفرق بين Development و Production

### Development (محلي):
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5003`
- يحتاج `.env.local` لربط الاثنين

### Production (Vercel):
- Frontend: `https://wherehouse-finly.vercel.app`
- Backend: `https://werehouse-production-4cba.up.railway.app`
- Vercel يستخدم Environment Variables من لوحة التحكم

## ملاحظات مهمة

### ✅ الملفات المحمية من Git:
الملف `.env.local` مُضاف تلقائياً لـ `.gitignore` ولن يُرفع لـ GitHub.

### ✅ التوافق مع Production:
جميع التغييرات متوافقة مع Production في Vercel. لم نغير أي كود يؤثر على الإنتاج.

### ✅ الأمان:
- `.env.local` للتطوير المحلي فقط
- Production يستخدم Environment Variables المشفرة في Vercel

## الخطوات التالية

الآن بعد حل مشكلة 500:
1. يمكنك تشغيل المشروع محلياً بدون مشاكل
2. جميع API Calls تعمل بشكل صحيح
3. يمكنك التطوير والتجربة محلياً قبل الرفع للـ Production

## أسئلة شائعة

### Q: لماذا كان المشروع يعمل على Vercel لكن مش محلياً؟
**A:** لأن Vercel عندها Environment Variables مضبوطة في Dashboard. المشروع المحلي كان يحتاج `.env.local`.

### Q: هل أحتاج أعمل restart للـ Frontend بعد إنشاء `.env.local`?
**A:** نعم. Environment Variables تُقرأ عند بدء التشغيل. أقفل Terminal وشغل `start-both.ps1` مرة ثانية.

### Q: هل `.env.local` هيترفع لـ Git?
**A:** لا. الملف مُضاف تلقائياً لـ `.gitignore` (السطر `.env*` في gitignore).

### Q: ماذا لو Backend مش شغال؟
**A:** Next.js API Proxy عنده fallback تلقائي للـ Production Backend على Railway.

---

## ملخص الحل

| المشكلة | الحل |
|---------|------|
| 500 Error على /api/* | إنشاء `.env.local` مع NEXT_PUBLIC_API_URL |
| مش عارف أشغل المشروع | استخدم `start-both.ps1` |
| عاوز أتحقق من الإعدادات | استخدم `check-env.ps1` |
| مش عارف إذا كل حاجة تمام | اقرأ `DEV-GUIDE.md` |

---

**تاريخ الإصلاح:** 2025-01-XX  
**الحالة:** ✅ تم الحل بنجاح
