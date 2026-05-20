#!/bin/bash
# setup-mock-api.sh
# إعداد Mock API للاختبار بدون الـ Backend الحقيقي

echo "🚀 جاري إعداد Mock API Server..."

# إنشاء مجلد للـ Mock API
mkdir -p mock-api
cd mock-api

# إنشاء package.json
cat > package.json << 'EOF'
{
  "name": "factory-mock-api",
  "version": "1.0.0",
  "description": "Mock API Server for Factory Management System",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
EOF

# إنشاء Mock Server
cat > server.js << 'EOF'
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'test-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Mock Database
const mockDB = {
  employees: [
    {
      id: "507f1f77bcf86cd799439011",
      employeeId: "EMP001",
      name: "أحمد محمود",
      email: "ahmad@factory.com",
      phone: "+963912345678",
      jobTitle: "عامل إنتاج",
      department: "الإنتاج",
      status: "active",
      hourlyRate: { $numberDecimal: "150.00" },
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      hireDate: "2024-01-15T00:00:00Z",
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2026-05-12T14:00:00Z"
    },
    {
      id: "507f1f77bcf86cd799439012",
      employeeId: "EMP002",
      name: "سارة علي",
      email: "sara@factory.com",
      jobTitle: "موظفة إدارية",
      department: "الإدارة",
      status: "active",
      hourlyRate: { $numberDecimal: "120.00" },
      scheduledStart: "08:30",
      scheduledEnd: "16:30",
      hireDate: "2024-02-10T00:00:00Z",
      createdAt: "2024-02-10T10:00:00Z",
      updatedAt: "2026-05-12T14:00:00Z"
    },
    {
      id: "507f1f77bcf86cd799439013",
      employeeId: "EMP003",
      name: "علي حسن",
      email: "ali@factory.com",
      jobTitle: "عامل توزيع",
      department: "التوزيع",
      status: "on-leave",
      hourlyRate: { $numberDecimal: "140.00" },
      scheduledStart: "06:00",
      scheduledEnd: "14:00",
      hireDate: "2023-06-01T00:00:00Z",
      createdAt: "2023-06-01T09:00:00Z",
      updatedAt: "2026-05-12T14:00:00Z"
    },
    {
      id: "507f1f77bcf86cd799439014",
      employeeId: "EMP004",
      name: "Anwar",
      email: "anwar@factory.com",
      phone: "+963933333333",
      jobTitle: "عامل مخزن",
      department: "الإنتاج",
      status: "active",
      hourlyRate: { $numberDecimal: "145.00" },
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      hireDate: "2025-03-01T00:00:00Z",
      createdAt: "2025-03-01T09:15:00Z",
      updatedAt: "2026-05-18T10:00:00Z"
    },
    {
      id: "507f1f77bcf86cd799439015",
      employeeId: "EMP005",
      name: "Abd",
      email: "abd@factory.com",
      phone: "+963944444444",
      jobTitle: "موظف إداري",
      department: "الإدارة",
      status: "active",
      hourlyRate: { $numberDecimal: "130.00" },
      scheduledStart: "08:30",
      scheduledEnd: "16:30",
      hireDate: "2025-04-15T00:00:00Z",
      createdAt: "2025-04-15T09:00:00Z",
      updatedAt: "2026-05-18T10:00:00Z"
    }
  ],
  
  attendance: [
    {
      id: "607f1f77bcf86cd799439011",
      employeeId: "EMP001",
      type: "IN",
      timestamp: "2026-05-12T08:05:30Z",
      location: "Main Gate",
      device: "Biometric Device #1"
    },
    {
      id: "607f1f77bcf86cd799439012",
      employeeId: "EMP002",
      type: "IN",
      timestamp: "2026-05-12T08:45:00Z",
      location: "Main Gate",
      device: "Biometric Device #1"
    },
    {
      id: "607f1f77bcf86cd799439013",
      employeeId: "EMP001",
      type: "OUT",
      timestamp: "2026-05-12T16:15:45Z",
      location: "Main Gate",
      device: "Biometric Device #1"
    }
  ],
  
  advances: [
    {
      id: "707f1f77bcf86cd799439011",
      employeeId: "EMP001",
      totalAmount: { $numberDecimal: "500000.00" },
      remainingAmount: { $numberDecimal: "250000.00" },
      installments: 2,
      issueDate: "2026-05-01T00:00:00Z",
      dueDate: "2026-07-01T00:00:00Z",
      status: "approved",
      reason: "احتياجات شخصية",
      approvedBy: "HR001",
      notes: "موافقة مدير الموارد البشرية",
      createdAt: "2026-05-01T10:00:00Z"
    }
  ],
  
  penalties: [
    {
      id: "807f1f77bcf86cd799439011",
      employeeId: "EMP002",
      amount: { $numberDecimal: "50000.00" },
      category: "tardiness",
      reason: "تأخير متكرر",
      issueDate: "2026-05-10T00:00:00Z",
      notes: "إنذار رسمي"
    }
  ]
};

// Middleware: JWT Verification
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: "توكن غير موجود", code: "UNAUTHORIZED" }
    });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: { message: "توكن غير صحيح", code: "UNAUTHORIZED" }
    });
  }
}

