# ROTASTIC security and information-governance controls

ROTASTIC is designed around privacy by design, least privilege, need-to-know access and data minimisation.

## Identity and access

- Each user must use an individual PHCC work account. Shared logins are not supported.
- Staff access is restricted to the active PHCC allowlist and verified PHCC email identities.
- Privileged roles and temporary Admin View access require MFA before privileged backend actions are allowed.
- Role and confidentiality decisions are enforced in Supabase/PostgreSQL, not only by frontend visibility.

## Data separation and confidentiality

- Ordinary rota/operational data, leave, sickness and confidential concerns use separate tables/security domains.
- Sickness records are restricted to the reporting doctor and the specifically authorised clinical lead workflow.
- Colleagues receive only operational availability information; the sickness reason and confidential workflow state are not exposed.
- Confidential concerns are accessible only to the sender and the specifically authorised recipient. General rota administration does not grant access.
- Medical diagnoses, symptoms, QID, DOB, medical history and unnecessary personal contact information must not be collected by ROTASTIC.
- Medical certificates should remain in the approved PHCC/HR pathway rather than being duplicated in this repository or application storage.

## Database and secrets

- Row Level Security is enabled on ROTASTIC staff and operational tables.
- Privileged database/service credentials and VAPID private material must remain server-side and must never be committed to GitHub or embedded in browser code.
- Browser code may contain only public/publishable client keys intended for that use.
- Sensitive server-side configuration belongs in managed secrets/Vault storage.

## Repository rules

This repository contains code and public application assets only. Do not commit:

- real production rota exports;
- sickness or confidential-concern records;
- database dumps/backups;
- credentials, passwords, private keys or service-role keys;
- production HR/medical documents.

Development and testing should use synthetic data in a separate non-production environment.

## Audit and accountability

ROTASTIC records important operational and sensitive administrative changes in a minimal audit trail. Audit records identify who acted, what type of entity changed and when; they intentionally avoid copying free-text medical or confidential-concern content.

## Retention and deletion

No arbitrary retention period is hard-coded. Production retention and secure deletion must follow the PHCC-approved retention schedule. A retention policy should be configured only after the approved periods for rota, leave, sickness, confidential concerns and audit records are confirmed.

## Deployment controls still requiring platform administration

- Disable anonymous Supabase Auth sign-in for production unless there is a formally approved requirement for it.
- Enable Supabase leaked-password protection for password-based authentication where supported by the chosen authentication configuration.
- Privileged users must complete MFA enrolment.
- Production push notifications require each user to enable notifications on their own device; iPhone/iPad web push requires the web app to be installed/opened as a Home Screen web app and notification permission to be granted by user interaction.

## Reporting security issues

Do not place PHCC confidential information, credentials or production records in a public GitHub issue. Use an approved private PHCC reporting channel for security incidents and sensitive disclosures.
