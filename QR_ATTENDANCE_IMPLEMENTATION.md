# QR Attendance Implementation Documentation

## Overview

This document describes the implementation of the QR Code Based Attendance Management System for Soma Wellness Yoga.

## Architecture

### Database Changes

#### 1. User Model (`server/models/User.js`)
- Added `attendanceQrToken` field: cryptographically secure unique token for QR-based attendance
- Auto-generates token on user creation via pre-save hook
- Uses `crypto.randomUUID()` with prefix `SW-ATT-`

#### 2. Branch Model (`server/models/Branch.js`)
- New model for branch management
- Fields: name, slug, address, city, state, zipCode, phone, email, image, isActive, isVerified

#### 3. BranchAttendance Model (`server/models/BranchAttendance.js`)
- Separate from existing Attendance model (which handles class attendance)
- Fields: user, branch, scannedBy, attendanceDate, attendanceDay, scannedAt, method, status
- Unique compound index: `{ user: 1, branch: 1, attendanceDay: 1 }` for duplicate prevention

### Constants (`server/shared/constants/user.types.js`)
- Extended `USER_ROLES`: added `branch_manager`, `staff`
- Added `ATTENDANCE_PERMISSIONS`: `attendance.scan`, `attendance.view`, `attendance.manage`
- Added `ROLE_PERMISSIONS` mapping
- Added `BRANCH_ATTENDANCE_STATUSES`: `PRESENT`, `CANCELLED`
- Added `BRANCH_ATTENDANCE_METHODS`: `QR`
- Added `QR_TOKEN_PREFIX`: `SW-ATT-`

### Middleware (`server/middleware/attendancePermission.js`)
- `requirePermission(permission)` - checks role-based permissions
- `requireAttendanceScan()` - shortcut for `attendance.scan`
- `requireAttendanceView()` - shortcut for `attendance.view`
- `requireAttendanceManage()` - shortcut for `attendance.manage`
- `resolveBranch` - resolves branch from request

### Service (`server/services/qrAttendanceService.js`)
- `generateQRToken()` - creates cryptographically secure token
- `ensureQRToken(userId)` - ensures user has QR token
- `getUserByQRToken(qrToken)` - finds user by QR token
- `scanQR({ qrToken, branchId, adminUser })` - core scan logic with validation
- `getAttendanceHistory()` - paginated attendance records
- `getUserAttendanceHistory()` - user's own attendance
- `regenerateQRToken()` - admin-only QR regeneration
- `getAttendanceStats()` - dashboard statistics

### Controller (`server/controllers/attendanceController.js`)
- `getMyAttendanceQR` - user's own QR code
- `scanAttendance` - QR scan endpoint
- `getAttendanceList` - admin attendance list
- `getAttendanceDetail` - single record detail
- `getMyAttendance` - user's own history
- `regenerateQR` - admin QR regeneration
- `getAttendanceStatsController` - dashboard stats
- `getBranchesForScan` - branch selection

### Routes (`server/routes/attendanceRoutes.js`)
| Method | Endpoint | Auth | Permission | Purpose |
|--------|----------|------|------------|---------|
| GET | `/api/users/me/attendance-qr` | User | Authenticated | Get own QR |
| POST | `/api/admin/attendance/scan` | Admin | attendance.scan | Scan QR |
| GET | `/api/admin/attendance` | Admin | attendance.view | List attendance |
| GET | `/api/admin/attendance/:id` | Admin | attendance.view | Detail |
| GET | `/api/admin/attendance/stats` | Admin | attendance.view | Stats |
| GET | `/api/admin/attendance/branches` | Admin | - | Branches |
| GET | `/api/users/me/attendance` | User | Authenticated | Own history |
| POST | `/api/admin/users/:id/regenerate-attendance-qr` | Admin | attendance.manage | Regenerate QR |

### Frontend Components

#### User Profile (`src/components/Profile/MyAttendanceQR.jsx`)
- Displays QR code using `qrcode.react`
- Shows member name and Member ID
- Download QR as PNG

#### Admin Scanner (`src/components/Admin/AttendanceScanner.jsx`)
- Camera-based QR scanning using `html5-qrcode`
- Branch selection dropdown
- Real-time scan feedback
- Success/Error states with auto-return to scanner

