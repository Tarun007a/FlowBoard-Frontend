export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }

  const normalized = role.toUpperCase().replace(/^ROLE_/, '');
  return normalized === 'ADMIN' || normalized === 'PLATFORM_ADMIN';
}
