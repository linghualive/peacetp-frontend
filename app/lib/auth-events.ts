export const AUTH_EXPIRED_EVENT = "peacetp:auth-expired";

export type AuthExpiredDetail = {
  message?: string;
};

export function emitAuthExpired(detail?: AuthExpiredDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AuthExpiredDetail>(AUTH_EXPIRED_EVENT, { detail }),
  );
}
