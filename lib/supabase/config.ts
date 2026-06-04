export type SupabasePublicConfig = {
  publishableKey: string;
  url: string;
};

type RuntimeEnv = Record<string, string | undefined>;

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY_ENV = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export function getSupabasePublicConfig(
  env?: RuntimeEnv,
): SupabasePublicConfig | null {
  const url = readEnvValue(
    env ? env[SUPABASE_URL_ENV] : process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const publishableKey = readEnvValue(
    env
      ? env[SUPABASE_PUBLISHABLE_KEY_ENV]
      : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!url || !publishableKey) {
    return null;
  }

  return { publishableKey, url };
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error(
      `Missing ${SUPABASE_URL_ENV} or ${SUPABASE_PUBLISHABLE_KEY_ENV}.`,
    );
  }

  return config;
}

export function isSupabaseConfigured(
  env?: RuntimeEnv,
): boolean {
  return getSupabasePublicConfig(env) !== null;
}

function readEnvValue(value: string | undefined): string | null {
  const trimmedValue = value?.trim();

  return trimmedValue && !trimmedValue.includes("your-") ? trimmedValue : null;
}
