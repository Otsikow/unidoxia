# Fix: Internal Notes & Messaging Persistence Issues

## Problem

1. **Internal Notes Not Saving**: University partners receive "Permission denied" errors or notes silently fail to persist.
2. **Messages Not Persisting**: Messages sent to students disappear after refresh or aren't visible to students.

## Root Causes

1. **Permissions**: University users often have roles (`university`) that map incorrectly or face RLS policy restrictions.
2. **Messaging RLS**: Conversation participants might not be correctly added or RLS policies prevent viewing messages.
3. **Tenant Context**: Mismatches between user tenant and application/conversation tenant can cause lookup failures.

## Solution

A comprehensive SQL migration has been created at `supabase/migrations/20260127000000_fix_persistence_issues.sql`.

This migration:
1. **Fixes Permissions**:
   - Converts `university` roles to `partner`.
   - Updates `get_user_role` to correctly map roles.
   - Updates RLS policies for `applications` table.
   - Recreates `update_application_review` RPC with proper authorization logic.

2. **Fixes Messaging**:
   - Updates `get_or_create_conversation` to ensure participants are correctly added/updated.
   - Updates RLS policies for `conversation_participants` and `conversation_messages` to ensure visibility.
   - Adds `debug_conversation_access` helper.

## How to Apply

1. **Run the Migration**:
   Use the Supabase CLI to push the migration:
   ```bash
   supabase db push
   ```
   
   OR

   Copy the contents of `supabase/migrations/20260127000000_fix_persistence_issues.sql` and run it in the Supabase SQL Editor.

2. **Verify Fix**:
   - **Notes**: Try saving internal notes on an application.
   - **Messages**: Send a message from the application review dialog. Refresh the page. Check if it persists.
   
   If issues persist, run the debug functions in SQL Editor:
   ```sql
   -- Check notes access
   SELECT * FROM debug_notes_access('APPLICATION_ID');

   -- Check conversation access
   SELECT * FROM debug_conversation_access('YOUR_USER_ID', 'STUDENT_USER_ID');
   ```
