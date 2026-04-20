import { google } from "googleapis";

import { env } from "../../config/env";
import { oauthConfig } from "../../config/oauth";
import { loadGoogleTokenSnapshot } from "./googleToken.store";

const OAUTH_SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

type GoogleSheetRow = string[];

export class GoogleSheetsService {
  private oauthClient = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri
  );

  isConfigured(): boolean {
    return Boolean(
      oauthConfig.clientId && oauthConfig.clientSecret && oauthConfig.redirectUri && env.GOOGLE_SHEET_ID
    );
  }

  private parseMockRows(rawValue: string): GoogleSheetRow[] {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("google_sheet_mock_rows_invalid");
    }

    return parsed.map((row) => {
      if (!Array.isArray(row)) {
        return [];
      }

      return row.map((value) => String(value ?? ""));
    });
  }

  async readRows(range = process.env.GOOGLE_SHEET_RANGE ?? env.GOOGLE_SHEET_RANGE): Promise<GoogleSheetRow[]> {
    const mockRowsRaw = process.env.GOOGLE_SHEET_MOCK_ROWS ?? env.GOOGLE_SHEET_MOCK_ROWS;

    if (mockRowsRaw) {
      return this.parseMockRows(mockRowsRaw);
    }

    if (!this.isConfigured()) {
      throw new Error("google_sheet_not_configured");
    }

    const snapshot = loadGoogleTokenSnapshot();
    if (!snapshot?.refreshToken) {
      throw new Error("google_reauth_required");
    }

    this.oauthClient.setCredentials({
      refresh_token: snapshot.refreshToken,
      access_token: snapshot.accessToken,
      expiry_date: snapshot.expiryDate,
      scope: snapshot.scope
    });

    const sheets = google.sheets({ version: "v4", auth: this.oauthClient });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range,
      majorDimension: "ROWS"
    });

    const values = response.data.values ?? [];
    return values.map((row) => row.map((value) => String(value ?? "")));
  }

  getScopes(): string[] {
    return [...OAUTH_SCOPES];
  }
}
