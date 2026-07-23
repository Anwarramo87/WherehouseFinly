# Development Guide - تشغيل المشروع محلياً

## Quick Start - البداية السريعة

### Option 1: Automatic (Recommended) - تشغيل تلقائي

Simply double-click the file:
```
start-both.ps1
```

This will open 2 terminal windows:
- Backend (port 5003)
- Frontend (port 3000)

### Option 2: Manual - تشغيل يدوي

#### Start Backend First:
```powershell
cd C:\Users\BootCamp\Downloads\anwarfinly\back\werehouse\backend-nest
npm run start:dev
```

#### Then Start Frontend:
```powershell
cd C:\Users\BootCamp\Downloads\anwarfinly\front\Factory
npm run dev
```

## Access URLs - الروابط

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5003
- **Backend Docs**: http://localhost:5003/api

## Troubleshooting - حل المشاكل

### WebSocket Connection Failed
**Problem**: `WebSocket connection to 'ws://localhost:5003/socket.io/...' failed`

**Solution**: Make sure backend is running on port 5003
```powershell
cd C:\Users\BootCamp\Downloads\anwarfinly\back\werehouse\backend-nest
npm run start:dev
```

### CSS/Print Styles Not Loading
**Fixed**: Print styles are now inline in `globals.css`

### Theme Color Warning
**Fixed**: themeColor moved to viewport export

## Environment Variables

Make sure `.env` exists in backend folder:
```
DATABASE_URL=your_database_url
JWT_SECRET=your_secret
DEVICE_API_KEY=your_key
```

## Production Deployment

Frontend is auto-deployed to Vercel:
https://wherehouse-finly.vercel.app

Backend needs to be deployed separately (Railway, Render, etc.)
