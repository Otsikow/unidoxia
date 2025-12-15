# University Partner Dashboard Fix - Verification Checklist & Test Plan

## Overview

This document provides a comprehensive verification checklist and test plan for the University Partner Dashboard fixes implemented to address persistent production bugs.

## Root Cause Analysis (Ranked by Likelihood)

### 1. Empty ApplicationReviewDialog UI (CRITICAL - FIXED)
**Problem**: The `ApplicationReviewDialog` component's render method returned an empty `<Dialog>` element with only a comment `{/* UI content intentionally unchanged */}`.
**Impact**: Universities could click "Review" on applications but saw nothing in the dialog.
**Fix**: Implemented complete dialog UI with all tabs (Overview, Student, Documents, Notes, Messages).

### 2. RLS Policy Gaps for school_rep Role (HIGH - FIXED)
**Problem**: Some RLS policies only allowed `partner` role but not `school_rep`, which is also a valid university partner role.
**Impact**: Users with `school_rep` role couldn't view or update applications.
**Fix**: Updated all RLS policies to include both `partner` and `school_rep` roles.

### 3. Missing Document Signed URL Generation (HIGH - FIXED)
**Problem**: The hook used `getPublicUrl` for a private bucket, resulting in broken document links.
**Impact**: Universities couldn't view uploaded documents.
**Fix**: Implemented `getSignedUrl` function that creates time-limited signed URLs for secure document access.

### 4. Status Update Not Persisting (MEDIUM - FIXED)
**Problem**: The status update used an RPC that might not exist, and the fallback direct update could be blocked by RLS.
**Impact**: Status changes appeared temporarily but didn't persist after refresh.
**Fix**: 
- Ensured `update_application_review` RPC exists with proper grants
- Added better error detection and fallback logic
- Improved error messages to help diagnose issues

### 5. Missing Messaging Integration (MEDIUM - FIXED)
**Problem**: No messaging widget existed in the application review dialog.
**Impact**: Universities couldn't communicate with students from the application card.
**Fix**: Added "Messages" tab with ability to send messages to students via `get_or_create_conversation` RPC.

### 6. Missing Document Request Feature (MEDIUM - FIXED)
**Problem**: No UI to request additional documents from students.
**Impact**: Universities couldn't request missing documents.
**Fix**: Added document request form in Documents tab with document type selection and optional notes.

### 7. Storage Bucket Access Policies (LOW - FIXED)
**Problem**: Storage RLS policies didn't include university partner roles for reading application documents.
**Impact**: Even with valid signed URLs, access might be denied.
**Fix**: Added storage policies for `application-documents` and `student-documents` buckets.

## Verification Checklist

### Pre-Deployment Verification

- [ ] Run database migrations successfully
- [ ] Verify PostgREST schema cache is reloaded (NOTIFY pgrst, 'reload config')
- [ ] Confirm no TypeScript compilation errors
- [ ] Confirm no ESLint errors

### Functional Testing

#### 1. Open Application (MUST PASS)

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC-1.1 | University user clicks "Review" on application card | Application detail dialog opens | ⬜ |
| TC-1.2 | Dialog shows all tabs (Overview, Student, Documents, Notes, Messages) | All 5 tabs visible and clickable | ⬜ |
| TC-1.3 | Overview tab shows program name, intake, timeline | Correct data displayed | ⬜ |
| TC-1.4 | Student tab shows personal info, passport, education | Correct student data displayed | ⬜ |
| TC-1.5 | Application with missing student data shows helpful message | "Student details not available" message | ⬜ |

#### 2. Status Update (MUST PASS)

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC-2.1 | Change status from "Submitted" to "Under Review" | Confirmation dialog appears | ⬜ |
| TC-2.2 | Confirm status change | Toast shows "Status updated" | ⬜ |
| TC-2.3 | Refresh page | Status remains "Under Review" in both card and dialog | ⬜ |
| TC-2.4 | Change to "Conditional Offer" | Status persists after refresh | ⬜ |
| TC-2.5 | Verify timeline shows status change events | Timeline entries visible | ⬜ |
| TC-2.6 | Status badge shows correct label (not DB enum value) | "Under Review" not "screening" | ⬜ |

#### 3. Documents (MUST PASS)

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC-3.1 | View Documents tab | List of uploaded documents shown | ⬜ |
| TC-3.2 | Click "View" on a document | Document opens in new tab | ⬜ |
| TC-3.3 | Missing required documents shown | "Missing Documents" card visible | ⬜ |
| TC-3.4 | Document verification badge shows correct status | "Verified" or "Pending Review" | ⬜ |

#### 4. Document Request (MUST PASS)

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC-4.1 | Select document type and click "Send Request" | Toast shows "Document requested" | ⬜ |
| TC-4.2 | Student receives notification | Request appears in student's document requests | ⬜ |
| TC-4.3 | Request status shows in university view | Request appears in Document Requests page | ⬜ |

