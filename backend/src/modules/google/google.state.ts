import type { AuthState } from "../auth/auth.types";
import type { GoogleConnectionStatus } from "./google.types";

export type GoogleAuthState = Extract<AuthState, "NO_GOOGLE_AUTH" | "GOOGLE_CONNECTED" | "REAUTH_REQUIRED">;

export const mapGoogleConnectionToAuthState = (
  status: GoogleConnectionStatus
): GoogleAuthState => {
  if (status === "connected") {
    return "GOOGLE_CONNECTED";
  }

  if (status === "reauth_required") {
    return "REAUTH_REQUIRED";
  }

  return "NO_GOOGLE_AUTH";
};
