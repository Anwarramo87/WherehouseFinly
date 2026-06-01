/**
 * Audit Log API Route
 * 
 * Handles audit log creation and retrieval for the Employee Resignation Management System.
 * Implements Requirement 9.4: Audit trail for all termination and rehire operations.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

/**
 * Audit action types
 */
type AuditAction =
  | 'EMPLOYEE_TERMINATED'
  | 'EMPLOYEE_REHIRED'
  | 'FINANCIAL_SETTLEMENT_COMPLETED'
  | 'EMPLOYEE_VIEWED'
  | 'RESIGNED_LIST_EXPORTED'
  | 'AUDIT_LOG_VIEWED';

/**
 * Audit log entry
 */
interface AuditLogEntry {
  id: string;
  action: AuditAction;
  employeeId: string;
  employeeName: string;
  performedBy: string;
  performedByName: string;
  userRole: string;
  timestamp: string;
  details: Record<string, unknown>;
  notes?: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * In-memory audit log storage (in production, this would be a database)
 */
const auditLogStore: AuditLogEntry[] = [];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique ID for audit entries
 */
function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  // Check for forwarded headers (in case of proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Validate user has permission to access audit logs
 */
function hasAuditPermission(userRole: string): boolean {
  const allowedRoles = ['admin', 'hr_manager', 'auditor'];
  return allowedRoles.includes(userRole);
}

/**
 * Validate user has permission to create audit logs
 */
function canCreateAuditLog(userRole: string): boolean {
  const allowedRoles = ['admin', 'hr_manager', 'accountant'];
  return allowedRoles.includes(userRole);
}

// ============================================================================
// GET /api/audit-log
// ============================================================================

/**
 * GET handler - Retrieve audit trail with filtering
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - action: Filter by action type
 * - employeeId: Filter by employee ID
 * - performedBy: Filter by user who performed the action
 * - startDate: Filter by start date (ISO format)
 * - endDate: Filter by end date (ISO format)
 * - search: Search in employee name or notes
 * - sortBy: Sort field (timestamp, action, employeeId)
 * - sortOrder: asc or desc (default: desc)
 * 
 * Returns:
 * - success: boolean
 * - auditLogs: Array of audit log entries
 * - pagination: Pagination info
 */
export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (in production, this would come from auth session)
    const userRole = request.headers.get('x-user-role') || '';
    const userId = request.headers.get('x-user-id') || '';

    // Check permission
    if (!hasAuditPermission(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied. You do not have permission to view audit trail.',
          code: 'PERMISSION_DENIED',
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const action = searchParams.get('action') as AuditAction | null;
    const employeeId = searchParams.get('employeeId');
    const performedBy = searchParams.get('performedBy');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Filter audit logs
    let filteredLogs = [...auditLogStore];

    if (action) {
      filteredLogs = filteredLogs.filter((log) => log.action === action);
    }

    if (employeeId) {
      filteredLogs = filteredLogs.filter((log) => log.employeeId === employeeId);
    }

    if (performedBy) {
      filteredLogs = filteredLogs.filter((log) => log.performedBy === performedBy);
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp) <= end);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.employeeName?.toLowerCase().includes(searchLower) ||
          log.notes?.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }

    // Sort results
    filteredLogs.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'action':
          comparison = a.action.localeCompare(b.action);
          break;
        case 'employeeId':
          comparison = a.employeeId.localeCompare(b.employeeId);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Calculate pagination
    const total = filteredLogs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    // Log the audit log view itself
    const viewLogEntry: AuditLogEntry = {
      id: generateId(),
      action: 'AUDIT_LOG_VIEWED',
      employeeId: '',
      employeeName: '',
      performedBy: userId,
      performedByName: '',
      userRole,
      timestamp: new Date().toISOString(),
      details: {
        filters: { page, limit, action, employeeId, performedBy, startDate, endDate, search },
        resultCount: paginatedLogs.length,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
    };
    auditLogStore.push(viewLogEntry);

    return NextResponse.json({
      success: true,
      auditLogs: paginatedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit trail',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/audit-log
// ============================================================================

/**
 * POST handler - Create a new audit log entry
 * 
 * Request Body:
 * - action: The action type
 * - employeeId: The employee ID (optional)
 * - employeeName: The employee name (optional)
 * - details: Additional details about the action
 * - notes: Optional notes
 * 
 * Returns:
 * - success: boolean
 * - auditLog: The created audit log entry
 */
export async function POST(request: NextRequest) {
  try {
    // Get user info from headers (in production, this would come from auth session)
    const userRole = request.headers.get('x-user-role') || '';
    const userId = request.headers.get('x-user-id') || '';
    const userName = request.headers.get('x-user-name') || '';

    // Check permission
    if (!canCreateAuditLog(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied. You do not have permission to create audit logs.',
          code: 'PERMISSION_DENIED',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Action is required',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Create audit log entry
    const logEntry: AuditLogEntry = {
      id: generateId(),
      action: body.action,
      employeeId: body.employeeId || '',
      employeeName: body.employeeName || '',
      performedBy: userId,
      performedByName: userName,
      userRole,
      timestamp: new Date().toISOString(),
      details: body.details || {},
      notes: body.notes,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Store the entry
    auditLogStore.push(logEntry);

    // Keep only the last 10000 entries in memory
    if (auditLogStore.length > 10000) {
      auditLogStore.shift();
    }

    return NextResponse.json({
      success: true,
      auditLog: logEntry,
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create audit log',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS /api/audit-log
// ============================================================================

/**
 * OPTIONS handler - Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Name, X-User-Role',
    },
  });
}