#### 5. Messaging (MUST PASS)

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC-5.1 | Open Messages tab | Message input visible | ⬜ |
| TC-5.2 | Send message to student | Toast shows "Message sent" | ⬜ |
| TC-5.3 | Student receives message | Message appears in student's inbox | ⬜ |
| TC-5.4 | Student replies | Reply visible in university messages | ⬜ |

#### 6. RLS Security (MUST PASS)

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC-6.1 | University A tries to view University B's applications | No applications visible | ⬜ |
| TC-6.2 | University A tries to update University B's application | Error: "Permission denied" | ⬜ |
| TC-6.3 | Student can only see their own applications | Other applications not visible | ⬜ |
| TC-6.4 | school_rep role can view/update applications | Same access as partner role | ⬜ |

### Error Handling Verification

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC-E.1 | Simulate RPC missing error | User-friendly error message shown | ⬜ |
| TC-E.2 | Simulate permission denied | "Permission denied" message with guidance | ⬜ |
| TC-E.3 | Simulate network error | Retry button available | ⬜ |
| TC-E.4 | Application not found | "Application not found" message | ⬜ |

## Manual Test Script

### Test as University Partner (partner role)

```
1. Log in as university partner user
2. Navigate to Applications page
3. Verify applications list shows only your university's applications
4. Click "Review" on an application
5. Verify dialog opens with all tabs
6. Test each tab:
   - Overview: Verify status update works
   - Student: Verify student data displays
   - Documents: Verify documents load and can be viewed
   - Notes: Verify notes can be saved
   - Messages: Verify message can be sent
7. Change status and refresh page - verify persistence
8. Request a document and verify student notification
9. Send a message and verify student receives it
```

### Test as School Rep (school_rep role)

```
1. Log in as school_rep user
2. Repeat all steps from "Test as University Partner"
3. Verify identical functionality
```

### Test as Student

```
1. Log in as student with submitted application
2. Navigate to Messages - verify university messages appear
3. Navigate to Document Requests - verify requests appear
4. Verify student cannot see other students' applications
```

## SQL Verification Queries

### Verify RLS Policies

```sql
-- Check applications policies
SELECT policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'applications' 
ORDER BY policyname;

-- Check application_documents policies
SELECT policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'application_documents' 
ORDER BY policyname;

-- Check document_requests policies
SELECT policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'document_requests' 
ORDER BY policyname;
```

### Verify RPC Functions

```sql
-- Check update_application_review function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'update_application_review';

-- Check grants
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'update_application_review';
```

### Verify Storage Policies

```sql
-- Check storage policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

## Automated Test Plan

### Unit Tests (Jest/Vitest)

```typescript
describe('ApplicationReviewDialog', () => {
  it('renders all tabs when application is provided', () => {});
  it('shows loading state while fetching', () => {});
  it('shows error state when fetch fails', () => {});
  it('calls onStatusUpdate when status is changed', () => {});
  it('calls onNotesUpdate when notes are saved', () => {});
});

describe('useExtendedApplication', () => {
  it('fetches application details successfully', () => {});
  it('handles missing student gracefully', () => {});
  it('handles missing documents gracefully', () => {});
  it('provides user-friendly error messages', () => {});
});
```

### Integration Tests (Playwright/Cypress)

```typescript
describe('University Dashboard - Applications', () => {
  it('opens application review dialog on click', async () => {});
  it('updates status and persists after refresh', async () => {});
  it('displays documents with working links', async () => {});
  it('sends message to student successfully', async () => {});
  it('creates document request successfully', async () => {});
});

describe('RLS Security', () => {
  it('prevents cross-tenant application access', async () => {});
  it('allows school_rep same access as partner', async () => {});
});
```

## Deployment Steps

1. **Database Migration**
   ```bash
   supabase db push
   # or
   supabase migration up
   ```

2. **Verify Migration**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   ORDER BY version DESC LIMIT 5;
   ```

3. **Reload PostgREST Cache**
   ```sql
   NOTIFY pgrst, 'reload config';
   ```

4. **Deploy Frontend**
   - Build and deploy the updated React application

5. **Smoke Test**
   - Perform quick verification of critical paths

## Rollback Plan

If issues are found:

1. **Frontend Rollback**: Redeploy previous version of React app

2. **Database Rollback**: Run inverse migration
   ```sql
   -- Restore original policies if needed
   -- (Keep migration file for reference)
   ```

3. **Notify Users**: If extended downtime, notify university partners

## Monitoring

### Key Metrics to Watch

- Application view success rate
- Status update success rate
- Document access errors (403/404)
- RPC function errors
- Storage access errors

### Log Patterns to Monitor

```
[ApplicationReview] Status update failed
[ApplicationReview] Document request failed
[useExtendedApplication] Failed to fetch application
Permission denied
RLS policy error
```

## Contact

For issues with these fixes, check:
1. Browser console for detailed error logs
2. Supabase dashboard for RPC errors
3. Storage logs for access issues
