import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { sanitizeAuthNextPath } from "@/features/auth/redirect-url";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const emailOtpTypes = new Set<string>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = sanitizeAuthNextPath(requestUrl.searchParams.get("next"));

  if (!isSupabaseConfigured()) {
    redirect("/login?auth=missing-config");
  }

  const supabase = await createClient();
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = parseEmailOtpType(requestUrl.searchParams.get("type"));
  const code = requestUrl.searchParams.get("code");

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      redirect(next);
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?auth=confirmation-error");
}

function parseEmailOtpType(value: string | null): EmailOtpType | null {
  if (!value || !emailOtpTypes.has(value)) {
    return null;
  }

  return value as EmailOtpType;
}
