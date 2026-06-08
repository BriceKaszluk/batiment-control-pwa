export function getBlockingFormMessage<TField extends string>({
  fallback,
  fieldErrors,
  fieldMessages = {},
}: {
  fallback: string;
  fieldErrors: Partial<Record<TField, string>>;
  fieldMessages?: Partial<Record<TField, string>>;
}): string {
  const firstField = (Object.keys(fieldErrors) as TField[]).find((field) =>
    Boolean(fieldErrors[field]),
  );

  if (!firstField) {
    return fallback;
  }

  return fieldMessages[firstField] ?? fieldErrors[firstField] ?? fallback;
}

export function getNativeInputValidationMessage(
  label: string,
  input: HTMLInputElement,
): string {
  const fieldLabel = label.trim() || "Champ";

  if (input.validity.valueMissing) {
    return `${fieldLabel} requis.`;
  }

  if (input.validity.typeMismatch) {
    return `${fieldLabel} invalide.`;
  }

  if (input.validity.tooShort && input.minLength > 0) {
    return `${fieldLabel} doit contenir au moins ${input.minLength} caracteres.`;
  }

  if (input.validity.tooLong && input.maxLength > 0) {
    return `${fieldLabel} est trop long.`;
  }

  return input.validationMessage || `${fieldLabel} invalide.`;
}
