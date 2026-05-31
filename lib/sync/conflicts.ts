export function shouldUseIncomingVersion(
  currentUpdatedAt: string | null | undefined,
  incomingUpdatedAt: string,
) {
  if (!currentUpdatedAt) {
    return true;
  }

  return toTimestamp(incomingUpdatedAt) >= toTimestamp(currentUpdatedAt);
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid updatedAt timestamp: ${value}`);
  }

  return timestamp;
}
