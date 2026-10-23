# Withdrawing a sharing authorisation

Students authorise UniDoxia to share their application details with KC Overseas Education (India) and their chosen universities in their own UniDoxia account. They withdraw it by emailing info@unidoxia.com.

## When a withdrawal email arrives at info@unidoxia.com

1. Check the email comes from the address on the student's UniDoxia account. If it does not, ask the student to confirm from that address or from inside their account before going further.
2. Find the student's record (`students.id`).
3. An admin records the withdrawal by calling the function as their own admin or staff user. In the Supabase SQL editor, set the role selector to impersonate your own admin account first (the function refuses callers who are not staff or admins, including the plain postgres role):

   ```sql
   select public.withdraw_sharing_authorisation('<student_id>');
   ```

   It returns the number of authorisations marked as withdrawn (normally 1). The rows are kept, with `withdrawn_at` and `withdrawn_by` set, as the record of consent and withdrawal. From then on none of the student's non-grandfathered applications can be submitted or move into or between screening, offer, CAS or LOA, visa or enrolled until the student gives a new authorisation in their account.
4. Reply to the student to confirm the withdrawal and the date it took effect. Tell them that applications already sent to KC Overseas or a university cannot be recalled, and that we may not be able to continue those applications.
5. Tell the student's adviser or agent, so nobody tries to move their applications on.
6. Keep the email with the student's record.

If the student also asks for their data to be erased, treat that as a separate erasure request.
