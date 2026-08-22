import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import soundManager from './auction/soundManager';

/**
 * SoundToggle — global sound on/off switch.
 *
 * Controls EVERY sound in the app (auction SFX, ambient loops, countdown
 * ticks — all playback funnels through soundManager). The preference is
 * persisted to localStorage and every mounted toggle stays in sync via
 * soundManager.subscribe.
 */
export default function SoundToggle({ className = '', iconClassName = 'w-4 h-4' }) {
  const [muted, setMuted] = useState(soundManager.isMuted());

  // Keep every mounted toggle in sync (navbar, live pages, settings…)
  useEffect(() => soundManager.subscribe(setMuted), []);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !soundManager.isMuted();
        soundManager.setMuted(next);
        if (!next) {
          // Tiny confirmation blip so the user hears that sound is back on.
          soundManager.play('countdown');
        }
      }}
      title={muted ? 'Sound is OFF — click to enable' : 'Sound is ON — click to mute'}
      aria-pressed={!muted}
      aria-label={muted ? 'Enable sound' : 'Mute sound'}
      className={`p-2 rounded-xl border transition flex items-center justify-center shrink-0 ${
        muted
          ? 'bg-surfaceHover/60 border-borderStrong text-secondaryText hover:text-white hover:border-warningGold/40'
          : 'bg-neonGreen/10 border-neonGreen/30 text-neonGreenHover hover:bg-neonGreen/20'
      } ${className}`}
    >
      {muted ? <VolumeX className={iconClassName} /> : <Volume2 className={iconClassName} />}
    </button>
  );
}
