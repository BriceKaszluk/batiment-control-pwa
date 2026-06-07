"use client";

import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { useLocalAgents } from "@/features/agents/hooks/use-local-agents";
import {
  getAgentStatusLabel,
  getAgentStatusTone,
  type AgentStatusTone,
} from "@/features/agents/services/agent-labels";
import { useUserOrganizations } from "@/features/buildings/hooks/use-user-organizations";
import { agentStatuses } from "@/lib/domain/options";
import { cn } from "@/lib/utils";
import type { Agent, AgentCreateInput } from "@/types/domain";

type AgentsManagementSectionProps = {
  userId: string | null;
};

type FieldErrors = Partial<Record<keyof AgentCreateInput, string>>;
type AgentStatus = (typeof agentStatuses)[number];

const statusToneClasses: Record<AgentStatusTone, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-900",
  away: "border-amber-200 bg-amber-50 text-amber-900",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

export function AgentsManagementSection({
  userId,
}: Readonly<AgentsManagementSectionProps>) {
  const organizationsState = useUserOrganizations(userId);
  const organization = organizationsState.organizations[0] ?? null;
  const agentsState = useLocalAgents({
    organizationId: organization?.id,
    userId,
  });

  const [name, setName] = useState("");
  const [status, setStatus] = useState<AgentStatus>("present");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canCreate = Boolean(userId && organization && !isSaving);

  function handleCreateAgent() {
    setFieldErrors({});
    setFormError(null);

    if (!userId || !organization) {
      setFormError("Espace personnel requis.");
      return;
    }

    const input: AgentCreateInput = {
      name,
      status,
    };

    setIsSaving(true);

    void Promise.all([
      import("@/lib/validation/schemas"),
      import("@/features/agents/services/local-agents"),
    ])
      .then(([validationModule, localAgentsModule]) => {
        const parsed = validationModule.agentCreateSchema.safeParse(input);

        if (!parsed.success) {
          const errors = collectFieldErrors(parsed.error);
          setFieldErrors(errors.fieldErrors);
          setFormError(errors.formError ?? "Champs invalides.");
          return null;
        }

        return localAgentsModule.createAgent({
          input: parsed.data,
          organizationId: organization.id,
          userId,
        });
      })
      .then((result) => {
        if (result === null) {
          return;
        }

        setName("");
        setStatus("present");
      })
      .catch((error: unknown) => {
        setFormError(
          error instanceof Error ? error.message : "Sauvegarde impossible",
        );
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  return (
    <div className="space-y-6">
      {organizationsState.error ? (
        <FeedbackBox tone="error">Espace personnel local indisponible</FeedbackBox>
      ) : null}

      {organizationsState.isLoading ? (
        <FeedbackBox tone="muted">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Preparation de l&apos;espace personnel
        </FeedbackBox>
      ) : null}

      {!organizationsState.isLoading &&
      organizationsState.organizations.length === 0 ? (
        <FeedbackBox tone="warning">
          Synchronisez pour preparer votre espace personnel
        </FeedbackBox>
      ) : null}

      {formError ? <FeedbackBox tone="error">{formError}</FeedbackBox> : null}

      <section className="surface-panel space-y-4 p-4">
        <h2 className="text-base font-semibold">Nouvel agent</h2>

        <label className="block space-y-2 text-sm font-medium">
          <span>Nom de l&apos;agent</span>
          <input
            className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
          {fieldErrors.name ? (
            <p className="text-sm font-medium text-red-700">{fieldErrors.name}</p>
          ) : null}
        </label>

        <label className="block space-y-2 text-sm font-medium">
          <span>Statut</span>
          <select
            className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setStatus(event.target.value as AgentStatus);
            }}
            value={status}
          >
            {agentStatuses.map((agentStatus) => (
              <option key={agentStatus} value={agentStatus}>
                {getAgentStatusLabel(agentStatus)}
              </option>
            ))}
          </select>
          {fieldErrors.status ? (
            <p className="text-sm font-medium text-red-700">{fieldErrors.status}</p>
          ) : null}
        </label>

        <Button
          className="h-12 w-full"
          disabled={!canCreate}
          onClick={handleCreateAgent}
          type="button"
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          Ajouter l&apos;agent
        </Button>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Liste locale</h2>
          <p className="text-sm font-medium text-muted-foreground">
            {agentsState.agents.length}
          </p>
        </div>

        {agentsState.isLoading ? (
          <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
            Chargement local
          </div>
        ) : null}

        {agentsState.error ? (
          <FeedbackBox tone="error">Agents locaux indisponibles</FeedbackBox>
        ) : null}

        {!agentsState.isLoading &&
        !agentsState.error &&
        agentsState.agents.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
            Aucun agent local
          </div>
        ) : null}

        <div className="motion-list space-y-3">
          {agentsState.agents.map((agent) => (
            <AgentEditor agent={agent} key={agent.id} userId={userId} />
          ))}
        </div>
      </section>
    </div>
  );
}

