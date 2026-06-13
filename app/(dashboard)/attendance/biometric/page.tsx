'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
} from 'lucide-react';

interface DeviceStatus {
  mode: 'simulator' | 'hardware';
  connected: boolean;
  deviceIp?: string;
  devicePort?: number;
}

interface AttendanceLog {
  employeeId: string;
  timestamp: string;
  type: 'check-in' | 'check-out';
  metrics: {
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    overtimeMinutes?: number;
  };
}

interface SyncResult {
  success: boolean;
  synced: number;
  skipped: number;
  errors: number;
  logs: AttendanceLog[];
}

export default function BiometricDashboard() {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchDeviceStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/biometric/sync');
      const data = await response.json();
      setDeviceStatus(data);
    } catch (error) {
      console.error('Failed to fetch device status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load device status
  useEffect(() => {
    fetchDeviceStatus();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/biometric/sync', {
        method: 'POST',
      });
      const data = await response.json();
      setSyncResult(data);
      await fetchDeviceStatus();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ar-SY', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🔐 مراقبة البصمة الحية</h1>
          <p className="text-muted-foreground">
            نظام مزامنة جهاز ZKTeco البيومتري في الوقت الفعلي
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} size="lg">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
        </Button>
      </div>

      {/* Device Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {deviceStatus?.connected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            حالة الجهاز
          </CardTitle>
          <CardDescription>معلومات الاتصال بجهاز البصمة</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : deviceStatus ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">الوضع:</span>
                <Badge variant={deviceStatus.mode === 'simulator' ? 'secondary' : 'default'}>
                  {deviceStatus.mode === 'simulator' ? '🧪 محاكي' : '🔌 جهاز فعلي'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">الحالة:</span>
                <Badge variant={deviceStatus.connected ? 'success' : 'destructive'}>
                  {deviceStatus.connected ? 'متصل' : 'غير متصل'}
                </Badge>
              </div>
              {deviceStatus.deviceIp && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">IP:</span>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {deviceStatus.deviceIp}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Port:</span>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {deviceStatus.devicePort}
                    </code>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>فشل تحميل حالة الجهاز</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResult && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مزامن بنجاح</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{syncResult.synced}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مكرر (متخطى)</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{syncResult.skipped}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">أخطاء</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{syncResult.errors}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي السجلات</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {syncResult.synced + syncResult.skipped + syncResult.errors}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Logs */}
          <Card>
            <CardHeader>
              <CardTitle>سجلات الحضور المزامنة</CardTitle>
              <CardDescription>تفاصيل كل سجل تم مزامنته من الجهاز</CardDescription>
            </CardHeader>
            <CardContent>
              {syncResult.logs.length > 0 ? (
                <div className="space-y-3">
                  {syncResult.logs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-sm">{log.employeeId}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{formatTime(log.timestamp)}</span>
                        </div>
                        <Badge
                          variant={log.type === 'check-in' ? 'default' : 'secondary'}
                          className={
                            log.type === 'check-in'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {log.type === 'check-in' ? '📥 دخول' : '📤 خروج'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        {log.metrics.lateMinutes && log.metrics.lateMinutes > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            تأخير {log.metrics.lateMinutes} دقيقة
                          </Badge>
                        )}
                        {log.metrics.earlyLeaveMinutes && log.metrics.earlyLeaveMinutes > 0 && (
                          <Badge variant="warning" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            مغادرة مبكرة {log.metrics.earlyLeaveMinutes} دقيقة
                          </Badge>
                        )}
                        {log.metrics.overtimeMinutes && log.metrics.overtimeMinutes > 0 && (
                          <Badge
                            variant="success"
                            className="gap-1 bg-purple-100 text-purple-800"
                          >
                            <TrendingUp className="h-3 w-3" />
                            إضافي {log.metrics.overtimeMinutes} دقيقة
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>لا توجد سجلات جديدة للعرض</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
