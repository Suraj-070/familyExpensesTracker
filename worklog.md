# Worklog

## API Routes Implementation - Family Expense Tracker

### Date: $(date -u +%Y-%m-%d)

### Summary
Built complete backend API for the Family Expense Tracker application with 18 route files covering authentication, families, expenses, categories, recurring expenses, notifications, reports, activity logs, and permissions.

### Files Created

#### Core Library
- `src/lib/auth.ts` — Authentication utilities (password hashing, token generation/verification, auth extraction, invite code generation)

#### API Routes
1. **Auth** (`src/app/api/auth/route.ts`)
   - `POST /api/auth` — Login (action: "login"), Signup (action: "signup"), Forgot (action: "forgot")
   - `GET /api/auth/me` — Get current user with family memberships
   - `PUT /api/auth/profile` — Update user name/avatar

2. **Families** (`src/app/api/families/route.ts`)
   - `POST /api/families` — Create family (seeds 12 default categories + admin/member permissions) or Join family (action: "join" with inviteCode)
   - `GET /api/families` — List user's families with member/expense counts

3. **Family Members** (`src/app/api/families/[id]/members/route.ts`)
   - `GET /api/families/[id]/members` — List family members with user details

4. **Member Management** (`src/app/api/families/members/[memberId]/route.ts`)
   - `DELETE` — Remove member (admin only, cannot remove creator)
   - `PUT` — Update member role (admin only, cannot demote creator)

5. **Expenses** (`src/app/api/expenses/route.ts`)
   - `GET` — List expenses with filters (familyId, category, paidStatus, dateFrom, dateTo, search, addedBy, whoPaid, pagination)
   - `POST` — Create expense with activity log

6. **Single Expense** (`src/app/api/expenses/[id]/route.ts`)
   - `GET` — Get single expense with attachments
   - `PUT` — Update expense (owner or admin)
   - `DELETE` — Delete expense (owner or admin) with activity log

7. **Expense Pay Toggle** (`src/app/api/expenses/[id]/pay/route.ts`)
   - `PATCH` — Mark expense as paid/unpaid

8. **Categories** (`src/app/api/categories/route.ts`)
   - `GET` — List categories with expense counts (admin only for create)
   - `POST` — Create custom category (admin only)

9. **Single Category** (`src/app/api/categories/[id]/route.ts`)
   - `PUT` — Update category (admin only)
   - `DELETE` — Delete category (admin only, only if no expenses)

10. **Recurring Expenses** (`src/app/api/recurring/route.ts`)
    - `GET` — List recurring expenses
    - `POST` — Create recurring expense (admin only) with auto-calculated next due date

11. **Single Recurring** (`src/app/api/recurring/[id]/route.ts`)
    - `PUT` — Update recurring expense (admin only)
    - `DELETE` — Delete recurring expense (admin only)

12. **Notifications** (`src/app/api/notifications/route.ts`)
    - `GET` — List user's notifications with unread count

13. **Notification Read** (`src/app/api/notifications/[id]/read/route.ts`)
    - `PUT` — Mark single notification as read

14. **Notifications Read All** (`src/app/api/notifications/read-all/route.ts`)
    - `PUT` — Mark all notifications as read

15. **Report Summary** (`src/app/api/reports/summary/route.ts`)
    - `GET` — Monthly summary (total, paid, unpaid, member breakdown)

16. **Report By Category** (`src/app/api/reports/by-category/route.ts`)
    - `GET` — Category-wise expense breakdown with percentages

17. **Report Trend** (`src/app/api/reports/trend/route.ts`)
    - `GET` — Monthly spending trend over N months (default 6)

18. **Activity Log** (`src/app/api/activity/route.ts`)
    - `GET` — Recent activity logs

19. **Permissions** (`src/app/api/permissions/route.ts`)
    - `GET` — Get permissions for family/role

20. **Permission Update** (`src/app/api/permissions/[id]/route.ts`)
    - `PUT` — Update permissions (admin only)

#### Seed Script
- `scripts/seed.ts` — Creates 3 demo users, 1 family with 12 categories, 17 sample expenses across 3 months, 2 recurring expenses

### Key Design Decisions
- **Auth**: SHA-256 + salt password hashing, HMAC-SHA256 signed tokens (JWT-like, base64url encoded)
- **Activity Logging**: All mutations (create, update, delete, pay toggle, member changes) create activity log entries
- **Permissions**: Role-based (admin/member) with granular boolean flags for 11 different actions
- **Transactions**: Critical multi-step operations use Prisma transactions for data consistency
- **Filtering**: Expenses support 7 different filter parameters with pagination
- **Reports**: Three endpoints covering summary, category breakdown, and trend analysis

### Demo Data
- **Users**: john@demo.com, jane@demo.com, bob@demo.com (all: password123)
- **Family**: "Doe Family" with invite code generated at seed time
- **Expenses**: 17 expenses spanning 3 months across multiple categories

### Lint Status
✅ All files pass `bun run lint` with no errors