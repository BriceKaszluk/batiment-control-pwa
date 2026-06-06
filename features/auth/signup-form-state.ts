export type SignUpFormState = {
  message: string | null;
  status: "idle" | "error" | "success";
};

export const initialSignUpFormState: SignUpFormState = {
  message: null,
  status: "idle",
};
