// Legacy service-worker entrypoint kept for older ROTASTIC installations.
// Delegate to the canonical worker so every install uses identical cache/push behavior.
importScripts('./service-worker.js');
