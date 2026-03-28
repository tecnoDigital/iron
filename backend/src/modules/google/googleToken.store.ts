import { env } from "../../config/env";
import {
  GoogleTokensRepository,
  type StoredGoogleTokenRecord
} from "../../db/repositories/googleTokens.repository";
import { decryptWithKey, encryptWithKey } from "../../utils/crypto";

const googleTokensRepository = new GoogleTokensRepository();

export interface GoogleTokenSnapshot {
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
  scope?: string;
  updatedAt: string;
}

export const loadGoogleTokenSnapshot = (): GoogleTokenSnapshot | null => {
  try {
    const payload = googleTokensRepository.load();

    if (!payload) {
      return null;
    }

    return {
      refreshToken: decryptWithKey(payload.refreshTokenEncrypted, env.GOOGLE_TOKEN_ENCRYPTION_KEY),
      accessToken: payload.accessToken,
      expiryDate: payload.expiryDate,
      scope: payload.scope,
      updatedAt: payload.updatedAt
    };
  } catch {
    return null;
  }
};

export const saveGoogleTokenSnapshot = (snapshot: GoogleTokenSnapshot): void => {
  const payload: StoredGoogleTokenRecord = {
    refreshTokenEncrypted: encryptWithKey(snapshot.refreshToken, env.GOOGLE_TOKEN_ENCRYPTION_KEY),
    accessToken: snapshot.accessToken,
    expiryDate: snapshot.expiryDate,
    scope: snapshot.scope,
    updatedAt: snapshot.updatedAt
  };

  googleTokensRepository.save(payload);
};
