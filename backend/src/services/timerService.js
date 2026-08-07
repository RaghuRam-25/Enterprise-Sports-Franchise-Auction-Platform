/**
 * TimerService — Server-authoritative auction countdown.
 *
 * Single source of truth for the auction clock. Runs on a `setInterval` and
 * persists its state in memory, so the countdown survives client refreshes /
 * reconnects. Every second it updates `endsAt` (an absolute epoch ms deadline)
 * so a freshly-connected client can reconstruct the same remaining time without
 * waiting for the next server tick.
 *
 * State machine:   'IDLE' -> 'RUNNING' -> 'PAUSED' -> 'ENDED'
 *                  'RUNNING' -> 'ENDED' (auto) | 'PAUSED' <-> 'RUNNING'
 */

class TimerService {
  constructor() {
    this.timerInterval = null;
    this.duration = 60;
    this.remainingSeconds = this.duration;
    this.isPaused = false;
    this.status = 'IDLE'; // 'IDLE' | 'RUNNING' | 'PAUSED' | 'ENDED'
    this.endsAt = null;   // epoch ms the countdown would hit zero (while running)
    this.pausedRemaining = 0; // exact snapshot held while paused
    this.onTick = null;
    this.onEnd = null;
    this.completedOnce = false;
  }

  /**
   * Start a new countdown. Clears any existing interval first, guaranteeing the
   * timer is freshly initialised on every player push (fixes the "timer does
   * not start" symptom when a stale interval/state was lingering).
   */
  start(durationSeconds, onTick, onEnd) {
    this.stop();
    this.duration = Math.max(1, Number(durationSeconds) || 60);
    this.remainingSeconds = this.duration;
    this.isPaused = false;
    this.status = 'RUNNING';
    this.endsAt = Date.now() + this.duration * 1000;
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.completedOnce = false;

    this.timerInterval = setInterval(() => this._tick(), 1000);

    // Emit an immediate, authoritative snapshot so every client (including the
    // pushing podium admin) sees the timer as RUNNING right away — they no
    // longer have to wait for the first 1s tick.
    if (this.onTick) this.onTick(this.remainingSeconds);
  }

  _tick() {
    if (this.isPaused) {
      return;
    }

    // Derive remaining time from the monotonic deadline when possible. This
    // keeps accuracy even if the Node process is momentarily blocked and the
    // interval fires late (no drift, no "skipped digits").
    if (this.endsAt && this.remainingSeconds > 0) {
      this.remainingSeconds = Math.max(0, Math.round((this.endsAt - Date.now()) / 1000));
    } else if (this.remainingSeconds > 0) {
      this.remainingSeconds -= 1;
    }

    if (this.onTick) this.onTick(this.remainingSeconds);

    if (this.remainingSeconds === 0) {
      this.status = 'ENDED';
      this.stop();
      if (this.onEnd && !this.completedOnce) {
        this.completedOnce = true;
        this.onEnd();
      }
    }
  }

  pause() {
    if (this.status !== 'RUNNING' || this.isPaused) return;
    this.isPaused = true;
    this.status = 'PAUSED';
    // Freeze an exact snapshot so resume maths stay precise.
    this.pausedRemaining = Math.max(0, Math.round((this.endsAt - Date.now()) / 1000));
    this.remainingSeconds = this.pausedRemaining;
  }

  resume() {
    if (this.status !== 'PAUSED') return;
    this.isPaused = false;
    this.status = 'RUNNING';
    // Re-anchor the deadline to the remaining time so a pause doesn't shorten
    // or extend the countdown.
    this.endsAt = Date.now() + (this.remainingSeconds || this.duration) * 1000;
  }

  resetTimer(duration) {
    // Bid-placement rest: keep the clock ticking but give it a second wind.
    const target = Math.max(1, Number(duration) || this.duration);
    this.remainingSeconds = target;
    if (this.status === 'RUNNING' && !this.isPaused) {
      this.endsAt = Date.now() + target * 1000;
    }
  }

  addSeconds(seconds) {
    const secs = Number(seconds) || 0;
    this.remainingSeconds = Math.min(this.duration, this.remainingSeconds + secs);
    if (this.status === 'RUNNING' && !this.isPaused) {
      this.endsAt = Date.now() + this.remainingSeconds * 1000;
    }
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getState() {
    // For a running clock, always report the live derived value so any client
    // polling state gets up-to-date time even between ticks.
    let remaining = this.remainingSeconds;
    if (this.status === 'RUNNING' && !this.isPaused && this.endsAt) {
      remaining = Math.max(0, Math.round((this.endsAt - Date.now()) / 1000));
    }
    return {
      duration: this.duration,
      remainingSeconds: remaining,
      isPaused: this.isPaused,
      status: this.status,
      endsAt: this.endsAt,
      serverTime: Date.now(),
    };
  }
}

export const timerService = new TimerService();