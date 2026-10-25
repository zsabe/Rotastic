// MFA prompt disabled by project owner preference.
// Keep this lightweight file as a compatibility loader for admin UX extensions.
Promise.all([
  import('./rotastic-registration-admin.js'),
  import('./rotastic-admin-access-unified.js'),
  import('./rotastic-metrics-export-fix.js')
]).catch(err=>console.error('ROTASTIC admin UX loader',err));
