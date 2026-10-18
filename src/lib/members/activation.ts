/**
 * Single source of truth for member activation definitions.
 * An active/activated member is one who:
 * 1. Has isActive === true (account is not banned/deactivated)
 * 2. Has activatedAt !== null (has completed initial password change)
 */

export const activeMemberProfileWhere = {
  isActive: true,
  activatedAt: { not: null },
} as const;

export function isMemberActivated(member: {
  activatedAt?: Date | string | null;
  isActive?: boolean;
}): boolean {
  return Boolean(member.isActive !== false && member.activatedAt);
}