type AgentEditorProps = {
  agent: Agent;
  userId: string | null;
};

function AgentEditor({ agent, userId }: Readonly<AgentEditorProps>) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(agent.name);
  const [status, setStatus] = useState<AgentStatus>(agent.status);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(agent.name);
    setStatus(agent.status);
  }, [agent.name, agent.status]);

  const hasChanges = useMemo(
    () => name.trim() !== agent.name || status !== agent.status,
    [agent.name, agent.status, name, status],
  );
  const statusTone = getAgentStatusTone(status);

  function handleSaveAgent() {
    setFieldErrors({});
    setFormError(null);

    const input: AgentCreateInput = {
      name,
      status,
    };

    setIsSaving(true);

    void Promise.all([
      import("@/lib/validation/schemas"),
      import("@/features/agents/services/local-agents"),
    ])
      .then(([validationModule, localAgentsModule]) => {
        const parsed = validationModule.agentCreateSchema.safeParse(input);

        if (!parsed.success) {
          const errors = collectFieldErrors(parsed.error);
          setFieldErrors(errors.fieldErrors);
          setFormError(errors.formError ?? "Champs invalides.");
          return null;
        }

        return localAgentsModule.updateAgent({
          agentId: agent.id,
          input: parsed.data,
          userId,
        });
      })
      .then((result) => {
        if (result !== null) {
          setIsEditing(false);
        }
      })
      .catch((error: unknown) => {
        setFormError(
          error instanceof Error ? error.message : "Sauvegarde impossible",
        );
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  return (
    <article className="surface-card space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <UserRound aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <h3 className="truncate text-base font-semibold">{agent.name}</h3>
          </div>
          <span
            className={cn(
              "status-pill px-2 py-1 text-xs font-medium",
              statusToneClasses[statusTone],
            )}
          >
            {getAgentStatusLabel(status)}
          </span>
        </div>
        {!isEditing ? (
          <Button
            className="h-10 shrink-0 px-3"
            onClick={() => {
              setIsEditing(true);
            }}
            type="button"
            variant="outline"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Modifier
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="motion-reveal space-y-4">
          {formError ? <FeedbackBox tone="error">{formError}</FeedbackBox> : null}

          <label className="block space-y-2 text-sm font-medium">
            <span>Nom</span>
            <input
              className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => {
                setName(event.target.value);
              }}
              value={name}
            />
            {fieldErrors.name ? (
              <p className="text-sm font-medium text-red-700">{fieldErrors.name}</p>
            ) : null}
          </label>

          <label className="block space-y-2 text-sm font-medium">
            <span>Statut</span>
            <select
              className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => {
                setStatus(event.target.value as AgentStatus);
              }}
              value={status}
            >
              {agentStatuses.map((agentStatus) => (
                <option key={agentStatus} value={agentStatus}>
                  {getAgentStatusLabel(agentStatus)}
                </option>
              ))}
            </select>
            {fieldErrors.status ? (
              <p className="text-sm font-medium text-red-700">
                {fieldErrors.status}
              </p>
            ) : null}
          </label>

          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-11"
              disabled={!userId || !hasChanges || isSaving}
              onClick={handleSaveAgent}
              type="button"
            >
              {isSaving ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="size-4" />
              )}
              Enregistrer
            </Button>
            <Button
              className="h-11"
              disabled={isSaving}
              onClick={() => {
                setName(agent.name);
                setStatus(agent.status);
                setFieldErrors({});
                setFormError(null);
                setIsEditing(false);
              }}
              type="button"
              variant="outline"
            >
              <X aria-hidden="true" className="size-4" />
              Annuler
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

type FeedbackBoxProps = {
  children: ReactNode;
  tone: "error" | "muted" | "warning";
};

function FeedbackBox({ children, tone }: Readonly<FeedbackBoxProps>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium",
        tone === "error" && "border-red-200 bg-red-50 text-red-700",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
      )}
    >
      {tone === "error" || tone === "warning" ? (
        <AlertTriangle aria-hidden="true" className="size-4" />
      ) : null}
      {children}
    </div>
  );
}

function collectFieldErrors(
  issue: z.ZodError<AgentCreateInput>,
): { fieldErrors: FieldErrors; formError: string | null } {
  const errors: FieldErrors = {};
  const formIssues: string[] = [];

  for (const item of issue.issues) {
    const [field] = item.path;

    if (typeof field === "string") {
      const key = field as keyof AgentCreateInput;
      errors[key] ??= item.message;
    } else {
      formIssues.push(item.message);
    }
  }

  return {
    fieldErrors: errors,
    formError: formIssues.length > 0 ? formIssues[0] : null,
  };
}
