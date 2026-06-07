import { Camera, CheckSquare, ClipboardList, Wrench } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { LocalControlHistorySummary } from "@/features/controls/services/local-controls";

type ControlHistoryListItemProps = {
  summary: LocalControlHistorySummary;
};

export function ControlHistoryListItem({
  summary,
}: Readonly<ControlHistoryListItemProps>) {
  const { building, checklistResultCount, control, correctiveActionCount, photoCount } =
    summary;

  return (
    <article className="surface-card space-y-4 p-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">
              {building?.name ?? "Batiment non disponible"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {control.completedAt
                ? formatDateTime(control.completedAt)
                : "Date de fin inconnue"}
            </p>
          </div>
          <span className="status-pill shrink-0 border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            Termine
          </span>
        </div>

        {control.generalComment ? (
          <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">
            {control.generalComment}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium text-muted-foreground">
        <Metric icon={CheckSquare} label="Points" value={checklistResultCount} />
        <Metric icon={Wrench} label="Reprises" value={correctiveActionCount} />
        <Metric icon={Camera} label="Photos" value={photoCount} />
      </div>

      <Button asChild className="h-11 w-full" variant="outline">
        <Link href={`/controles/${control.id}`}>
          <ClipboardList aria-hidden="true" className="size-4" />
          Ouvrir
        </Link>
      </Button>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: typeof CheckSquare;
  label: string;
  value: number;
}>) {
  return (
    <div className="rounded-md bg-muted px-2 py-2 transition-colors duration-200">
      <Icon aria-hidden="true" className="mx-auto mb-1 size-4" />
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p>{label}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
