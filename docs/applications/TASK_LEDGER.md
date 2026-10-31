# Application dashboard task ledger

## Review candidate — 31 October 2026

Request: make UniDoxia's application dashboard simple and operational for student university applications, using ApplyBoard/CourseFinder as functional benchmarks.

Completed locally: real staff queue; student-first application start; focused application workspace; explicit document view/verification; notes/status with conflict detection; manual university submission reference history; failed-upload recovery and durable document read-back; supported passport-photo storage; truthful UniDoxia receipt wording; application-document bucket correction. Existing branding and protected routes retained.

Prepared but not applied: verified university-document SELECT policy.

Validation: 398 unit/component tests passed in 54 files; TypeScript check passed; Vite application build passed; diff whitespace check passed; new files lint clean; modified legacy form/review files retain three hook warnings. Local PostgreSQL 16 policy test passed, including repeat application and cross-university/anonymous denial. The queue and application workspace were visually checked at desktop and 390×844 phone size using an isolated local UI fixture with synthetic records (not real Auth/API evidence). No full managed-stack restoration, Auth-issued staging walkthrough or live student mutation performed.

Next: review; authenticated staging verification; migration-specific production approval; resolve first-application agent access and historical student-document compatibility before claiming broad role readiness; exact-commit Lovable preview; Eric's Publish handoff. See README.md for evidence and limitations.

## Export gate

Automatic approval review rejected the combined GitHub push: the specific source-code/access-policy payload and repository destination require explicit user approval. The changes were then committed locally only. No branch push, pull request, merge, Lovable sync, managed migration or publication was performed. Request approval to export this exact branch to `Otsikow/unidoxia` and create a draft PR; that approval must not be treated as permission to apply the database migration or publish.
