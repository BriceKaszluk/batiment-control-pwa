export type LoginFormState = {
  message: string | null;
  status: "idle" | "error";
};

export const initialLoginFormState: LoginFormState = {
  message: null,
  status: "idle",
};
