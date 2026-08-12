# ApplyBoard portfolio routing

This metadata is internal. It is stored only in staff-protected routing tables, never on public catalogue rows. A public university listing is not evidence of a direct UniDoxia contract, university endorsement or commission agreement.

## Institution rules

For an institution processed through ApplyBoard, store the following only in `internal_university_routing`:

- `application_channel = 'applyboard'`
- `direct_contract = false`
- `applyboard_available = true`
- `applyboard_verified_at` and `routing_last_verified_at` contain the actual check time
- `applyboard_reference` contains the institution listing URL or stable internal reference
- `commission_verification_status = 'partner_account_check_required'` unless account-level evidence proves a different state

The database rejects `application_channel = 'applyboard'` when the required evidence fields are missing. It also rejects `application_channel = 'direct_university_partnership'` unless `direct_contract = true`. Anonymous users, students and agents have no row access to this table.

## Programme rules

Store programme routing only in `internal_program_routing`. Use `applyboard_program_status = 'verified_available'` only when the exact programme has an ApplyBoard reference and verification timestamp.

When the institution is verified but the exact programme is not visible without a signed-in programme search, use:

- `applyboard_program_status = 'institution_verified_programme_check_required'`
- internal staff note: `ApplyBoard programme verification required before submission`

Do not infer commissionability from a public institution or programme page. The operational note remains:

> Commission: Verify within UniDoxia ApplyBoard partner account before application submission.

## Public presentation

Do not expose the recruitment platform, routing status, verification labels, references, URLs, commission status or application-channel information in pages, page source, frontend objects, public APIs, student dashboards or agent dashboards. Students apply through UniDoxia. Do not describe these institutions as direct, official or authorised UniDoxia university partners.