#### Admin Dashboard (`src/components/Admin/AttendanceDashboard.jsx`)
- Today/Week/Month attendance counts
- Active members today

#### Admin History (`src/components/Admin/AttendanceHistory.jsx`)
- Paginated table with filters (date, search)
- Detail modal on row click

#### API Services (`src/components/api/AdminServices.js`)
- `getMyAttendanceQR()`
- `scanQRAttendance(payload)`
- `getQRAttendanceList(params)`
- `getQRAttendanceDetail(id)`
- `getQRAttendanceStats(branchId)`
- `getBranchesForScan()`
- `getMyAttendanceHistory(params)`
- `regenerateAttendanceQR(userId)`

### Integration Points

#### Admin Sidebar (`YogaAdmin.jsx`)
- Added `qr-scan` tab (QR Scanner)
- Added `attendance-history` tab (Attendance History)
- Icons: `LuScanLine`, `LuQrCode`

#### Profile Page (`ProfilePage.jsx`)
- Added `MyAttendanceQR` component

### Migration Script (`server/scripts/backfillAttendanceQR.js`)
- Backfills `attendanceQrToken` for existing users
- Safe to run multiple times
- Run: `node server/scripts/backfillAttendanceQR.js`

### Security

1. **QR Token**: Never exposes sensitive data (only random UUID with prefix)
2. **Admin-Only Scanning**: Backend validates role/permission
3. **Branch Validation**: Admin must have valid branch
4. **User Status Check**: Only active users can be checked in
5. **Membership Check**: Only users with active membership
6. **Duplicate Prevention**: Database-level unique index
7. **Audit Logging**: Uses existing `ActivityLog` model

### Timezone Handling
- Uses `Asia/Kolkata` for business date calculations
- `attendanceDay` stored as `YYYY-MM-DD` string for reliable uniqueness

### Testing

#### Backend Tests
```bash
cd server && npm test
```

#### Frontend Tests
```bash
npm run test:frontend
```

### Deployment

1. Run database migration:
   ```bash
   node server/scripts/backfillAttendanceQR.js
   ```

2. Build frontend:
   ```bash
   npm run build
   ```

3. Deploy backend and frontend

4. Verify camera permissions work on production (HTTPS required)

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not working | Ensure HTTPS in production |
| QR not scanning | Check lighting, QR size (250-350px) |
| Duplicate attendance | Check unique index exists |
| Permission denied | Verify admin role has `attendance.scan` |
| Branch not showing | Ensure branch is active in database |

### Future Enhancements

1. Offline scanning with sync
2. Bulk QR generation for events
3. Attendance analytics dashboard
4. Integration with membership pause/expiry
5. Mobile app for staff scanning

## Files Created/Modified

### Backend
- `server/models/User.js` - Added attendanceQrToken field
- `server/models/Branch.js` - New
- `server/models/BranchAttendance.js` - New
- `server/shared/constants/user.types.js` - Extended
- `server/middleware/attendancePermission.js` - New
- `server/services/qrAttendanceService.js` - New
- `server/controllers/attendanceController.js` - New
- `server/routes/attendanceRoutes.js` - New
- `server/scripts/backfillAttendanceQR.js` - New
- `server/server.js` - Mounted attendance routes

### Frontend
- `src/components/Profile/MyAttendanceQR.jsx` - New
- `src/components/Profile/MyAttendanceQR.module.css` - New
- `src/components/Admin/AttendanceScanner.jsx` - New
- `src/components/Admin/AttendanceScanner.module.css` - New
- `src/components/Admin/AttendanceDashboard.jsx` - New
- `src/components/Admin/AttendanceDashboard.module.css` - New
- `src/components/Admin/AttendanceHistory.jsx` - New
- `src/components/Admin/AttendanceHistory.module.css` - New
- `src/components/Profile/ProfilePage.jsx` - Integrated QR
- `src/components/Admin/YogaAdmin.jsx` - Added tabs
- `src/components/api/AdminServices.js` - Added API methods

### Dependencies
- `qrcode.react` - QR code generation
- `html5-qrcode` - Camera-based QR scanning