# Local Development Setup - إعداد التطوير المحلي

## 🚀 Quick Start (البداية السريعة)

### Windows:
```powershell
# Simply run this script - سهل جداً، فقط شغل هذا الملف
.\start-both.ps1
```

This will automatically:
- ✅ Create `.env.local` if missing (ينشئ .env.local إذا كان مفقود)
- ✅ Start Backend on port 5003 (يشغل الباك إند)
- ✅ Start Frontend on port 3000 (يشغل الفرونت إند)

### Check Environment:
```powershell
# Verify everything is configured correctly - تحقق من الإعدادات
.\check-env.ps1
```

## 📁 Required Files (الملفات المطلوبة)

### Frontend (Factory folder):
```
.env.local  ← MUST exist (يجب أن يكون موجود)
```

Content should be:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1
```

### Backend (backend-nest folder):
```
.env  ← MUST exist with your database credentials
```

## 🌐 URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5003
- **API Docs:** http://localhost:5003/api

## ❌ Common Issues (المشاكل الشائعة)

### Problem: 500 Error on /api/employees
**Solution:** 
1. Make sure `.env.local` exists (check with `check-env.ps1`)
2. Restart frontend terminal
3. Verify backend is running on port 5003

### Problem: WebSocket connection failed
**Solution:** Backend is not running. Start it:
```powershell
cd ..\..\back\werehouse\backend-nest
npm run start:dev
```

## 📚 Documentation

- **Full Guide (English):** [`DEV-GUIDE.md`](./DEV-GUIDE.md)
- **Fix Details (Arabic):** [`LOCAL-DEV-FIXED-AR.md`](./LOCAL-DEV-FIXED-AR.md)

## 🔧 Helper Scripts

| Script | Purpose |
|--------|---------|
| `start-both.ps1` | Start backend + frontend automatically |
| `check-env.ps1` | Verify configuration and running services |

---

**Need Help?** Read the full documentation in `LOCAL-DEV-FIXED-AR.md` (بالعربي)
