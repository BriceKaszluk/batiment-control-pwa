import { buildingAreas } from "@/lib/domain/options";

const areaLabels: Record<(typeof buildingAreas)[number], string> = {
  basement_access: "Acces circulation caves",
  common_areas: "Locaux communs",
  elevator: "Ascenseur",
  floor_landings: "Palier d'etages",
  garage: "Garage",
  hall: "Hall",
  outdoor: "Abords",
  stairs: "Montee escalier",
};

export function getBuildingAreaLabel(area: (typeof buildingAreas)[number]) {
  return areaLabels[area];
}
