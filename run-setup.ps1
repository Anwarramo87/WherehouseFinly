#!/usr/bin/env pwsh
# run-setup.ps1
# سكريبت لتشغيل المشروع بسرعة

Write-Host "
╔═══════════════════════════════════════════════════════════╗
║          🚀 Factory Management System - Quick Setup       ║
║                   Version 1.0 - May 12, 2026              ║
╚═══════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# التحقق من Node.js
Write-Host "`n📌 التحقق من المتطلبات..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js غير مثبت. يرجى تثبيت Node.js من https://nodejs.org" -ForegroundColor Red
    exit 1
}

$nodeVersion = node -v
$npmVersion = npm -v
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "✅ npm: $npmVersion" -ForegroundColor Green

# السؤال عما يريده المستخدم
Write-Host "`n❓ ماذا تريد أن تفعل؟" -ForegroundColor Cyan
Write-Host "
1. 🚀 تشغيل كامل المشروع (Frontend + Mock API)
2. 🚀 تشغيل Frontend فقط
3. 🚀 تشغيل Mock API فقط
4. 📖 قراءة دليل البدء السريع
5. 🧪 تشغيل الاختبارات
0. ❌ إلغاء
" -ForegroundColor Yellow

$choice = Read-Host "اختر رقم (0-5)"

switch ($choice) {
    "1" {
        Write-Host "`n🔄 جاري إعداد كامل المشروع..." -ForegroundColor Cyan
        
        # إنشاء Mock API
        Write-Host "`n📦 الخطوة 1: إنشاء Mock API..." -ForegroundColor Yellow
        bash setup-mock-api.sh
        
        if (Test-Path "./mock-api") {
            Write-Host "✅ تم إنشاء Mock API" -ForegroundColor Green
            
            # تثبيت مكتبات Mock API
            Write-Host "`n📦 الخطوة 2: تثبيت مكتبات Mock API..." -ForegroundColor Yellow
            Push-Location ./mock-api
            npm install
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ تم تثبيت مكتبات Mock API" -ForegroundColor Green
            } else {
                Write-Host "❌ فشل تثبيت مكتبات Mock API" -ForegroundColor Red
                exit 1
            }
            Pop-Location
        }
        
        # تثبيت Frontend dependencies
        Write-Host "`n📦 الخطوة 3: تثبيت Frontend dependencies..." -ForegroundColor Yellow
        npm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ تم تثبيت Frontend dependencies" -ForegroundColor Green
        } else {
            Write-Host "❌ فشل تثبيت Frontend" -ForegroundColor Red
            exit 1
        }
        
        # تكوين .env.local
        Write-Host "`n⚙️ الخطوة 4: تكوين البيئة..." -ForegroundColor Yellow
        
        if (-not (Test-Path ".env.local")) {
            @"
NEXT_PUBLIC_API_URL=http://localhost:3001
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
            Write-Host "✅ تم إنشاء .env.local" -ForegroundColor Green
        } else {
            $content = Get-Content ".env.local" -Raw
            if ($content -notmatch "NEXT_PUBLIC_API_URL") {
                Add-Content -Path ".env.local" -Value "`nNEXT_PUBLIC_API_URL=http://localhost:3001"
                Write-Host "✅ تم تحديث .env.local" -ForegroundColor Green
            } else {
                Write-Host "✅ .env.local موجود ومكتمل" -ForegroundColor Green
            }
        }
        
        # عرض التعليمات النهائية
        Write-Host "`n
╔═══════════════════════════════════════════════════════════╗
║                    ✅ الإعداد مكتمل!                      ║
╚═══════════════════════════════════════════════════════════╝

الخطوات التالية:

1️⃣  افتح Terminal جديد وشغل Mock API:
    cd mock-api
    npm start
    
    يجب أن ترى:
    ✅ Mock API Server running on http://localhost:3001

2️⃣  افتح Terminal ثاني وشغل Frontend:
    npm run dev
    
    يجب أن ترى:
    ✅ - ready started server on 0.0.0.0:3000

3️⃣  افتح المتصفح:
    http://localhost:3000/dashboard/home
    
    تحقق من:
    ✅ البطاقات تحمل البيانات الحقيقية
    ✅ Modals تفتح وتعرض البيانات
    ✅ لا توجد أخطاء في Console

4️⃣  للاختبار الشامل:
    اقرأ: INTEGRATION_TESTING_GUIDE.md
    
📚 للمزيد من المعلومات:
   - QUICK_START.md (دليل البدء السريع)
   - NEXT_IMPLEMENTATION_STEPS.md (الخطوات الفعلية)
   - PROJECT_STATUS_DASHBOARD.md (حالة المشروع)
" -ForegroundColor Green
    }
    
    "2" {
        Write-Host "`n🚀 جاري تشغيل Frontend فقط..." -ForegroundColor Cyan
        Write-Host "`n⚠️  تأكد من تشغيل Mock API أولاً!" -ForegroundColor Yellow
        Write-Host "   (في Terminal آخر: cd mock-api && npm start)" -ForegroundColor Yellow
        
        # التحقق من المكتبات
        if (-not (Test-Path "./node_modules")) {
            Write-Host "`n📦 تثبيت Frontend dependencies..." -ForegroundColor Yellow
            npm install
        }
        
        # تكوين .env.local
        if (-not (Test-Path ".env.local")) {
            @"
NEXT_PUBLIC_API_URL=http://localhost:3001
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
            Write-Host "✅ تم إنشاء .env.local" -ForegroundColor Green
        }
        
        Write-Host "`n🚀 تشغيل Frontend..." -ForegroundColor Green
        npm run dev
    }
    
    "3" {
        Write-Host "`n🚀 جاري تشغيل Mock API فقط..." -ForegroundColor Cyan
        
        if (-not (Test-Path "./mock-api")) {
            Write-Host "`n📦 جاري إنشاء Mock API..." -ForegroundColor Yellow
            bash setup-mock-api.sh
            
            Push-Location ./mock-api
            Write-Host "`n📦 تثبيت المكتبات..." -ForegroundColor Yellow
            npm install
            Pop-Location
        }
        
        if (-not (Test-Path "./mock-api/node_modules")) {
            Write-Host "`n📦 تثبيت مكتبات Mock API..." -ForegroundColor Yellow
            Push-Location ./mock-api
            npm install
            Pop-Location
        }
        
        Write-Host "`n🚀 تشغيل Mock API..." -ForegroundColor Green
        Push-Location ./mock-api
        npm start
        Pop-Location
    }
    
    "4" {
        Write-Host "`n📖 فتح دليل البدء السريع..." -ForegroundColor Cyan
        if (Test-Path "QUICK_START.md") {
            # محاولة فتح الملف مع محرر
            if ($IsWindows) {
                Invoke-Item "QUICK_START.md"
            } else {
                Write-Host "اقرأ الملف: QUICK_START.md" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ لم يتم العثور على QUICK_START.md" -ForegroundColor Red
        }
    }
    
    "5" {
        Write-Host "`n🧪 تشغيل الاختبارات..." -ForegroundColor Cyan
        
        # التحقق من المكتبات
        if (-not (Test-Path "./node_modules")) {
            Write-Host "`n📦 تثبيت Frontend dependencies..." -ForegroundColor Yellow
            npm install
        }
        
        Write-Host "`n🧪 تشغيل الاختبارات..." -ForegroundColor Green
        npm run test
    }
    
    default {
        Write-Host "`n❌ تم الإلغاء" -ForegroundColor Red
        exit 0
    }
}

Write-Host "`n✅ انتهى السكريبت" -ForegroundColor Green
