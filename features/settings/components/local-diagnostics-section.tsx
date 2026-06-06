"use client";

import {
  AlertTriangle,
  Archive,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Database,
  Loader2,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocalDiagnostics } from "@/features/settings/hooks/use-local-diagnostics";
import {
  getPendingSyncCount,
  getSyncErrorCount,
} from "@/features/settings/services/diagnostic-summary";
import type { OutboxStatusSummary } from "@/types/sync";

type MetricTone = "error" | "neutral" | "ok" | "pending";

type LocalDiagnosticsSectionProps = {
  authConfigured: boolean;
  userEmail: string | null;
  userId: string | null;
};

export function LocalDiagnosticsSection({
  authConfigured,
  userEmail,
  userId,
}: Readonly<LocalDiagnosticsSectionProps>) {
  const { diagnostics, error, isLoading } = useLocalDiagnostics({ userId });
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [isApplyingLifecycle, setIsApplyingLifecycle] = useState(false);

  if (isLoading) {
    return (
      <section className="flex min-h-32 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
        Chargement local
      </section>
    );
  }

  if (error || !diagnostics) {
    return (
      <section className="flex min-h-32 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700">
        <AlertTriangle aria-hidden="true" className="mr-2 size-4" />
        Diagnostics indisponibles
      </section>
    );
  }

  const pendingSyncCount = getPendingSyncCount(diagnostics);
  const syncErrorCount = getSyncErrorCount(diagnostics);

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Metric
          icon={ShieldCheck}
          label="Session"
          value={userEmail ?? (authConfigured ? "Connecte" : "Config")}
        />
        <Metric
          icon={Database}
          label="Organisations"
          value={diagnostics.organizationCount}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric
          icon={Building2}
          label="Batiments"
          value={diagnostics.buildingCount}
        />
        <Metric
          icon={ClipboardList}
          label="Brouillons"
          value={diagnostics.draftControlCount}
        />
        <Metric
          icon={CheckCircle2}
          label="Termines"
          value={diagnostics.completedControlCount}
        />
        <Metric
          icon={Wrench}
          label="Reprises"
          value={diagnostics.openCorrectiveActionCount}
        />
        <Metric
          icon={Camera}
          label="Photos"
          value={diagnostics.localPhotoCount}
        />
        <Metric
          icon={Archive}
          label="Archives"
          value={diagnostics.archivedControlCount}
        />
        <Metric
          icon={Trash2}
          label="A purger"
          tone={diagnostics.purgeablePhotoCount > 0 ? "pending" : "neutral"}
          value={diagnostics.purgeablePhotoCount}
        />
        <Metric
          icon={syncErrorCount > 0 ? AlertTriangle : CheckCircle2}
          label="Sync"
          tone={syncErrorCount > 0 ? "error" : pendingSyncCount > 0 ? "pending" : "ok"}
          value={
            syncErrorCount > 0
              ? `${syncErrorCount} erreur`
              : `${pendingSyncCount} attente`
          }
        />
      </div>

      <SyncQueueSummary
        label="Donnees"
        summary={diagnostics.outbox}
      />
      <SyncQueueSummary
        label="Photos"
        summary={diagnostics.photoUploads}
      />

      <section className="space-y-3 rounded-md border bg-background p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Cycle de vie</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {diagnostics.blockedLifecycleControlCount > 0
                ? `${diagnostics.blockedLifecycleControlCount} controle bloque`
                : `${diagnostics.purgeablePhotoControlCount} controle avec photos`}
            </p>
          </div>
          <Archive aria-hidden="true" className="size-5 shrink-0 text-primary" />
        </div>

        <Button
          className="h-11 w-full"
          disabled={!userId || isApplyingLifecycle}
          onClick={() => {
            setLifecycleError(null);
            setLifecycleMessage(null);
            setIsApplyingLifecycle(true);

            void import("@/features/controls/services/control-lifecycle")
              .then((controlLifecycleModule) =>
                controlLifecycleModule.applyControlLifecyclePolicy({ userId }),
              )
              .then((result) => {
                setLifecycleMessage(
                  `${result.archivedNowCount} archive, ${result.photoPurgedNowCount} photo purgee`,
                );
              })
              .catch((error: unknown) => {
                setLifecycleError(
                  error instanceof Error
                    ? error.message
                    : "Cycle de vie indisponible",
                );
              })
              .finally(() => {
                setIsApplyingLifecycle(false);
              });
          }}
          type="button"
          variant="outline"
        >
          {isApplyingLifecycle ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Archive aria-hidden="true" className="size-4" />
          )}
          Appliquer la politique
        </Button>

        {lifecycleMessage ? (
          <p className="text-sm font-medium text-primary">{lifecycleMessage}</p>
        ) : null}
        {lifecycleError ? (
          <p className="text-sm font-medium text-red-700">{lifecycleError}</p>
        ) : null}
      </section>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: Readonly<{
  icon: typeof Database;
  label: string;
  tone?: MetricTone;
  value: number | string;
}>) {
  const toneClasses = {
    error: "border-red-200 bg-red-50 text-red-700",
    neutral: "border-border bg-background text-foreground",
    ok: "border-primary/20 bg-primary/10 text-primary",
    pending: "border-amber-200 bg-amber-50 text-amber-800",
  } satisfies Record<MetricTone, string>;

  return (
    <article className={`rounded-md border p-4 ${toneClasses[tone]}`}>
      <Icon aria-hidden="true" className="mb-3 size-5" />
      <p className="truncate text-xl font-semibold">{value}</p>
      <p className="mt-1 text-sm font-medium opacity-80">{label}</p>
    </article>
  );
}

function SyncQueueSummary({
  label,
  summary,
}: Readonly<{
  label: string;
  summary: OutboxStatusSummary;
}>) {
  return (
    <section className="rounded-md border bg-background p-4 shadow-sm">
      <h2 className="text-base font-semibold">{label}</h2>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-medium text-muted-foreground">
        <QueueCount label="Attente" value={summary.pending} />
        <QueueCount label="Cours" value={summary.processing} />
        <QueueCount label="Erreur" value={summary.error} />
        <QueueCount label="OK" value={summary.synced} />
      </div>
    </section>
  );
}

function QueueCount({
  label,
  value,
}: Readonly<{
  label: string;
  value: number;
}>) {
  return (
    <div className="px-1 py-2">
      <p className="text-base font-semibold text-foreground">{value}</p>
      <p>{label}</p>
    </div>
  );
}
