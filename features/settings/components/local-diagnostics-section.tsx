"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  FolderClock,
  Loader2,
  MapPinned,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { useLocalDiagnostics } from "@/features/settings/hooks/use-local-diagnostics";

type MetricTone = "neutral" | "ok" | "pending";

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

  return (
    <section className="space-y-3">
      <div className="motion-list grid grid-cols-2 gap-3">
        <Metric
          icon={ShieldCheck}
          label="Session"
          value={userEmail ?? (authConfigured ? "Connecte" : "Config")}
        />
        <Metric
          icon={Building2}
          label="Batiments"
          value={diagnostics.buildingCount}
        />
        <Metric
          icon={UsersRound}
          label="Agents"
          value={diagnostics.agentCount}
        />
        <Metric
          icon={MapPinned}
          label="Secteurs"
          value={diagnostics.sectorCount}
        />
        <Metric
          icon={ClipboardList}
          label="Brouillons"
          value={diagnostics.draftControlCount}
        />
        <Metric
          icon={CheckCircle2}
          label="Ce jour"
          tone={diagnostics.todayControlCount > 0 ? "ok" : "neutral"}
          value={diagnostics.todayControlCount}
        />
        <Metric
          icon={FolderClock}
          label="Historique"
          value={diagnostics.historyControlCount}
        />
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  tone?: MetricTone;
  value: number | string;
}>) {
  const toneClasses = {
    neutral: "border-border bg-background text-foreground",
    ok: "border-primary/20 bg-primary/10 text-primary",
    pending: "border-amber-200 bg-amber-50 text-amber-800",
  } satisfies Record<MetricTone, string>;

  return (
    <article className={`surface-card p-4 ${toneClasses[tone]}`}>
      <Icon aria-hidden="true" className="mb-3 size-5" />
      <p className="truncate text-xl font-semibold">{value}</p>
      <p className="mt-1 text-sm font-medium opacity-80">{label}</p>
    </article>
  );
}
