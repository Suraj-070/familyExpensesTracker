# Family Expense Tracker — Feature Setup Guide

This guide covers the 5 new features added:
1. Attachment Upload (Supabase Storage)
2. Supabase Realtime
3. PWA Support
4. Supabase RLS
5. PostgreSQL migration (SQLite → Supabase)

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL**, **anon key**, and **service_role key** from Settings → API
3. Note your **Database Password** from Settings → Database

---

## 2. Install Supabase packages

```bash
npm install @supabase/supabase-js
# or
bun add @supabase/supabase-js
```

---

## 3. Configure environment variables

Copy `.env.example` → `.env` and fill in your Supabase values:

```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

---

## 4. Migrate database (SQLite → PostgreSQL)

Replace `prisma/schema.prisma` with the new file (already done — provider changed to `postgresql`).

```bash
# Push schema to Supabase
npx prisma db push

# Or use migrations
npx prisma migrate dev --name init
```

---

## 5. Apply RLS policies

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/rls-policies.sql`
3. Click Run

This enables RLS on all tables with policies that restrict access by family membership and role.

---

## 6. Create Supabase Storage bucket

### Option A: Dashboard
1. Supabase Dashboard → Storage → New Bucket
2. Name: `expense-attachments`
3. Toggle **Public bucket** ON (so file URLs work without signed URLs)

### Option B: SQL
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-attachments', 'expense-attachments', true);
```

---

## 7. Enable Realtime on tables

Supabase Realtime must be enabled per table:

1. Supabase Dashboard → Database → Replication
2. Enable replication for: `Expense`, `ActivityLog`, `Category`, `Notification`

Or via SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "Expense";
ALTER PUBLICATION supabase_realtime ADD TABLE "ActivityLog";
ALTER PUBLICATION supabase_realtime ADD TABLE "Category";
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
```

---

## 8. PWA Icons

Generate icons for your app:
1. Use your `logo.svg` at [realfavicongenerator.net](https://realfavicongenerator.net) or [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator)
2. Place outputs in `public/icons/`:
   - `public/icons/icon-192.png`
   - `public/icons/icon-512.png`

Quick generation with pwa-asset-generator:
```bash
npx pwa-asset-generator public/logo.svg public/icons --background "#6366f1" --padding "20%"
```

---

## 9. Files changed/added

| File | Change |
|------|--------|
| `src/lib/supabase.ts` | **NEW** — Supabase client (browser + admin) |
| `src/app/api/attachments/route.ts` | **NEW** — Upload/delete attachments via Supabase Storage |
| `src/components/expenses/expense-form.tsx` | **UPDATED** — Real file upload with preview |
| `src/hooks/use-realtime.ts` | **NEW** — Supabase Realtime subscriptions |
| `src/components/providers.tsx` | **UPDATED** — Activates realtime in the app |
| `src/app/layout.tsx` | **UPDATED** — PWA manifest + SW registration |
| `public/manifest.json` | **NEW** — PWA web app manifest |
| `public/sw.js` | **NEW** — Service worker (cache strategies) |
| `prisma/schema.prisma` | **UPDATED** — PostgreSQL provider + directUrl |
| `supabase/rls-policies.sql` | **NEW** — All RLS policies |
| `.env.example` | **UPDATED** — All required env vars |

---

## 10. store/index.ts patch

In `src/store/index.ts`, update `createExpense` to return the new expense ID:

```ts
createExpense: async (data) => {
  const { currentFamily } = get()
  if (!currentFamily) return null
  const res = await API('/api/expenses', {
    method: 'POST',
    body: JSON.stringify({ ...data, familyId: currentFamily.id }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create expense')
  }
  const result = await res.json()
  get().loadExpenses()
  return result.expense?.id ?? null  // ← returns id so form can upload attachments
},
```

Also update the `AppState` interface:
```ts
createExpense: (data: Partial<Expense>) => Promise<string | null>
```
