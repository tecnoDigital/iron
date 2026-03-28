import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

const deriveKey = (secret: string): Buffer => {
  return createHash("sha256").update(secret).digest();
};

export const encryptWithKey = (value: string, secret: string): string => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
};

export const decryptWithKey = (value: string, secret: string): string => {
  const [ivBase64, authTagBase64, encryptedBase64] = value.split(":");

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};

export const encrypt = (value: string): string => encryptWithKey(value, env.SESSION_SECRET);

export const decrypt = (value: string): string => decryptWithKey(value, env.SESSION_SECRET);
