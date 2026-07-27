# حل مشكلة 500 Error - دليل شامل

## المشكلة لسه موجودة؟

إذا كنت لسه بتشوف الخطأ:
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
api/employees?page=1&limit=500
```

## الحل خطوة بخطوة

### الخطوة 1: تأكد إن Backend شغال ✅

```powershell
# روح على مجلد Backend
cd C:\Users\BootCamp\Downloads\anwarfinly\back\werehouse\backend-nest

# شغل Backend
npm run start:dev
```

**انتظر حتى تشوف الرسالة:**
```
Nest application successfully started
Listening on port 5003
```

### الخطوة 2: تأكد من وجود .env.local ✅

```powershell
# روح على مجلد Frontend
cd C:\Users\BootCamp\Downloads\anwarfinly\front\Factory

# افحص إذا الملف موجود
Get-Content .env.local
```

**يجب تشوف:**
```
NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1
```

**إذا مش موجود:**
```powershell
.\start-both.ps1
```

### الخطوة 3: أعد تشغيل Frontend (مهم جداً!) ⚠️

**المشكلة:** Frontend لازم يعمل restart عشان يقرأ `.env.local` الجديد!

**الحل السريع:**
```powershell
# استخدم السكريبت الجديد
.\restart-frontend.ps1
```

**أو الطريقة اليدوية:**
1. اقفل Terminal اللي فيه `npm run dev`
2. افتح Terminal جديد
3. روح للمجلد:
   ```powershell
   cd C:\Users\BootCamp\Downloads\anwarfinly\front\Factory
   ```
4. شغل:
   ```powershell
   npm run dev
   ```

### الخطوة 4: اختبر إذا Environment Variables اتقرت صح ✅

افتح في المتصفح:
```
http://localhost:3000/api/debug
```

**يجب تشوف:**
```json
{
  "message": "Debug info",
  "env": {
    "NEXT_PUBLIC_API_URL": "http://localhost:5003/api/v1",
    "NODE_ENV": "development",
    "resolvedUrl": "http://localhost:5003/api/v1"
  }
}
```

**إذا شفت `null` أو `undefined`:**
- معناها Frontend مش قارئ `.env.local`
- لازم restart (الخطوة 3)

### الخطوة 5: تأكد Backend شغال ومتصل ✅

اختبر Backend مباشرة:
```powershell
curl http://localhost:5003/api/v1/departments
```

**يجب تشوف:**
- إما بيانات (JSON)
- أو 401 Unauthorized (عادي - محتاج login)

**إذا شفت خطأ في الاتصال:**
- Backend مش شغال
- روح للخطوة 1

## التشخيص المتقدم

### اختبار 1: هل Backend متاح؟
```powershell
Test-NetConnection -ComputerName localhost -Port 5003
```

**يجب تشوف:**
```
TcpTestSucceeded : True
```

### اختبار 2: هل Frontend قارئ Environment Variables؟
```powershell
# افتح صفحة Debug
Start-Process "http://localhost:3000/api/debug"
```

### اختبار 3: السكريبت الشامل
```powershell
.\check-env.ps1
```

## أسباب مشهورة للمشكلة

| السبب | الحل |
|-------|-----|
| `.env.local` مش موجود | شغل `start-both.ps1` |
| Frontend مش متعمله restart بعد إنشاء `.env.local` | شغل `restart-frontend.ps1` |
| Backend مش شغال | `cd backend-nest && npm run start:dev` |
| Port 5003 مشغول | اقفل البرنامج اللي شغاله على Port 5003 |
| Environment Variable غلط | افحص `.env.local` بـ `Get-Content .env.local` |

## الأخطاء الشائعة

### ❌ خطأ 1: نسيت Restart Frontend
```
المشكلة: عملت .env.local لكن لسه في 500
الحل: لازم restart للـ Frontend!
الأمر: .\restart-frontend.ps1
```

### ❌ خطأ 2: Backend مش شغال
```
المشكلة: Backend stopped أو crashed
الحل: افتح Terminal جديد وشغله:
cd C:\Users\BootCamp\Downloads\anwarfinly\back\werehouse\backend-nest
npm run start:dev
```

### ❌ خطأ 3: `.env.local` في المكان الغلط
```
المكان الصح: C:\Users\BootCamp\Downloads\anwarfinly\front\Factory\.env.local
المكان الغلط: أي مكان تاني!
```

## التدفق الصحيح للعمل

```
1. Backend شغال على localhost:5003 ✅
         ↓
