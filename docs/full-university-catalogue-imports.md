# Full university catalogue imports

GitHub is the source of truth for the schema, importer and reviewed catalogue datasets. Lovable must not generate or rewrite catalogue code or database changes.

## Safety model

- Official university sources take priority over third-party directories.
- Missing tuition or duration remains `null`; the interface displays a check-official-information message.
- Dry-run is the default. Applying requires the Supabase service-role key in the operator environment.
- A missing course becomes an `archive_candidate`; the importer never silently deletes it.
- Fields listed in `university_locked_fields` are never overwritten by later imports.
- Imported changes create an auditable run and item-level results, including partial failures.
- A university cannot be marked `profile_ready` until the database readiness function passes.

## Dataset contract

Each reviewed JSON dataset contains a university slug, a catalogue source, the academic year, the check date and all programmes found during complete traversal. Programme variants retain distinct official URLs, course codes, awards, duration, campus or study mode.

```json
{
  "university": { "slug": "teesside-university" },
  "source": { "url": "https://www.tees.ac.uk/prospectus/ug/az.cfm" },
  "academicYear": "2026/27",
  "checkedAt": "2026-08-12T00:00:00Z",
  "programmes": [
    {
      "name": "Example course",
      "qualification": "MSc",
      "level": "Postgraduate",
      "discipline": "Computing",
      "officialUrl": "https://university.example/course/example",
      "durationMonths": null,
      "tuition": null,
      "intakes": [],
      "sources": [{ "kind": "programme", "url": "https://university.example/course/example" }]
    }
  ]
}
```

## Review and apply workflow

1. Traverse every page and filter state in the committed pilot source manifest.
2. Verify the discovered count against the official catalogue's stated total where available.
3. Review duplicate and variant output.
4. Run `npm run catalogue:dry-run -- data/catalogues/<dataset>.json`.
5. Correct every validation error. Unresolved tuition warnings are permitted and must stay explicit.
6. Review the JSON diff and commit the dataset.
7. Apply the committed dataset with `npm run catalogue:dry-run -- data/catalogues/<dataset>.json --apply` from an authorised environment.
8. Review import-run partial failures and archive candidates; do not mass-archive without confirmation.
9. QA public course pages, search, university links and mobile rendering.
10. Update completeness counters. Only mark outreach-ready when the database readiness check returns true.

## Current pilot status

The three pilot source routes are committed, but no pilot is represented as complete by this change. Live source traversal, detailed course verification, committed dataset review and authorised database application are separate evidence gates.
