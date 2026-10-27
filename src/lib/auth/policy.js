import { permissionScope, ROLES } from "../../config/permissions.js";

export function hasPermission(role, permission) {
  if (!Object.values(ROLES).includes(role)) return false;
  return permissionScope(role, permission) !== false;
}
