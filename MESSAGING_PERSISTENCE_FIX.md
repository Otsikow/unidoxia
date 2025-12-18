# Messaging Persistence Fix

## Issue Summary
Messages sent between universities and students were not being persisted due to a database schema mismatch. The `get_or_create_conversation` function was attempting to insert a `role` column into the `conversation_participants` table, but this column didn't exist in the database schema.

Error message: `column "role" of relation "conversation_participants" does not exist`

## Root Cause
1. The original `conversation_participants` table was created without a `role` column
2. A later migration attempted to add the column with `ADD COLUMN IF NOT EXISTS role TEXT`
3. The `get_or_create_conversation` function was referencing the `role` column
4. When the column addition failed or wasn't applied, the function calls would fail

## Solution Applied

### 1. Database Migration (`supabase/migrations/20260221000000_robust_messaging_system_fix.sql`)
A comprehensive migration that:
- Ensures the `role` column exists in `conversation_participants`
- Ensures other required columns (`last_read_at`, `joined_at`) exist
- Creates a robust `get_or_create_conversation` function that works with or without the `role` column
- Sets up proper RLS policies for cross-tenant messaging
- Creates a message audit log for recovery purposes
- Adds a `validate_conversation_integrity` function for diagnostics

### 2. Frontend Improvements (`src/hooks/useMessages.tsx`)
Enhanced the messaging hook with:
- **Retry Logic**: Automatic retry with exponential backoff for failed operations
- **Message Caching**: Local storage backup for pending messages
- **Error Recovery**: Automatic retry of pending messages on next session
- **User-Friendly Errors**: Better error messages for common issues
- **Offline Support**: Cached conversations for quick loading

### 3. UI Enhancements (`src/components/messages/MessagesDashboard.tsx`)
Added:
- Pending message indicator banner
- Manual retry button for failed messages
- Better error states and recovery options

## How to Apply the Fix

### Option 1: Apply via Supabase Migration
The migration will be automatically applied when you push to Supabase:
```bash
npx supabase db push
```

### Option 2: Apply Manually
Run the standalone fix script directly in your Supabase SQL editor:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the contents of `scripts/fix_messaging_persistence.sql`
4. Run the script

### Option 3: Using psql
```bash
psql -f scripts/fix_messaging_persistence.sql
```

## Verification

After applying the fix, run the diagnostic script to verify:
```bash
psql -f scripts/diagnose_messaging.sql
```

Or run it in the Supabase SQL Editor.

## Message Recovery

### Automatic Recovery
The frontend now automatically:
1. Caches conversations for offline access
2. Stores failed messages locally
3. Retries sending pending messages on app reload

### Manual Recovery
If messages were lost:
1. Check the `message_audit_log` table (admin only) for message history
2. Use the `recover_deleted_messages(conversation_id)` function to find recoverable messages

### For Existing Lost Messages
Unfortunately, if messages were never successfully inserted into the database, they cannot be recovered from the server. However:
- New messages will be properly persisted
- Failed messages will be retried automatically
- The UI shows pending messages and allows manual retry

## Testing the Fix

1. **Send a test message** from a university user to a student
2. **Refresh the page** - the message should persist
3. **Check both sides** - both university and student should see the message
4. **Test offline** - disconnect network, send message, reconnect - message should be delivered

## Files Changed

- `supabase/migrations/20260221000000_robust_messaging_system_fix.sql` - Main database fix
- `src/hooks/useMessages.tsx` - Enhanced messaging hook
- `src/components/messages/MessagesDashboard.tsx` - UI improvements
- `scripts/fix_messaging_persistence.sql` - Standalone fix script
- `scripts/diagnose_messaging.sql` - Diagnostic script

## Monitoring

Watch for these log messages:
- "Successfully sent pending message" - Pending message retry succeeded
- "Failed to retry pending message" - Retry failed, will try again later
- "Messaging bootstrap failed" - Initial load issue, check connection

## Future Improvements

The system now includes:
- Message audit trail for debugging
- Conversation integrity validation
- Automatic schema repair
- Cross-tenant messaging support for universities

This should prevent similar issues in the future and make the messaging system robust for full operation.
