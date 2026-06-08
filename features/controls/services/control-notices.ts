export const controlNoticeKeys = ["controle-termine"] as const;

export type ControlNoticeKey = (typeof controlNoticeKeys)[number];

export type ControlNotice = {
  description: string;
  title: string;
};

const controlNotices: Record<ControlNoticeKey, ControlNotice> = {
  "controle-termine": {
    description:
      "Il reste disponible dans Controles aujourd'hui. A partir de demain, tu le retrouveras dans Historique.",
    title: "Controle enregistre",
  },
};

export function getControlNotice(key: string | null): ControlNotice | null {
  if (!isControlNoticeKey(key)) {
    return null;
  }

  return controlNotices[key];
}

function isControlNoticeKey(key: string | null): key is ControlNoticeKey {
  return (
    typeof key === "string" &&
    controlNoticeKeys.includes(key as ControlNoticeKey)
  );
}
