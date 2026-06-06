import { z } from "zod";

export const loginFormSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Email invalide."),
    password: z.string().min(1, "Mot de passe requis."),
  })
  .strict();

export const signUpFormSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Email invalide."),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caracteres.")
      .max(128, "Le mot de passe est trop long."),
    passwordConfirmation: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

export type LoginFormInput = z.infer<typeof loginFormSchema>;
export type SignUpFormInput = z.infer<typeof signUpFormSchema>;
