# Quick Deployment Guide

## 🚀 For Developers

### 1. Pull Latest Changes
```bash
git pull origin main
```

### 2. Update Backend Database
```bash
cd werehouse/backend-nest
npx prisma db push --accept-data-loss
npx prisma generate
```

### 3. Restart Backend
```bash
npm run start:dev
```

### 4. Verify
- Open http://localhost:3000/attendance
- Click "طلب إجازة"
- Create a test leave request
- Should work without errors ✅

---

## 🏭 For Production

### 1. Backup Database First!
```bash
pg_dump your_database > backup_$(date +%Y%m%d).sql
```

### 2. Apply Database Changes
```bash
cd werehouse/backend-nest
npx prisma db push --accept-data-loss
npx prisma generate
```

### 3. Restart Services
```bash
pm2 restart backend
pm2 restart frontend
```

### 4. Verify
- Test leave request creation
- Check logs for errors
- Verify attendance page displays correctly

---

## ⚠️ Rollback (If Needed)

```bash
# 1. Restore database
psql your_database < backup_YYYYMMDD.sql

# 2. Revert code
git revert HEAD

# 3. Restart
pm2 restart all
```

---

## 📋 Quick Checklist

- [ ] Database backed up
- [ ] Prisma schema synced
- [ ] Backend restarted
- [ ] Frontend restarted
- [ ] Leave requests working
- [ ] No console errors
- [ ] Attendance page displays correctly

---

## 🆘 Troubleshooting

### Issue: "column does not exist"
**Solution:** Run `npx prisma db push --accept-data-loss`

### Issue: Backend won't start
**Solution:** Check if port 5001 is available

### Issue: Frontend errors
**Solution:** Clear browser cache and reload

### Issue: 500 errors persist
**Solution:** Check backend logs: `pm2 logs backend`

---

## 📞 Support

If issues persist:
1. Check backend logs
2. Verify database connection
3. Ensure user has `edit_employees` permission
4. Review documentation files

---

**Estimated Deployment Time:** 5-10 minutes  
**Downtime Required:** ~2 minutes (for service restart)  
**Risk Level:** Low (backward compatible)
