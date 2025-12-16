# Fix: "Permission denied" Error When Saving Internal Notes

## Problem

University partners receive a "Permission denied (Error: 42501)" error when trying to save internal notes on application cards.

## Root Cause

The database Row Level Security (RLS) policies and/or the `update_application_review` RPC function are either:
1. Missing from the database
2. Not properly configured to allow university partners to update applications

Common issues:
- User's `tenant_id` in the profiles table is NULL
- User's role is 'university' which isn't in the `app_role` enum (should be 'partner')
- The application's program/university isn't properly linked

## Quick Fix

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy the entire contents of `scripts/fix_notes_save_error.sql`
4. Paste into the SQL Editor
5. Click **Run**
6. Refresh your browser and try saving notes again

## What the Fix Does

1. Creates/updates helper functions (`get_user_role`, `get_user_tenant`, `is_university_partner`)
2. Converts any 'university' roles to 'partner' (the correct enum value)
3. Updates RLS policies to allow university partners to update applications to their programs
4. Creates/updates the `update_application_review` RPC function with proper authorization

## Verifying the Fix

After running the SQL script, you can verify it worked by running this query in the SQL Editor:

```sql
-- Check your current user's access (while logged in)
SELECT * FROM debug_application_update_access('YOUR-APPLICATION-ID-HERE');
```

This will show you:
- Your user ID and role
- Whether you're recognized as a university partner
- Your tenant ID
- Whether the application's tenant matches yours
- Whether you should be able to update the application

## Debugging Tenant Issues

If the error persists, check your user's profile:

```sql
-- Find your profile
SELECT id, email, role, tenant_id 
FROM profiles 
WHERE email = 'your-email@example.com';

-- Check the application's tenant
SELECT 
  a.id as app_id,
  p.name as program_name,
  u.name as university_name,
  u.tenant_id as university_tenant_id
FROM applications a
JOIN programs p ON p.id = a.program_id
JOIN universities u ON u.id = p.university_id
WHERE a.id = 'YOUR-APPLICATION-ID';
```

The `tenant_id` from your profile must match the `university_tenant_id` for you to update the application.

## Long-term Solution

Ensure all database migrations are applied to your Supabase project:
- `20251216200000_fix_internal_notes_rls_complete.sql`
- `20260117000000_comprehensive_application_update_fix.sql`

You can apply migrations using the Supabase CLI:
```bash
supabase db push
```
