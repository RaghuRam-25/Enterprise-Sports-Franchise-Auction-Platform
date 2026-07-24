class TimerService {
  constructor() {
    this.timerInterval = null;
    this.duration = 60;
    this.remainingSeconds = 60;
    this.isPaused = false;
    this.status = 'IDLE'; // 'IDLE' | 'RUNNING' | 'PAUSED' | 'ENDED'
    this.onTick = null;
    this.onEnd = null;
  }

  start(durationSeconds, onTick, onEnd) {
    this.stop();
    this.duration = durationSeconds || 60;
    this.remainingSeconds = this.duration;
    this.isPaused = false;
    this.status = 'RUNNING';
    this.onTick = onTick;
    this.onEnd = onEnd;

    this.timerInterval = setInterval(() => {
      if (!this.isPaused && this.remainingSeconds > 0) {
        this.remainingSeconds -= 1;
        if (this.onTick) this.onTick(this.remainingSeconds);

        if (this.remainingSeconds === 0) {
          this.status = 'ENDED';
          this.stop();
          if (this.onEnd) this.onEnd();
        }
      }
    }, 1000);
  }

  pause() {
    this.isPaused = true;
    this.status = 'PAUSED';
  }

  resume() {
    if (this.remainingSeconds > 0) {
      this.isPaused = false;
      this.status = 'RUNNING';
    }
  }

  resetTimer(duration) {
    this.remainingSeconds = duration || this.duration;
  }

  addSeconds(seconds) {
    this.remainingSeconds = Math.min(this.duration, this.remainingSeconds + seconds);
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getState() {
    return {
      duration: this.duration,
      remainingSeconds: this.remainingSeconds,
      isPaused: this.isPaused,
      status: this.status
    };
  }
}

export const timerService = new TimerService();
