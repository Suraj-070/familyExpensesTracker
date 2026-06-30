-- ============================================================
-- Family Expense Tracker — Supabase Row Level Security (RLS)
-- Run this in the Supabase SQL Editor after pushing your schema.
-- ============================================================

-- NOTE: This app uses a custom JWT (not Supabase Auth).
-- RLS uses the userId embedded in your app's JWT, passed as a
-- Supabase session variable: set app.current_user_id = '<userId>'
-- The API routes must set this before any query (see supabase-server.ts).
-- Alternatively, if you switch to Supabase Auth, replace
-- get_current_user_id() with auth.uid()::text throughout.

-- Helper function: get the current user's ID from the session variable
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
  SELECT current_setting('app.current_user_id', TRUE);
$$ LANGUAGE sql STABLE;

-- Helper function: check if a user is a member of a family
CREATE OR REPLACE FUNCTION is_family_member(p_family_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "FamilyMember"
    WHERE "familyId" = p_family_id AND "userId" = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: check if a user is an admin of a family
CREATE OR REPLACE FUNCTION is_family_admin(p_family_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "FamilyMember"
    WHERE "familyId" = p_family_id AND "userId" = p_user_id AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Family"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FamilyMember"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringExpense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Permission"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog"      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- User table — can only read/write own row
-- ============================================================
CREATE POLICY "user_select_own" ON "User"
  FOR SELECT USING (id = get_current_user_id());

CREATE POLICY "user_update_own" ON "User"
  FOR UPDATE USING (id = get_current_user_id());

-- ============================================================
-- Family — members can read, only creator can update/delete
-- ============================================================
CREATE POLICY "family_select_member" ON "Family"
  FOR SELECT USING (
    is_family_member(id, get_current_user_id())
  );

CREATE POLICY "family_insert_auth" ON "Family"
  FOR INSERT WITH CHECK (
    "createdBy" = get_current_user_id()
  );

CREATE POLICY "family_update_admin" ON "Family"
  FOR UPDATE USING (
    is_family_admin(id, get_current_user_id())
  );

CREATE POLICY "family_delete_creator" ON "Family"
  FOR DELETE USING (
    "createdBy" = get_current_user_id()
  );

-- ============================================================
-- FamilyMember — members can see their family's member list
-- ============================================================
CREATE POLICY "familymember_select_member" ON "FamilyMember"
  FOR SELECT USING (
    is_family_member("familyId", get_current_user_id())
  );

CREATE POLICY "familymember_insert_self" ON "FamilyMember"
  FOR INSERT WITH CHECK (
    "userId" = get_current_user_id()
    OR is_family_admin("familyId", get_current_user_id())
  );

CREATE POLICY "familymember_delete_admin_or_self" ON "FamilyMember"
  FOR DELETE USING (
    "userId" = get_current_user_id()
    OR is_family_admin("familyId", get_current_user_id())
  );

CREATE POLICY "familymember_update_admin" ON "FamilyMember"
  FOR UPDATE USING (
    is_family_admin("familyId", get_current_user_id())
  );

-- ============================================================
-- Expense — family members can read; write depends on role
-- ============================================================
CREATE POLICY "expense_select_member" ON "Expense"
  FOR SELECT USING (
    is_family_member("familyId", get_current_user_id())
  );

CREATE POLICY "expense_insert_member" ON "Expense"
  FOR INSERT WITH CHECK (
    is_family_member("familyId", get_current_user_id())
    AND "addedById" = get_current_user_id()
  );

-- Admin can edit all; member can edit own
CREATE POLICY "expense_update_own_or_admin" ON "Expense"
  FOR UPDATE USING (
    is_family_admin("familyId", get_current_user_id())
    OR "addedById" = get_current_user_id()
  );

-- Admin can delete all; member can delete own
CREATE POLICY "expense_delete_own_or_admin" ON "Expense"
  FOR DELETE USING (
    is_family_admin("familyId", get_current_user_id())
    OR "addedById" = get_current_user_id()
  );

-- ============================================================
-- Category — family members can read; admin can write
-- ============================================================
CREATE POLICY "category_select_member" ON "Category"
  FOR SELECT USING (
    is_family_member("familyId", get_current_user_id())
  );

CREATE POLICY "category_insert_admin" ON "Category"
  FOR INSERT WITH CHECK (
    is_family_admin("familyId", get_current_user_id())
  );

CREATE POLICY "category_update_admin" ON "Category"
  FOR UPDATE USING (
    is_family_admin("familyId", get_current_user_id())
  );

CREATE POLICY "category_delete_admin" ON "Category"
  FOR DELETE USING (
    is_family_admin("familyId", get_current_user_id())
  );

-- ============================================================
-- RecurringExpense — family members can read; admin can write
-- ============================================================
CREATE POLICY "recurring_select_member" ON "RecurringExpense"
  FOR SELECT USING (
    is_family_member("familyId", get_current_user_id())
  );

CREATE POLICY "recurring_insert_admin" ON "RecurringExpense"
  FOR INSERT WITH CHECK (
    is_family_admin("familyId", get_current_user_id())
  );

CREATE POLICY "recurring_update_admin" ON "RecurringExpense"
  FOR UPDATE USING (
    is_family_admin("familyId", get_current_user_id())
  );

CREATE POLICY "recurring_delete_admin" ON "RecurringExpense"
  FOR DELETE USING (
    is_family_admin("familyId", get_current_user_id())
  );

-- ============================================================
-- Attachment — member of the expense's family can read;
--              uploader or admin can delete
-- ============================================================
CREATE POLICY "attachment_select_member" ON "Attachment"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Expense" e
      WHERE e.id = "expenseId"
      AND is_family_member(e."familyId", get_current_user_id())
    )
  );

