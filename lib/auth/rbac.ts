/**
 * Role-based access — CLIENT MIRROR ONLY.
 *
 * The security boundary is the server. This module exists so the client can route correctly and
 * hide affordances the user can't use. It must NEVER be the only thing standing between a user and
 * a protected resource — every protected route and mutation is re-checked server-side.
 *
 * Three separate identity realms (deliberately not interchangeable):
 *   - consumer   : fans + creators (the main app)
 *   - staff      : moderation/admin, via staff SSO
 *   - enterprise : scouts, separate enterprise auth
 */

export type Realm = "consumer" | "staff" | "enterprise";

export type Role = "fan" | "creator" | "moderator" | "admin" | "scout";

export type Session = {
  userId: string;
  realm: Realm;
  roles: Role[];
  /** Server-truth entitlements (verification badge, feature gates). */
  entitlements: Record<string, boolean>;
};

const ROUTE_GROUP_REALM: Record<string, Realm> = {
  "(app)": "consumer",
  "(admin)": "staff",
  "(enterprise)": "enterprise",
};

export function canAccessRouteGroup(session: Session | null, group: string): boolean {
  if (group === "(marketing)") return true; // public
  const required = ROUTE_GROUP_REALM[group];
  if (!required) return true;
  return session?.realm === required;
}

export function hasRole(session: Session | null, role: Role): boolean {
  return Boolean(session?.roles.includes(role));
}

export function isEntitled(session: Session | null, key: string): boolean {
  return Boolean(session?.entitlements[key]);
}