// Routes

// 🔓 Public Routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { message: "بريد أو كلمة مرور مفقودة", code: "VALIDATION_ERROR" }
    });
  }
  
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    success: true,
    data: { token, user: { email, role: 'admin' } }
  });
});

// 🔒 Protected Routes
app.use(verifyToken);

// Employees
app.get('/api/employees', (req, res) => {
  const { status, department, page = 1, limit = 20 } = req.query;
  
  let data = mockDB.employees;
  
  if (status) {
    data = data.filter(e => e.status === status);
  }
  if (department) {
    data = data.filter(e => e.department === department);
  }
  
  const total = data.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginatedData = data.slice(start, start + limit);
  
  res.json({
    success: true,
    data: { employees: paginatedData },
    pagination: { current: parseInt(page), pages, total, limit }
  });
});

app.get('/api/employees/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalEmployees: mockDB.employees.length,
      activeEmployees: mockDB.employees.filter(e => e.status === 'active').length,
      terminatedEmployees: mockDB.employees.filter(e => e.status === 'terminated').length,
      onLeave: mockDB.employees.filter(e => e.status === 'on-leave').length,
      byDepartment: {
        "الإنتاج": 1,
        "الإدارة": 1,
        "التوزيع": 1
      }
    }
  });
});

app.get('/api/employees/:id', (req, res) => {
  const employee = mockDB.employees.find(e => e.employeeId === req.params.id);
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      error: { message: "الموظف غير موجود", code: "NOT_FOUND" }
    });
  }
  
  res.json({ success: true, data: employee });
});

