# Project rules

- Privileged roles come only from service-role-set `app_metadata` or `user_roles`, never from signup `user_metadata` (users can edit it). See docs/security/SIGNUP-ROLE-TRUST.md.

- Eric requires GitHub/local development and testing to preserve Lovable credits. Do not send Lovable builder/AI messages or buy credits/upgrade a plan unless he explicitly authorises that later. Use reviewed PRs and the manual isolated GitHub backend workflow for acceptance; never add production credentials to CI. GitHub merging, live database activation and frontend publishing remain separate actions.
