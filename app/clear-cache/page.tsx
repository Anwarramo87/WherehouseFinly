'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearCachePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'clearing' | 'success' | 'error'>('clearing');

  useEffect(() => {
    const clearAllCache = async () => {
      try {
        // مسح localStorage
        localStorage.clear();
        
        // مسح sessionStorage
        sessionStorage.clear();
        
        // مسح cookies
        document.cookie.split(';').forEach((cookie) => {
          const name = cookie.split('=')[0].trim();
          document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict`;
        });
        
        // مسح Service Worker cache
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        }
        
        // مسح IndexedDB
        if ('indexedDB' in window) {
          const dbs = await window.indexedDB.databases();
          dbs.forEach((db) => {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          });
        }
        
        setStatus('success');
        
        // إعادة التحميل بعد 2 ثانية
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } catch (error) {
        console.error('Failed to clear cache:', error);
        setStatus('error');
      }
    };

    clearAllCache();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {status === 'clearing' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900">جاري مسح الذاكرة المؤقتة...</h2>
              <p className="mt-2 text-gray-600">الرجاء الانتظار</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="text-green-600 text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-gray-900">تم مسح الذاكرة المؤقتة بنجاح!</h2>
              <p className="mt-2 text-gray-600">سيتم إعادة التوجيه إلى صفحة تسجيل الدخول...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="text-red-600 text-6xl mb-4">✗</div>
              <h2 className="text-2xl font-bold text-gray-900">حدث خطأ</h2>
              <p className="mt-2 text-gray-600">يرجى محاولة مسح الذاكرة المؤقتة يدوياً من المتصفح</p>
              <button
                onClick={() => router.push('/login')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                العودة لتسجيل الدخول
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
