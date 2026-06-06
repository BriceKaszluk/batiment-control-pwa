import { describe, expect, it } from "vitest";

import {
  loginFormSchema,
  signUpFormSchema,
} from "@/features/auth/auth-schemas";

describe("auth schemas", () => {
  it("normalizes login email while preserving the password", () => {
    const input = loginFormSchema.parse({
      email: " TEST@EXAMPLE.COM ",
      password: " pass with spaces ",
    });

    expect(input).toEqual({
      email: "test@example.com",
      password: " pass with spaces ",
    });
  });

  it("requires a strong enough signup password", () => {
    const result = signUpFormSchema.safeParse({
      email: "test@example.com",
      password: "short",
      passwordConfirmation: "short",
    });

    expect(result.success).toBe(false);
  });

  it("requires matching signup passwords", () => {
    const result = signUpFormSchema.safeParse({
      email: "test@example.com",
      password: "password-123",
      passwordConfirmation: "password-456",
    });

    expect(result.success).toBe(false);
  });
});