CREATE POLICY "attachment_insert_member" ON "Attachment"
  FOR INSERT WITH CHECK (
    "uploadedBy" = get_current_user_id()
    AND EXISTS (
      SELECT 1 FROM "Expense" e
      WHERE e.id = "expenseId"
      AND is_family_member(e."familyId", get_current_user_id())
    )
  );

CREATE POLICY "attachment_delete_uploader_or_admin" ON "Attachment"
  FOR DELETE USING (
    "uploadedBy" = get_current_user_id()
    OR EXISTS (
      SELECT 1 FROM "Expense" e
      WHERE e.id = "expenseId"
      AND is_family_admin(e."familyId", get_current_user_id())
    )
  );

-- ============================================================
-- Notification — users can only see their own
-- ============================================================
CREATE POLICY "notification_select_own" ON "Notification"
  FOR SELECT USING ("userId" = get_current_user_id());

CREATE POLICY "notification_update_own" ON "Notification"
  FOR UPDATE USING ("userId" = get_current_user_id());

CREATE POLICY "notification_insert_member" ON "Notification"
  FOR INSERT WITH CHECK (
    is_family_member("familyId", get_current_user_id())
  );

-- ============================================================
-- Permission — family members can read; admin can write
-- ============================================================
CREATE POLICY "permission_select_member" ON "Permission"
  FOR SELECT USING (
    is_family_member("familyId", get_current_user_id())
  );

CREATE POLICY "permission_write_admin" ON "Permission"
  FOR ALL USING (
    is_family_admin("familyId", get_current_user_id())
  );

-- ============================================================
-- ActivityLog — family members can read; inserts from members
-- ============================================================
CREATE POLICY "activity_select_member" ON "ActivityLog"
  FOR SELECT USING (
    is_family_member("familyId", get_current_user_id())
  );

CREATE POLICY "activity_insert_member" ON "ActivityLog"
  FOR INSERT WITH CHECK (
    is_family_member("familyId", get_current_user_id())
    AND "userId" = get_current_user_id()
  );

-- ============================================================
-- Storage: expense-attachments bucket policies
-- Run these via Supabase dashboard → Storage → Policies
-- or use the Supabase JS admin client.
-- ============================================================

-- Allow authenticated family members to upload
-- (enforced in API route — storage itself uses service key)

-- Public read for attachment URLs (since we use getPublicUrl)
-- Enable "Public bucket" on the expense-attachments bucket in the dashboard,
-- OR create a storage policy:

-- INSERT INTO storage.buckets (id, name, public) VALUES ('expense-attachments', 'expense-attachments', true);

-- If you want private URLs instead, set public=false and use createSignedUrl() in the API.
