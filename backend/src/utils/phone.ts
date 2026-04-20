const MX_COUNTRY_CODE = "52";

export const normalizePhone = (rawPhone: string): string | null => {
  const digits = rawPhone.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  if (digits.length === 10) {
    return `+${MX_COUNTRY_CODE}${digits}`;
  }

  if (digits.length === 12 && digits.startsWith(MX_COUNTRY_CODE)) {
    return `+${digits}`;
  }

  return null;
};