app.post('/api/employees', (req, res) => {
  const { employeeId, name, email, jobTitle, department, hourlyRate } = req.body;
  
  if (!employeeId || !name || !email) {
    return res.status(400).json({
      success: false,
      error: { message: "حقول مطلوبة مفقودة", code: "VALIDATION_ERROR" }
    });
  }
  
  if (!employeeId.match(/^EMP\d{3,}$/)) {
    return res.status(400).json({
      success: false,
      error: { message: "صيغة employeeId غير صحيحة: EMP + 3+ أرقام", code: "VALIDATION_ERROR" }
    });
  }
  
  const newEmployee = {
    id: Math.random().toString(36).substr(2, 9),
    employeeId,
    name,
    email,
    jobTitle: jobTitle || "موظف",
    department: department || "عام",
    status: "active",
    hourlyRate: { $numberDecimal: String(hourlyRate) },
    scheduledStart: "08:00",
    scheduledEnd: "16:00",
    hireDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockDB.employees.push(newEmployee);
  
  res.status(201).json({ success: true, data: newEmployee });
});

// Attendance
app.get('/api/attendance', (req, res) => {
  const { date, limit = 100 } = req.query;
  
  const records = date 
    ? mockDB.attendance.filter(a => a.timestamp.startsWith(date))
    : mockDB.attendance;
  
  res.json({
    success: true,
    data: { records: records.slice(0, limit) },
    pagination: { current: 1, pages: 1, total: records.length, limit }
  });
});

app.get('/api/attendance/alerts', (req, res) => {
  res.json({
    success: true,
    data: {
      alerts: [
        {
          employeeId: "EMP002",
          name: "سارة علي",
          department: "الإدارة",
          status: "late",
          scheduledStart: "08:30",
          checkIn: "2026-05-12T09:00:00Z",
          minutesLate: 30
        }
      ],
      summary: { totalPresent: 2, totalAbsent: 0, totalLate: 1, totalOvertimes: 1 }
    }
  });
});

app.post('/api/attendance', (req, res) => {
  const { employeeId, type, timestamp } = req.body;
  
  if (!employeeId || !type) {
    return res.status(400).json({
      success: false,
      error: { message: "حقول مطلوبة مفقودة", code: "VALIDATION_ERROR" }
    });
  }
  
  const newRecord = {
    id: Math.random().toString(36).substr(2, 9),
    employeeId,
    type,
    timestamp: timestamp || new Date().toISOString(),
    location: "Main Gate",
    device: "Biometric"
  };
  
  mockDB.attendance.push(newRecord);
  
  res.status(201).json({ success: true, data: newRecord });
});

// Advances
app.get('/api/advances', (req, res) => {
  res.json({
    success: true,
    data: mockDB.advances,
    pagination: { current: 1, pages: 1, total: mockDB.advances.length, limit: 20 }
  });
});

app.post('/api/advances', (req, res) => {
  const { employeeId, totalAmount, reason } = req.body;
  
  const newAdvance = {
    id: Math.random().toString(36).substr(2, 9),
    employeeId,
    totalAmount: { $numberDecimal: String(totalAmount) },
    remainingAmount: { $numberDecimal: String(totalAmount) },
    issueDate: new Date().toISOString(),
    status: "pending",
    reason,
    createdAt: new Date().toISOString()
  };
  
  mockDB.advances.push(newAdvance);
  
  res.status(201).json({ success: true, data: newAdvance });
});

// Penalties
app.get('/api/penalties', (req, res) => {
  res.json({
    success: true,
    data: mockDB.penalties,
    pagination: { current: 1, pages: 1, total: mockDB.penalties.length, limit: 20 }
  });
});

app.post('/api/penalties', (req, res) => {
  const { employeeId, amount, category, reason } = req.body;
  
  const newPenalty = {
    id: Math.random().toString(36).substr(2, 9),
    employeeId,
    amount: { $numberDecimal: String(amount) },
    category,
    reason,
    issueDate: new Date().toISOString()
  };
  
  mockDB.penalties.push(newPenalty);
  
  res.status(201).json({ success: true, data: newPenalty });
});

// Salaries & Payroll
app.get('/api/payroll/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      month: "2026-05",
      totalEmployees: mockDB.employees.length,
      totalBasic: { $numberDecimal: "450000000.00" },
      totalOvertimes: { $numberDecimal: "15000000.00" },
      totalAdvances: { $numberDecimal: "50000000.00" },
      totalPenalties: { $numberDecimal: "5000000.00" },
      totalNetSalaries: { $numberDecimal: "410000000.00" },
      paid: mockDB.employees.length - 1,
      pending: 1
    }
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: "OK", timestamp: new Date().toISOString() });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: { message: "خطأ داخلي في الخادم", code: "INTERNAL_ERROR" }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n✅ Mock API Server running on http://localhost:${PORT}`);
  console.log(`\n📝 Test Token: ${jwt.sign({ email: 'test@factory.com' }, JWT_SECRET, { expiresIn: '24h' })}\n`);
});
EOF

echo "✅ تم إنشاء Mock API"
echo ""
echo "الخطوات التالية:"
echo "1. cd mock-api"
echo "2. npm install"
echo "3. npm start"
echo ""
echo "ثم في ملف .env:"
echo "NEXT_PUBLIC_API_URL=http://localhost:3001"
