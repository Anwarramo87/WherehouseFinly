# مشروع Warehouse - دليل التشغيل المحلي 🏭

## ⚠️ المشكلة: 500 Error

إذا كنت تشوف هذا الخطأ في Console:
```
Failed to load resource: the server responded with a status of 500
api/employees?page=1&limit=500
```

## ✅ الحل السريع (أسهل طريقة)

### الخيار 1: السكريبت التلقائي الكامل ⭐ (مُوصى به)
```powershell
.\fix-500-error.ps1
```

هذا السكريبت يعمل كل حاجة تلقائياً:
- ✅ يوقف أي services قديمة
- ✅ ينشئ/يفحص `.env.local`
- ✅ يمسح Next.js cache
- ✅ يشغل Backend
- ✅ يشغل Frontend
- ✅ يفتح المتصفح تلقائياً

### الخيار 2: التشغيل العادي
```powershell
.\start-both.ps1
```

### الخيار 3: إعادة تشغيل Frontend فقط (إذا Backend شغال)
```powershell
.\restart-frontend.ps1
```

## 📋 المتطلبات الأساسية

### 1. الملف `.env.local` (مهم جداً!)
**المكان:** `C:\Users\BootCamp\Downloads\anwarfinly\front\Factory\.env.local`

**المحتوى:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1
```

### 2. Backend شغال
```powershell
cd C:\Users\BootCamp\Downloads\anwarfinly\back\werehouse\backend-nest
npm run start:dev
```

### 3. Frontend restart بعد إنشاء `.env.local`
**مهم:** Next.js محتاج restart كامل عشان يقرأ environment variables الجديدة!

## 🔍 التشخيص

### هل كل حاجة شغالة؟
```powershell
.\check-env.ps1
```

### اختبر Environment Variables
افتح في المتصفح:
```
http://localhost:3000/api/debug
```

يجب تشوف:
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "http://localhost:5003/api/v1"
  }
}
```

## 📁 السكريبتات المتاحة

| السكريبت | الوظيفة | متى تستخدمه |
|----------|---------|-------------|
| `fix-500-error.ps1` | ✨ حل شامل تلقائي | أول مرة أو عند وجود مشاكل |
| `start-both.ps1` | يشغل Backend + Frontend | التشغيل العادي |
| `restart-frontend.ps1` | إعادة تشغيل Frontend فقط | بعد تعديل .env.local |
| `check-env.ps1` | فحص الإعدادات | للتشخيص |

## 🌐 الروابط

| الخدمة | الرابط | الوصف |
|--------|--------|-------|
| Frontend | http://localhost:3000 | واجهة المستخدم |
| Backend API | http://localhost:5003 | API الرئيسي |
| API Docs | http://localhost:5003/api | Swagger Documentation |
| Debug Info | http://localhost:3000/api/debug | معلومات التشخيص |

## ❓ الأسئلة الشائعة

### Q: لماذا أحتاج لعمل restart للـ Frontend؟
**A:** Next.js يقرأ Environment Variables عند بدء التشغيل فقط. Hot Reload لا يكفي.

### Q: هل `.env.local` سيتم رفعه لـ Git؟
**A:** لا. الملف محمي بواسطة `.gitignore` (السطر `.env*`).

### Q: لماذا Backend يعطي 401 Unauthorized؟
**A:** هذا طبيعي. Backend محتاج login. المهم أنه يرد (مش connection refused).

### Q: كيف أعرف إذا Backend شغال؟
**A:** 
```powershell
# الطريقة 1
Test-NetConnection localhost -Port 5003

# الطريقة 2
curl http://localhost:5003/api/v1/departments
# إذا رجع 401 = Backend شغال
# إذا رجع connection error = Backend مش شغال
```

### Q: Frontend بيقول "Ready" لكن لسه في 500 errors؟
**A:** معناها Frontend مش قارئ `.env.local`. الحل:
1. تأكد إن الملف موجود: `Get-Content .env.local`
2. أعد تشغيل Frontend: `.\restart-frontend.ps1`
3. افحص debug endpoint: `http://localhost:3000/api/debug`

## 🆘 لو لسه في مشكلة

1. **اقرأ دليل الـ Troubleshooting الشامل:**
   ```powershell
   notepad TROUBLESHOOTING-500-AR.md
   ```

2. **جرب Nuclear Option:**
   ```powershell
   # امسح كل حاجة وابدأ من جديد
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
   .\fix-500-error.ps1
   ```

3. **اجمع معلومات Debugging:**
   ```powershell
   # معلومات Environment
   Get-Content .env.local
   
   # حالة الـ Ports
   Get-NetTCPConnection -LocalPort 3000,5003
   
   # اختبار Debug endpoint
   curl http://localhost:3000/api/debug
   ```

## 📚 الملفات المهمة

| الملف | الغرض |
|------|-------|
| `.env.local` | إعدادات Backend URL (يُنشأ تلقائياً) |
| `fix-500-error.ps1` | حل المشكلة تلقائياً |
| `TROUBLESHOOTING-500-AR.md` | دليل شامل لحل المشاكل |
| `DEV-GUIDE.md` | دليل التطوير الكامل (English) |
| `LOCAL-DEV-FIXED-AR.md` | شرح تفصيلي للمشكلة والحل |

## 🎯 الخطوات المضمونة

إذا فشل كل شيء، اتبع هذه الخطوات بالترتيب:

```powershell
# 1. اقفل كل الـ terminals (Ctrl+C في كل واحد)

# 2. روح لمجلد Frontend
cd C:\Users\BootCamp\Downloads\anwarfinly\front\Factory

# 3. شغل السكريبت التلقائي
.\fix-500-error.ps1

# 4. انتظر 10 ثواني

# 5. افتح المتصفح
# السكريبت هيفتح تلقائياً:
# - http://localhost:3000 (التطبيق)
# - http://localhost:3000/api/debug (معلومات التشخيص)

# 6. افحص Console في المتصفح (F12)
# يجب ألا تشوف 500 errors
```

## ✅ علامات النجاح

عندما كل حاجة تشتغل صح، هتشوف:

### في Backend Terminal:
```
✓ Nest application successfully started
✓ Listening on port 5003
```

### في Frontend Terminal:
```
✓ Ready in 2.5s
✓ Local: http://localhost:3000
```

### في المتصفح (F12 Console):
```
✓ لا توجد 500 errors
✓ البيانات تحمّل بنجاح
```

### في http://localhost:3000/api/debug:
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "http://localhost:5003/api/v1",
    "NODE_ENV": "development"
  }
}
```

---

## 🚀 بعد حل المشكلة

الآن يمكنك:
- ✅ تطوير Features جديدة
- ✅ اختبار التغييرات محلياً
- ✅ التأكد من كل شيء قبل Push للـ Production

## 🌍 Production Deployment

- **Frontend:** https://wherehouse-finly.vercel.app (Vercel)
- **Backend:** https://werehouse-production-4cba.up.railway.app (Railway)

التغييرات التي عملناها **لا تؤثر** على Production. هي فقط للـ local development.

---

**آخر تحديث:** يناير 2025  
**الحالة:** ✅ تم توثيق الحل بالكامل

**للدعم:** اقرأ `TROUBLESHOOTING-500-AR.md`
