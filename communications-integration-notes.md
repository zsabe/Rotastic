# Communications integration contract

Verified backend calls for the safe Communications integration:

- Notifications: select/update `rotastic_notification_queue`; RLS limits rows to the verified current physician. Display only rows from the last 5 days and use `read_at` for unread state.
- Cleanup: `rotastic_cleanup_my_notifications()`.
- Clinical Lead inbox: `rotastic_moursi_approval_inbox()`.
- Clinical Lead action: `rotastic_moursi_request_action(p_kind, p_id, p_action, p_note)`.
- Leave/swap actions: `approve` or `decline`; decline carries free-text `p_note`.
- Sick requests are acknowledged by the same action function and applicant notification is generated server-side.
- Admin code redemption: `rotastic_redeem_admin_access_code(p_code)`.

UI constraint: no global restyling, no replacement of existing tab/button handlers, and no fallback insertion into the page root.