import { useAuth } from '../context/AuthContext';

/**
 * Central RBAC permission map — derived from the RBAC spec's Final Access Matrix.
 * Keys are semantic permission names; values are arrays of roles that have that permission.
 */
const PERMISSION_MAP = {
  // ── Live Auction ────────────────────────────────────────────────────────────
  VIEW_LIVE_AUCTION:      ['SPECTATOR', 'PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],
  VIEW_CURRENT_PLAYER:    ['SPECTATOR', 'PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],
  VIEW_TIMER:             ['SPECTATOR', 'PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],
  VIEW_BID_HISTORY:       ['SPECTATOR', 'PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],
  VIEW_TEAMS:             ['SPECTATOR', 'PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],
  VIEW_FINAL_ROSTERS:     ['SPECTATOR', 'PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],

  // ── Bidding ─────────────────────────────────────────────────────────────────
  BID:                    ['TEAM_MANAGER', 'SUPER_ADMIN'],
  BLIND_BID:              ['TEAM_MANAGER', 'SUPER_ADMIN'],

  // ── Player Portal ───────────────────────────────────────────────────────────
  EDIT_OWN_PROFILE:       ['PLAYER', 'SUPER_ADMIN'],
  UPLOAD_PHOTO:           ['PLAYER', 'SUPER_ADMIN'],
  UPDATE_JERSEY_NAME:     ['PLAYER', 'SUPER_ADMIN'],
  UPDATE_POSITIONS:       ['PLAYER', 'SUPER_ADMIN'],
  WITHDRAW_REGISTRATION:  ['PLAYER', 'SUPER_ADMIN'],
  VIEW_AUCTION_RESULT:    ['PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],

  // ── Team Manager ────────────────────────────────────────────────────────────
  VIEW_OWN_BUDGET:        ['TEAM_MANAGER', 'SUPER_ADMIN'],
  VIEW_OWN_TEAM:          ['TEAM_MANAGER', 'SUPER_ADMIN'],
  VIEW_REMAINING_SLOTS:   ['TEAM_MANAGER', 'SUPER_ADMIN'],
  VIEW_ALL_PLAYERS:       ['TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],
  VIEW_PLAYER_DETAILS:    ['TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],
  VIEW_AUCTION_HISTORY:   ['TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],
  CHANGE_OWN_PASSWORD:    ['PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'],

  // ── Podium Admin ────────────────────────────────────────────────────────────
  LAUNCH_PLAYER:          ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  SELECT_UNSOLD_PLAYER:   ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  CONFIGURE_TIMER:        ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  CONFIGURE_AUCTION_MODE: ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  START_AUCTION:          ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  PAUSE_TIMER:            ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  RESUME_TIMER:           ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  ROLLBACK_BID:           ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  CANCEL_AUCTION:         ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  FORCE_SELL_PLAYER:      ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  DECLARE_WINNER:         ['PODIUM_ADMIN', 'SUPER_ADMIN'],
  MOVE_NEXT_PLAYER:       ['PODIUM_ADMIN', 'SUPER_ADMIN'],

  // ── Super Admin ─────────────────────────────────────────────────────────────
  CREATE_TEAM:            ['SUPER_ADMIN'],
  DELETE_TEAM:            ['SUPER_ADMIN'],
  EDIT_TEAM:              ['SUPER_ADMIN'],
  CREATE_MANAGER:         ['SUPER_ADMIN'],
  DELETE_MANAGER:         ['SUPER_ADMIN'],
  RESET_MANAGER_PASSWORD: ['SUPER_ADMIN'],
  APPROVE_PLAYER:         ['SUPER_ADMIN'],
  BAN_PLAYER:             ['SUPER_ADMIN'],
  EDIT_ANY_PLAYER:        ['SUPER_ADMIN'],
  FREEZE_REGISTRATION:    ['SUPER_ADMIN'],
  OPEN_REGISTRATION:      ['SUPER_ADMIN'],
  CREATE_SESSION:         ['SUPER_ADMIN'],
  EDIT_SESSION:           ['SUPER_ADMIN'],
  DELETE_SESSION:         ['SUPER_ADMIN'],
  CREATE_POSITION:        ['SUPER_ADMIN'],
  CREATE_CATEGORY:        ['SUPER_ADMIN'],
  CREATE_BID_TIER:        ['SUPER_ADMIN'],
  CONFIGURE_BUDGET:       ['SUPER_ADMIN'],
  CONFIGURE_EVENT:        ['SUPER_ADMIN'],
  CREATE_PODIUM_ADMIN:    ['SUPER_ADMIN'],
  MANAGE_ROLES:           ['SUPER_ADMIN'],
  MANAGE_PERMISSIONS:     ['SUPER_ADMIN'],
  VIEW_REPORTS:           ['SUPER_ADMIN'],
  EXPORT_REPORTS:         ['SUPER_ADMIN'],
  OVERRIDE_ANY_PERMISSION:['SUPER_ADMIN'],
  REPLACE_ANY_IMAGE:      ['SUPER_ADMIN'],
};

/**
 * usePermission hook
 *
 * Returns a `can(permission)` function that returns true if the current user
 * has the given permission, false otherwise.
 *
 * Also returns `role` (current user's role) and `isAtLeast(role)` for
 * hierarchy-based checks.
 *
 * @example
 * const { can, isAtLeast } = usePermission();
 * can('BID')           // true for TEAM_MANAGER, SUPER_ADMIN
 * can('PAUSE_TIMER')   // true for PODIUM_ADMIN, SUPER_ADMIN
 * isAtLeast('TEAM_MANAGER') // true for TEAM_MANAGER, PODIUM_ADMIN, SUPER_ADMIN
 */
const ROLE_HIERARCHY = ['SPECTATOR', 'PLAYER', 'TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'];

export function usePermission() {
  const { user } = useAuth();

  const role = user?.role || 'SPECTATOR';

  const can = (permission) => {
    const allowedRoles = PERMISSION_MAP[permission];
    if (!allowedRoles) return false;
    return allowedRoles.includes(role);
  };

  const isAtLeast = (minRole) => {
    const userIndex = ROLE_HIERARCHY.indexOf(role);
    const minIndex = ROLE_HIERARCHY.indexOf(minRole);
    if (userIndex === -1 || minIndex === -1) return false;
    return userIndex >= minIndex;
  };

  const hasAnyRole = (...roles) => roles.includes(role);

  return { can, isAtLeast, hasAnyRole, role };
}

export default usePermission;
