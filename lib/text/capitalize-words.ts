const wordStartPattern = /(^|[\s'’`/\-([{])(\p{L})/gu;

export function capitalizeWordStarts(value: string) {
  return value.replace(wordStartPattern, (_match, prefix: string, letter: string) =>
    `${prefix}${letter.toLocaleUpperCase("fr")}`,
  );
}

export function capitalizeWords(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(wordStartPattern, (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase("fr")}`,
    );
}
