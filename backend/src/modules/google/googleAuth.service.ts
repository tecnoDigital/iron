import { google } from "googleapis";
import type { Credentials } from "google-auth-library";

import { oauthConfig } from "../../config/oauth";
import { type GoogleConnectionStatus } from "./google.types";
import { loadGoogleTokenSnapshot, saveGoogleTokenSnapshot } from "./googleToken.store";

const OAUTH_SCOPES = ["openid", "email", "profile"];

export class GoogleAuthService {
  private oauthClient = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri
  );

  isConfigured(): boolean {
    return Boolean(oauthConfig.clientId && oauthConfig.clientSecret && oauthConfig.redirectUri);
  }

  buildAuthUrl(state: string): string {
    return this.oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: OAUTH_SCOPES,
      state,
      prompt: "consent"
    });
  }

  async exchangeCodeForLogin(code: string): Promise<{ email: string | null; tokens: Credentials }> {
    const tokenResponse = await this.oauthClient.getToken(code);
    const tokens = tokenResponse.tokens;
    const idToken = tokens.id_token;

    if (!idToken || !oauthConfig.clientId) {
      return { email: null, tokens };
    }

    const verification = await this.oauthClient.verifyIdToken({
      idToken,
      audience: oauthConfig.clientId
    });

    const payload = verification.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return { email: null, tokens };
    }

    return { email: payload.email.toLowerCase(), tokens };
  }

  saveTokens(tokens: Credentials): void {
    const existingSnapshot = loadGoogleTokenSnapshot();
    const refreshToken = tokens.refresh_token ?? existingSnapshot?.refreshToken;

    if (!refreshToken) {
      return;
    }

    saveGoogleTokenSnapshot({
      refreshToken,
      accessToken: tokens.access_token ?? undefined,
      expiryDate: tokens.expiry_date ?? undefined,
      scope: tokens.scope ?? undefined,
      updatedAt: new Date().toISOString()
    });
  }

  async getConnectionStatus(): Promise<GoogleConnectionStatus> {
    if (!this.isConfigured()) {
      return "no_google_auth";
    }

    const snapshot = loadGoogleTokenSnapshot();
    if (!snapshot?.refreshToken) {
      return "reauth_required";
    }

    if (snapshot.accessToken && snapshot.expiryDate && snapshot.expiryDate > Date.now() + 60_000) {
      return "connected";
    }

    try {
      this.oauthClient.setCredentials({
        refresh_token: snapshot.refreshToken
      });

      const token = await this.oauthClient.getAccessToken();
      if (!token.token) {
        return "reauth_required";
      }

      this.saveTokens({
        ...this.oauthClient.credentials,
        refresh_token: snapshot.refreshToken
      });

      return "connected";
    } catch {
      return "reauth_required";
    }
  }
}
