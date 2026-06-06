type HeaderReader = {
  get: (name: string) => string | null;
};

const defaultAuthenticatedPath = "/dashboard";

export function createAuthConfirmUrl(
  origin: string,
  next = defaultAuthenticatedPath,
): string {
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("next", sanitizeAuthNextPath(next));

  return url.toString();
}

export function getRequestOrigin(headers: HeaderReader): string {
  const origin = headers.get("origin");

  if (origin) {
    return origin;
  }

  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost ?? headers.get("host");

  if (!host) {
    return "http://localhost:3000";
  }

  const forwardedProto = headers.get("x-forwarded-proto") ?? "https";

  return `${forwardedProto}://${host}`;
}

export function sanitizeAuthNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return defaultAuthenticatedPath;
  }

  try {
    const parsedUrl = new URL(value, "https://batiment-control.local");

    if (parsedUrl.origin !== "https://batiment-control.local") {
      return defaultAuthenticatedPath;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return defaultAuthenticatedPath;
  }
}
