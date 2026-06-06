import type { ChecklistResult, Control, PhotoUpload } from "@/types/domain";

export const maxLocalPhotoSizeBytes = 8 * 1024 * 1024;

export type ControlQualityRatingTone =
  | "success"
  | "positive"
  | "warning"
  | "danger";

export function getControlStatusLabel(status: Control["status"]) {
  if (status === "completed") {
    return "Termine";
  }

  if (status === "canceled") {
    return "Annule";
  }

  return "Brouillon";
}

export function getControlQualityRatingLabel(
  qualityRating: NonNullable<Control["qualityRating"]>,
) {
  if (qualityRating === "satisfying") {
    return "Satisfaisant";
  }

  if (qualityRating === "acceptable") {
    return "Acceptable";
  }

  if (qualityRating === "to_improve") {
    return "A ameliorer";
  }

  return "Insatisfaisant";
}

export function getControlQualityRatingTone(
  qualityRating: NonNullable<Control["qualityRating"]>,
): ControlQualityRatingTone {
  if (qualityRating === "satisfying") {
    return "success";
  }

  if (qualityRating === "acceptable") {
    return "positive";
  }

  if (qualityRating === "to_improve") {
    return "warning";
  }

  return "danger";
}

export function getChecklistResultStatusLabel(
  status: ChecklistResult["status"],
) {
  if (status === "compliant") {
    return "Conforme";
  }

  if (status === "non_compliant") {
    return "Non conforme";
  }

  return "Non applicable";
}

export function getPhotoUploadStatusLabel(status: PhotoUpload["status"]) {
  if (status === "processing") {
    return "Upload en cours";
  }

  if (status === "synced") {
    return "Upload termine";
  }

  if (status === "error") {
    return "Erreur upload";
  }

  return "Upload en attente";
}
