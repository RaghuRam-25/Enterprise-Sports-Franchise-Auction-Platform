import { Player } from '../models/Player.js';
import { Team } from '../models/Team.js';
import { ManagerTargetPlayer } from '../models/ManagerTargetPlayer.js';
import { deleteCloudinaryAsset } from './imageService.js';

/**
 * Permanently delete a player record and every reference to it.
 *
 * Guarantees:
 *  1. The Player document is REMOVED from the database (hard delete) — list
 *     endpoints can never return it again.
 *  2. Referential integrity: the id is pulled from any Team.currentRoster
 *     (roster counts recomputed) and manager target-list entries are removed.
 *  3. Cloudinary asset cleanup via the stored imagePublicId — best effort and
 *     AFTER the database delete has succeeded; failures are logged, never
 *     thrown, so the API contract cannot be broken by an asset CDN outage.
 *  4. Idempotent: deleting an already-deleted player resolves cleanly with
 *     `{ found: false }` instead of crashing.
 *
 * @param {string} playerId       Player document id
 * @param {object} [io]           Optional Socket.IO instance for live refresh
 * @returns {{found:boolean, player:object|null, cloudinaryDeleted:boolean}}
 */
export const deletePlayerEverywhere = async (playerId, io = null) => {
  // 1. Hard delete from the database — single source of truth.
  //    findByIdAndDelete is atomic; a concurrent double-delete simply yields null.
  const player = await Player.findByIdAndDelete(playerId);

  if (!player) {
    return { found: false, player: null, cloudinaryDeleted: false };
  }

  const pid = player._id;

  try {
    // 2a. Remove the id from every roster that still references it.
    const teamsWithPlayer = await Team.find({ currentRoster: pid }).select('_id currentRoster');
    for (const team of teamsWithPlayer) {
      team.currentRoster.pull(pid);
      // Keep the denormalised counter consistent with the real array length.
      team.currentRosterCount = team.currentRoster.length;
      await team.save();
    }
  } catch (refErr) {
    // Player doc is already gone — reference cleanup issues must not resurrect
    // it nor fail the request; log for operators.
    console.error(`[playerCleanup] Reference cleanup failed for player ${pid}:`, refErr?.message || refErr);
  }

  try {
    // 2b. Remove the player from all managers' target lists.
    await ManagerTargetPlayer.deleteMany({ playerId: pid });
  } catch (tgtErr) {
    console.error(`[playerCleanup] Target-list cleanup failed for player ${pid}:`, tgtErr?.message || tgtErr);
  }

  // 3. Cloudinary asset cleanup AFTER successful DB deletion (best-effort).
  const cloudinaryDeleted = await deleteCloudinaryAsset(player.imagePublicId);

  // 4. Live refresh signal. The frontend's 'player:updated' handler performs a
  //    full refetch of /players, so open dashboards drop the deleted player
  //    immediately without any frontend change. ('player:deleted' is emitted
  //    as well for future consumers.)
  if (io) {
    io.emit('player:updated', { _id: pid, deleted: true });
    io.emit('player:deleted', { id: String(pid) });
  }

  return { found: true, player, cloudinaryDeleted };
};
