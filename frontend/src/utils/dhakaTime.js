/*
 * ── Asia/Dhaka time helpers ───────────────────────────────────────────────────
 * Registration/auction schedules are semantically defined in Bangladesh time.
 * Dhaka has no DST and is permanently UTC+6, so a fixed offset is exact.
 *
 * Storage rule: every timestamp is persisted as an absolute UTC ISO string;
 * conversion happens ONLY at the UI edges (picker ⇄ storage, display).
 */

export const DHAKA_TZ = 'Asia/Dhaka';
export const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/**
 * datetime-local picker value ("2025-08-23T22:00") interpreted as Asia/Dhaka
 * wall-clock → absolute UTC ISO string. Invalid input returns null.
 */
export const toDhakaIso = (pickerValue) => {
  if (!pickerValue) return null;
  const withSeconds = String(pickerValue).length === 16 ? `${pickerValue}:00` : String(pickerValue);
  const d = new Date(`${withSeconds}+06:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * Absolute ISO instant → datetime-local value showing Asia/Dhaka wall-clock
 * (for <input type="datetime-local"> pickers).
 */
export const isoToDhakaPicker = (iso) => {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return '';
  const d = new Date(ms + DHAKA_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/** Absolute ISO instant → "23 Aug 2026, 10:00 PM" in Asia/Dhaka. */
export const formatDhakaDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

/** Milliseconds until the given instant (0 if passed). */
export const msUntil = (iso, nowMs = Date.now()) => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return isNaN(t) || t <= nowMs ? 0 : t - nowMs;
};

/** Compact countdown, e.g. "2d 4h", "3h 12m", "45s". */
export const formatCountdown = (ms) => {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};
