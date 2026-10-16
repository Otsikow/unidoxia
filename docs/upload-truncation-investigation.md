# Document Upload Truncation Investigation

## Investigation Findings

After a thorough review of the upload path from client to Supabase storage, here's what was found:

### Potential Truncation Causes Investigated

1. **Chunked/Resumable Uploads**: ✅ Not Used
   - The codebase uses Supabase's standard `storage.upload()` method
   - No resumable or chunked upload implementation found
   - Files are uploaded as complete `File` objects in a single request

2. **Base64 Encoding**: ✅ Not a Factor
   - Document uploads go directly to Supabase storage as binary
   - Base64 is only used for:
     - Passport OCR (separate function, not document storage)
     - Image generation (for AI-generated images)
     - Email attachments (PDFs via edge functions)
   - No base64 conversion in the document upload path

3. **Edge Function Body Limits**: ✅ Not Applicable
   - Document uploads do NOT go through edge functions
   - They use Supabase Storage API directly via `@supabase/supabase-js`
   - Edge functions are only used for metadata operations, not file transfer

4. **Mobile Browser Memory**: ⚠️ Potential Issue
   - Mobile browsers can have memory constraints with large files
   - The 10MB upload limit helps mitigate this
   - Client-side validation now checks file integrity before upload

5. **Network Timeouts**: ⚠️ Potential Issue
   - Supabase JS client has default timeout settings
   - Poor network conditions can cause partial uploads
   - **Mitigation**: Post-upload size verification now catches this

6. **Supabase Storage Configuration**: ✅ Checked
   - Default Supabase storage limits: 50MB per file (free tier), 5GB (paid)
   - Our 10MB limit is well within safe bounds
   - No body size limits found in `supabase/config.toml`

### Root Causes Identified

The most likely causes of truncated uploads:

1. **User-side file corruption**: Files were already corrupted/truncated before upload
2. **Network interruptions**: Unstable connections causing partial uploads
3. **Mobile browser issues**: Memory constraints on low-end devices
4. **Client-side file handling**: Lack of integrity checks before/after upload

### Fixes Applied

1. **Client-side validation**:
   - Check for 0-byte files
   - Check for suspiciously small documents
   - Validate PDF %%EOF trailer (catches truncated full-size PDFs)

2. **Post-upload verification**:
   - Compare uploaded file size with original
   - Automatic cleanup of truncated uploads
   - Clear error messages for retry

3. **Server-side validation edge function**:
   - Secondary validation layer
   - Can be called after upload for critical documents
   - Validates file size and PDF integrity on the server

### Recommendations for Future

1. **Monitor upload failure patterns**:
   - Track which users experience repeated failures
   - Check if mobile vs desktop matters
   - Monitor average file sizes vs failure rates

2. **Consider chunked uploads for large files**:
   - If >10MB files become common
   - Implement resumable uploads via tus protocol
   - Supabase supports this via storage API

3. **Add client-side retry logic**:
   - Automatic retry with exponential backoff
   - Only for network-related failures
   - Maximum 3 retries

4. **User guidance**:
   - Recommend WiFi for large uploads
   - Suggest compressing large PDFs
   - Clear error messages with actionable steps

## Supabase Storage Upload Flow

```
User selects file
    ↓
validateFileUpload() - Client validation
    ├─ Size checks
    ├─ MIME type validation
    └─ PDF %%EOF trailer check
    ↓
supabase.storage.upload() - Direct to Supabase Storage
    ↓
verifyUploadedFileSize() - Post-upload verification
    ├─ Fetch file metadata from storage
    ├─ Compare sizes
    └─ Delete if truncated
    ↓
Insert database record
    ↓
(Optional) Server-side validation via edge function
    └─ Secondary integrity check
```

## Testing Recommendations

To reproduce truncated uploads:

1. **Network simulation**:
   - Use Chrome DevTools throttling (Slow 3G)
   - Disconnect network mid-upload
   - Test with packet loss simulation

2. **File preparation**:
   - Create truncated PDF: `head -c 50000 valid.pdf > truncated.pdf`
   - Remove EOF marker: `head -c -5 valid.pdf > no-eof.pdf`
   - Test 0-byte file: `touch empty.pdf`

3. **Mobile testing**:
   - Test on actual mobile devices (not just emulator)
   - Test with low battery mode
   - Test with background app switching
