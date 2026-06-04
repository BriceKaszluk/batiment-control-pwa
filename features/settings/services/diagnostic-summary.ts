import type { LocalDiagnostics } from "@/features/settings/services/local-diagnostics";

export function getPendingSyncCount(diagnostics: LocalDiagnostics) {
  return (
    diagnostics.outbox.pending +
    diagnostics.outbox.processing +
    diagnostics.photoUploads.pending +
    diagnostics.photoUploads.processing
  );
}

export function getSyncErrorCount(diagnostics: LocalDiagnostics) {
  return diagnostics.outbox.error + diagnostics.photoUploads.error;
}