2. .env.local موجود في مجلد Factory ✅
         ↓
3. Frontend restart عشان يقرأ .env.local ✅
         ↓
4. Frontend بيبعت requests لـ /api/employees ✅
         ↓
5. Next.js API Route يقرأ NEXT_PUBLIC_API_URL ✅
         ↓
6. يعمل forward للـ Backend على localhost:5003 ✅
         ↓
7. Backend يرد بالبيانات ✅
         ↓
8. Next.js يرجع البيانات للمتصفح ✅
```

## الحل النهائي (Step by Step)

### إذا كل حاجة فشلت، اعمل كده:

```powershell
# 1. اقفل كل الـ terminals
# اضغط Ctrl+C في كل terminal مفتوح

# 2. افتح PowerShell جديد في مجلد Frontend
cd C:\Users\BootCamp\Downloads\anwarfinly\front\Factory

# 3. تأكد من .env.local
if (!(Test-Path .env.local)) {
    @"
NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1
"@ | Out-File -FilePath .env.local -Encoding utf8
}

# 4. شغل السكريبت الجديد
.\start-both.ps1

# 5. انتظر 10 ثواني

# 6. افتح المتصفح
Start-Process "http://localhost:3000"

# 7. افحص Debug endpoint
Start-Process "http://localhost:3000/api/debug"
```

## هل نجح الحل؟

### ✅ علامات النجاح:
- [ ] Backend terminal بيقول "Listening on port 5003"
- [ ] Frontend terminal بيقول "Ready in XXms"
- [ ] `http://localhost:3000/api/debug` بيرجع JSON فيه `NEXT_PUBLIC_API_URL`
- [ ] `http://localhost:3000` بيفتح بدون 500 errors
- [ ] Console في المتصفح مفيش "500 Internal Server Error"

### ❌ لسه مش شغال؟

اعمل الآتي:

1. **أخد Screenshot للأخطاء:**
   - Console في المتصفح (F12)
   - Frontend terminal
   - Backend terminal

2. **اجمع المعلومات:**
   ```powershell
   # نسخ Environment Variables
   Get-Content .env.local
   
   # حالة الـ Ports
   Get-NetTCPConnection -LocalPort 3000,5003 -ErrorAction SilentlyContinue
   
   # اختبار Debug endpoint
   curl http://localhost:3000/api/debug
   ```

3. **راجع الملفات:**
   - هل `.env.local` موجود في `Factory` folder؟
   - هل Backend `.env` موجود وفيه database credentials؟

## ملاحظات مهمة

### 🔴 Environment Variables في Next.js
- `NEXT_PUBLIC_*` variables متاحة للـ browser و server
- لكن لازم **restart** للـ dev server عشان يقراهم
- مش كافي تعمل refresh للصفحة!

### 🔴 Hot Reload لا يكفي
- Next.js Hot Reload بيعمل refresh للكود فقط
- Environment Variables محتاجين **server restart** كامل

### 🔴 الفرق بين Development و Production
- Development: محتاج `.env.local` وserver restart
- Production (Vercel): Environment Variables من Dashboard

## سكريبتات مساعدة جديدة

| السكريبت | الوظيفة |
|----------|---------|
| `start-both.ps1` | يشغل Backend + Frontend مع فحص .env.local |
| `restart-frontend.ps1` | ✨ جديد: يعمل restart للـ Frontend بشكل صحيح |
| `check-env.ps1` | يفحص الإعدادات والـ ports |

---

## لو كل حاجة فشلت - Nuclear Option 💣

```powershell
# 1. اقفل كلللل الـ terminals والبرامج

# 2. Clean restart
cd C:\Users\BootCamp\Downloads\anwarfinly\front\Factory

# اقتل أي حاجة على Port 3000
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# امسح .next folder
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# تأكد من .env.local
"NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1" | Out-File .env.local -Encoding utf8

# شغل من جديد
.\start-both.ps1
```

---

**آخر تحديث:** 2025-01-XX  
**الحالة:** 🔧 Troubleshooting active
