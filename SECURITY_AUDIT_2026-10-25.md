# ROTASTIC Security & Production Readiness Audit

Audit started 25 Oct 2026. This file records production-readiness checks and remediation status without changing the app's established visual design.

## Scope
- Supabase Auth/RLS/RPC/Edge Functions/Vault/Cron
- VAPID/web push and notification privacy
- GitHub Pages/PWA/service worker
- Android wrapper/security
- iOS/iPadOS Home Screen PWA readiness
- Sick-leave confidentiality workflow
- Clinical Lead / Dr Moursi approval workflow
- Schedule generation/approval/release workflow
- Leave workflow
- Metrics/export integrity
- Account/sign-out behaviour

## Current verified controls
- RLS enabled on operational and sensitive tables.
- Restrictive PHCC-user gate added across ROTASTIC public tables.
- Anonymous Supabase identities cannot read staff profiles.
- VAPID private material is stored behind Supabase Vault and a service-role-only configuration function; not hardcoded in the deployed push Edge Function.
- Push scheduler runs every minute and recent invocations return HTTP 200.
- Sensitive lock-screen notifications use neutral wording.
- Sick-case reads are limited to the doctor themself and Dr Moursi; admin status alone does not grant sick-case access.
- Confidential concerns are limited to sender and Dr Moursi.
- Android backups and cleartext traffic are disabled.

## Remaining checks/remediation
- Full RPC execute-grant review.
- Leaked-password protection remains an account-level Auth setting.
- Physical iPhone/Android/watch delivery testing requires a real subscribed device.
- Exact PHCC retention durations have not been supplied; no retention window will be invented.

