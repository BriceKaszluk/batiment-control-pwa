export const buildingNoticeKeys = [
  "batiment-cree",
  "batiment-enregistre",
  "batiment-supprime",
] as const;

export type BuildingNoticeKey = (typeof buildingNoticeKeys)[number];

export type BuildingNotice = {
  description: string;
  title: string;
};

const buildingNotices: Record<BuildingNoticeKey, BuildingNotice> = {
  "batiment-cree": {
    description: "Le batiment a ete sauvegarde localement.",
    title: "Batiment cree",
  },
  "batiment-enregistre": {
    description: "Les modifications ont ete sauvegardees localement.",
    title: "Batiment enregistre",
  },
  "batiment-supprime": {
    description: "Le batiment a ete marque comme supprime localement.",
    title: "Batiment supprime",
  },
};

export function getBuildingNotice(
  key: string | null,
): BuildingNotice | null {
  if (!isBuildingNoticeKey(key)) {
    return null;
  }

  return buildingNotices[key];
}

function isBuildingNoticeKey(key: string | null): key is BuildingNoticeKey {
  return (
    typeof key === "string" &&
    buildingNoticeKeys.includes(key as BuildingNoticeKey)
  );
}
