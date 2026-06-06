"use client";

import { AlertTriangle, Loader2, Save, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { useLocalAgents } from "@/features/agents/hooks/use-local-agents";
import { getAgentStatusLabel } from "@/features/agents/services/agent-labels";
import { useUserOrganizations } from "@/features/buildings/hooks/use-user-organizations";
import {
  buildingAreas,
  buildingPriorityLevels,
  serviceTasks,
  weekDays,
} from "@/lib/domain/options";
import type { Building, BuildingCreateInput } from "@/types/domain";

type BuildingFormMode = "create" | "edit";

type BuildingFormProps = {
  building: Building | null;
  mode: BuildingFormMode;
  userId: string | null;
};

type FieldErrors = Partial<Record<keyof BuildingCreateInput, string>>;

const priorityLabels: Record<(typeof buildingPriorityLevels)[number], string> = {
  critical: "Critique",
  high: "Haute",
  low: "Faible",
  normal: "Normale",
};

const weekDayLabels: Record<(typeof weekDays)[number], string> = {
  friday: "Vendredi",
  monday: "Lundi",
  saturday: "Samedi",
  sunday: "Dimanche",
  thursday: "Jeudi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
};

const taskLabels: Record<(typeof serviceTasks)[number], string> = {
  basement: "Cave",
  bike_room: "Local velo",
  dusting: "Depoussierage",
  elevator: "Ascenseur",
  entrance_hall: "Hall / entree",
  floor_cleaning: "Lavage sol",
  floor_landings: "Paliers etage",
  outdoor: "Abords",
  stairs: "Escaliers",
  touchpoint_disinfection: "Desinfection points de contact",
  trash_room: "Local poubelle",
  windows: "Vitres",
};

const areaLabels: Record<(typeof buildingAreas)[number], string> = {
  elevator: "Ascenseur",
  basement_access: "Acces circulation caves",
  common_areas: "Locaux communs",
  floor_landings: "Palier d'etages",
  garage: "Garage",
  hall: "Hall",
  outdoor: "Abords",
  stairs: "Montee escalier",
};

export function BuildingForm({ building, mode, userId }: Readonly<BuildingFormProps>) {
  const router = useRouter();
  const organizationsState = useUserOrganizations(userId);

  const isEdit = mode === "edit";
  const [organizationId, setOrganizationId] = useState<string>("");
  const agentsState = useLocalAgents({
    organizationId: organizationId || undefined,
    userId,
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [sector, setSector] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [priorityLevel, setPriorityLevel] = useState<
    (typeof buildingPriorityLevels)[number]
  >("normal");
  const [internalNotes, setInternalNotes] = useState("");
  const [serviceDays, setServiceDays] = useState<BuildingCreateInput["serviceDays"]>([]);
  const [areasToCheck, setAreasToCheck] = useState<BuildingCreateInput["areasToCheck"]>([]);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      if (!building) {
        return;
      }

      setOrganizationId(building.organizationId);
      setName(building.name);
      setAddress(building.address);
      setSector(building.sector);
      setAssignedAgentId(building.assignedAgentId ?? "");
      setPriorityLevel(building.priorityLevel);
      setInternalNotes(building.internalNotes ?? "");
      setServiceDays(building.serviceDays);
      setAreasToCheck(building.areasToCheck);
      return;
    }

    if (organizationsState.organizations.length > 0) {
      setOrganizationId(organizationsState.organizations[0].id);
    }
  }, [building, isEdit, organizationsState.organizations]);

  const selectedAgent = useMemo(
    () =>
      agentsState.agents.find((agent) => agent.id === assignedAgentId) ?? null,
    [agentsState.agents, assignedAgentId],
  );

  const canSave = useMemo(() => {
    if (!userId) {
      return false;
    }

    if (isEdit) {
      return Boolean(building);
    }

    return organizationId.length > 0;
  }, [building, isEdit, organizationId, userId]);

  function normalizeOptionalText(value: string) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  function collectFieldErrors(
    issue: z.ZodError<BuildingCreateInput>,
  ): { fieldErrors: FieldErrors; formError: string | null } {
    const errors: FieldErrors = {};
    const formIssues: string[] = [];

    for (const item of issue.issues) {
      const [field] = item.path;

      if (typeof field === "string") {
        const key = field as keyof BuildingCreateInput;
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

  return (
    <div className="space-y-6">
      {organizationsState.error ? (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <AlertTriangle aria-hidden="true" className="size-4" />
          Espace personnel local indisponible
        </div>
      ) : null}

      {!isEdit && organizationsState.isLoading ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Preparation de l&apos;espace personnel
        </div>
      ) : null}

      {!isEdit &&
      !organizationsState.isLoading &&
      organizationsState.organizations.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          <AlertTriangle aria-hidden="true" className="size-4" />
          Synchronisez pour preparer votre espace personnel
        </div>
      ) : null}

      {formError ? (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <AlertTriangle aria-hidden="true" className="size-4" />
          {formError}
        </div>
      ) : null}

      <section className="space-y-4 rounded-md border bg-background p-4 shadow-sm">
        <h2 className="text-base font-semibold">Identification</h2>

        <label className="block space-y-2 text-sm font-medium">
          <span>Nom du batiment</span>
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
          <span>Adresse</span>
          <textarea
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-base font-normal leading-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setAddress(event.target.value);
            }}
            value={address}
          />
          {fieldErrors.address ? (
            <p className="text-sm font-medium text-red-700">{fieldErrors.address}</p>
          ) : null}
        </label>

        <label className="block space-y-2 text-sm font-medium">
          <span>Secteur</span>
          <input
            className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setSector(event.target.value);
            }}
            value={sector}
          />
          {fieldErrors.sector ? (
            <p className="text-sm font-medium text-red-700">{fieldErrors.sector}</p>
          ) : null}
        </label>
      </section>

      <section className="space-y-4 rounded-md border bg-background p-4 shadow-sm">
        <h2 className="text-base font-semibold">Agent</h2>

        <label className="block space-y-2 text-sm font-medium">
          <span>Agent affecte</span>
          <select
            className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setAssignedAgentId(event.target.value);
            }}
            value={assignedAgentId}
          >
            <option value="">Aucun agent</option>
            {agentsState.agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          {fieldErrors.assignedAgentId ? (
            <p className="text-sm font-medium text-red-700">
              {fieldErrors.assignedAgentId}
            </p>
          ) : null}
        </label>

        {agentsState.isLoading ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Chargement des agents
          </div>
        ) : null}

        {agentsState.error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            <AlertTriangle aria-hidden="true" className="size-4" />
            Agents locaux indisponibles
          </div>
        ) : null}

        {!agentsState.isLoading &&
        !agentsState.error &&
        agentsState.agents.length === 0 ? (
          <Button asChild className="h-11 w-full" variant="outline">
            <Link href="/agents">
              <UserPlus aria-hidden="true" className="size-4" />
              Creer un agent
            </Link>
          </Button>
        ) : null}

        {selectedAgent ? (
          <p className="rounded-md border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
            Statut: {getAgentStatusLabel(selectedAgent.status)}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-md border bg-background p-4 shadow-sm">
        <h2 className="text-base font-semibold">Priorite et notes</h2>

        <label className="block space-y-2 text-sm font-medium">
          <span>Niveau de priorite</span>
          <select
            className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setPriorityLevel(
                event.target.value as (typeof buildingPriorityLevels)[number],
              );
            }}
            value={priorityLevel}
          >
            {buildingPriorityLevels.map((level) => (
              <option key={level} value={level}>
                {priorityLabels[level]}
              </option>
            ))}
          </select>
          {fieldErrors.priorityLevel ? (
            <p className="text-sm font-medium text-red-700">
              {fieldErrors.priorityLevel}
            </p>
          ) : null}
        </label>

        <label className="block space-y-2 text-sm font-medium">
          <span>Notes internes</span>
          <textarea
            className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-base font-normal leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={3000}
            onChange={(event) => {
              setInternalNotes(event.target.value);
            }}
            placeholder="Informations terrain importantes"
            value={internalNotes}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-md border bg-background p-4 shadow-sm">
        <h2 className="text-base font-semibold">Jours de prestation</h2>

        {serviceDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun jour de prestation defini
          </p>
        ) : null}

        <div className="space-y-4">
          {serviceDays.map((entry) => (
            <div
              className="space-y-3 rounded-md border bg-muted/40 p-3"
              key={entry.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{weekDayLabels[entry.day]}</p>
                <Button
                  className="h-9 px-3"
                  onClick={() => {
                    setServiceDays((current) =>
                      current.filter((day) => day.id !== entry.id),
                    );
                  }}
                  type="button"
                  variant="outline"
                >
                  Supprimer
                </Button>
              </div>

              <label className="block space-y-2 text-sm font-medium">
                <span>Jour</span>
                <select
                  className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => {
                    const day = event.target.value as (typeof weekDays)[number];

                    setServiceDays((current) =>
                      current.map((item) =>
                        item.id === entry.id ? { ...item, day } : item,
                      ),
                    );
                  }}
                  value={entry.day}
                >
                  {weekDays.map((day) => (
                    <option key={day} value={day}>
                      {weekDayLabels[day]}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Taches prevues</legend>
                <div className="grid grid-cols-1 gap-2">
                  {serviceTasks.map((task) => {
                    const checked = entry.tasks.includes(task);

                    return (
                      <label
                        className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm font-medium"
                        key={task}
                      >
                        <input
                          checked={checked}
                          className="size-5"
                          onChange={(event) => {
                            const isChecked = event.target.checked;

                            setServiceDays((current) =>
                              current.map((item) => {
                                if (item.id !== entry.id) {
                                  return item;
                                }

                                return {
                                  ...item,
                                  tasks: isChecked
                                    ? [...item.tasks, task]
                                    : item.tasks.filter((value) => value !== task),
                                };
                              }),
                            );
                          }}
                          type="checkbox"
                        />
                        <span>{taskLabels[task]}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block space-y-2 text-sm font-medium">
                <span>Note (optionnelle)</span>
                <textarea
                  className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-base font-normal leading-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  maxLength={1000}
                  onChange={(event) => {
                    const noteValue = event.target.value;

                    setServiceDays((current) =>
                      current.map((item) =>
                        item.id === entry.id ? { ...item, note: noteValue } : item,
                      ),
                    );
                  }}
                  placeholder="Precision pour ce jour"
                  value={entry.note ?? ""}
                />
              </label>
            </div>
          ))}
        </div>

        <Button
          className="h-11 w-full"
          onClick={() => {
            setServiceDays((current) => [
              ...current,
              {
                day: "monday",
                id: crypto.randomUUID(),
                note: null,
                tasks: [],
              },
            ]);
          }}
          type="button"
          variant="outline"
        >
          Ajouter un jour
        </Button>

        {fieldErrors.serviceDays ? (
          <p className="text-sm font-medium text-red-700">{fieldErrors.serviceDays}</p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-md border bg-background p-4 shadow-sm">
        <h2 className="text-base font-semibold">Elements a controler</h2>

        <div className="grid grid-cols-1 gap-2">
          {buildingAreas.map((area) => {
            const checked = areasToCheck.includes(area);

            return (
              <label
                className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm font-medium"
                key={area}
              >
                <input
                  checked={checked}
                  className="size-5"
                  onChange={(event) => {
                    const isChecked = event.target.checked;

                    setAreasToCheck((current) =>
                      isChecked
                        ? [...current, area]
                        : current.filter((value) => value !== area),
                    );
                  }}
                  type="checkbox"
                />
                <span>{areaLabels[area]}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <Button
          className="h-12 w-full"
          disabled={!canSave || isSaving || isDeleting}
          onClick={() => {
            setFormError(null);
            setFieldErrors({});

            const input: BuildingCreateInput = {
              address,
              areasToCheck,
              assignedAgentId: normalizeOptionalText(assignedAgentId),
              agentStatus: selectedAgent?.status ?? "unknown",
              assignedAgentName: selectedAgent?.name ?? null,
              internalNotes: normalizeOptionalText(internalNotes),
              name,
              priorityLevel,
              sector,
              serviceDays: serviceDays.map((entry) => ({
                ...entry,
                note:
                  typeof entry.note === "string"
                    ? normalizeOptionalText(entry.note) ?? null
                    : entry.note ?? null,
              })),
            };

            if (!userId) {
              setFormError("Utilisateur requis.");
              return;
            }

            if (!isEdit && organizationId.length === 0) {
              setFormError("Espace personnel requis.");
              return;
            }

            setIsSaving(true);

            void Promise.all([
              import("@/lib/validation/schemas"),
              import("@/features/buildings/services/local-building-editor"),
            ])
              .then(([validationModule, localBuildingEditorModule]) => {
                const parsed =
                  validationModule.buildingCreateSchema.safeParse(input);

                if (!parsed.success) {
                  const { fieldErrors, formError } = collectFieldErrors(
                    parsed.error,
                  );
                  setFieldErrors(fieldErrors);
                  setFormError(formError ?? "Champs invalides.");
                  return null;
                }

                return isEdit
                  ? localBuildingEditorModule.updateBuilding({
                      buildingId: building?.id ?? "",
                      input: parsed.data,
                      userId,
                    })
                  : localBuildingEditorModule.createBuilding({
                      input: parsed.data,
                      organizationId,
                      userId,
                    });
              })
              .then((result) => {
                if (result === null) {
                  return;
                }

                router.push(
                  isEdit
                    ? "/batiments?notice=batiment-enregistre"
                    : "/batiments?notice=batiment-cree",
                );
              })
              .catch((error: unknown) => {
                setFormError(
                  error instanceof Error ? error.message : "Sauvegarde impossible",
                );
              })
              .finally(() => {
                setIsSaving(false);
              });
          }}
          type="button"
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          Enregistrer
        </Button>

        {isEdit ? (
          <Button
            className="h-12 w-full border-red-200 text-red-700 hover:bg-red-50"
            disabled={!userId || !building || isSaving || isDeleting}
            onClick={() => {
              setFormError(null);
              setFieldErrors({});

              if (!building || !userId) {
                return;
              }

              const confirmed = window.confirm(
                "Supprimer ce batiment ? Cette action est reversible uniquement via synchro / admin.",
              );

              if (!confirmed) {
                return;
              }

              setIsDeleting(true);

              void import("@/features/buildings/services/local-building-editor")
                .then((localBuildingEditorModule) =>
                  localBuildingEditorModule.deleteBuilding({
                    buildingId: building.id,
                    userId,
                  }),
                )
                .then(() => {
                  router.push("/batiments?notice=batiment-supprime");
                })
                .catch((error: unknown) => {
                  setFormError(
                    error instanceof Error ? error.message : "Suppression impossible",
                  );
                })
                .finally(() => {
                  setIsDeleting(false);
                });
            }}
            type="button"
            variant="outline"
          >
            {isDeleting ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" className="size-4" />
            )}
            Supprimer
          </Button>
        ) : null}
      </section>
    </div>
  );
}
