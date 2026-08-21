import { useState, useEffect } from 'react';
import {
  Play, Pause, StopCircle, Video, Film, Clock, SkipForward, SkipBack, RotateCcw, Repeat, CheckCircle2, UserCheck
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuction } from '../../context/AuctionContext';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';

export default function PodiumVideoControl() {
  const { socket } = useSocket();
  const { triggerToast, players } = useAuction();

  // Video State
  const [inputUrl, setInputUrl] = useState('');
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

  // Intro Loop State
  const [introState, setIntroState] = useState({
    isPlaying: false,
    isPaused: false,
    currentIndex: 0,
    players: [],
    durationPerPlayer: 4,
    repeat: false
  });
  const [durationPerPlayer, setDurationPerPlayer] = useState(4);
  const [repeatMode, setRepeatMode] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleVideoSync = (data) => {
      setActiveVideoUrl(data?.url || null);
    };

    const handleIntroSync = (state) => {
      if (state) {
        setIntroState(state);
      }
    };

    const handleAuctionState = (state) => {
      if (state) {
        if (state.videoUrl !== undefined) setActiveVideoUrl(state.videoUrl);
        if (state.introLoopState) setIntroState(state.introLoopState);
      }
    };

    socket.on('podium:video-control', handleVideoSync);
    socket.on('podium:intro-loop-state', handleIntroSync);
    socket.on('auction:state', handleAuctionState);

    // Initial sync
    socket.emit('auction:sync-request');

    return () => {
      socket.off('podium:video-control', handleVideoSync);
      socket.off('podium:intro-loop-state', handleIntroSync);
      socket.off('auction:state', handleAuctionState);
    };
  }, [socket]);

  // Video Action Handlers
  const handlePlayVideo = () => {
    if (inputUrl.trim() && socket) {
      socket.emit('podium:video-control', { url: inputUrl.trim() });
      triggerToast('Video broadcast started across all client displays!', 'success');
    }
  };

  const handleStopVideo = () => {
    if (socket) {
      socket.emit('podium:video-control', { url: null });
      triggerToast('Video broadcast stopped immediately.', 'info');
    }
    setInputUrl('');
  };

  const handlePauseVideo = () => {
    if (socket) {
      socket.emit('podium:video-control', { action: 'pause' });
      triggerToast('Video broadcast paused.', 'info');
    }
  };

  const handleResumeVideo = () => {
    if (socket) {
      socket.emit('podium:video-control', { action: 'resume' });
      triggerToast('Video broadcast resumed.', 'success');
    }
  };

  // Intro Sequence Action Handlers
  const handleStartIntro = () => {
    if (socket) {
      socket.emit('podium:intro-loop-control', {
        action: 'start',
        durationSeconds: Number(durationPerPlayer) || 4,
        repeat: repeatMode
      });
      triggerToast('Player intro presentation started on all connected screens!', 'success');
    }
  };

  const handlePauseIntro = () => {
    if (socket) {
      socket.emit('podium:intro-loop-control', { action: 'pause' });
      triggerToast('Player intro loop paused.', 'info');
    }
  };

  const handleResumeIntro = () => {
    if (socket) {
      socket.emit('podium:intro-loop-control', { action: 'resume' });
      triggerToast('Player intro loop resumed.', 'success');
    }
  };

  const handleStopIntro = () => {
    if (socket) {
      socket.emit('podium:intro-loop-control', { action: 'stop' });
      triggerToast('Player intro sequence stopped.', 'info');
    }
  };

  const handleSkipNext = () => {
    if (socket) {
      socket.emit('podium:intro-loop-control', { action: 'skip', direction: 1 });
    }
  };

  const handleSkipPrev = () => {
    if (socket) {
      socket.emit('podium:intro-loop-control', { action: 'prev' });
    }
  };

  const handleRestartIntro = () => {
    if (socket) {
      socket.emit('podium:intro-loop-control', { action: 'restart' });
      triggerToast('Restarting intro sequence from first player.', 'info');
    }
  };

  const currentIntroPlayer = introState.players?.[introState.currentIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder">
        <h1 className="text-2xl font-black font-heading text-white flex items-center gap-3">
          <Video className="w-6 h-6 text-neonGreen" />
          Podium Video &amp; Player Intro Controls
        </h1>
      </div>

      {/* ── SECTION 1: VIDEO BROADCAST CONTROL ───────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder space-y-4">
        <div className="flex items-center justify-between border-b border-cardBorder pb-3">
          <h3 className="text-sm font-black font-heading text-white uppercase tracking-wider flex items-center gap-2">
            <Video className="w-4 h-4 text-neonGreen" />
            Live Video Broadcast Control
          </h3>
          {activeVideoUrl ? (
            <span className="px-3 py-1 bg-neonGreen/10 border border-neonGreen/30 text-neonGreen text-xs font-mono font-bold rounded-full animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-neonGreen" /> BROADCASTING LIVE
            </span>
          ) : (
            <span className="px-3 py-1 bg-cardBg text-mutedText border border-cardBorder text-xs font-bold rounded-full">
              OFFLINE
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube or Video URL (e.g. https://www.youtube.com/watch?v=...)"
              className="glass-input flex-1 px-4 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePlayVideo}
              disabled={!inputUrl.trim()}
              className="btn-primary flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider rounded-xl shadow-lg disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-current" /> Play Everywhere
            </button>

            {activeVideoUrl && (
              <>
                <button
                  onClick={handlePauseVideo}
                  className="btn-secondary flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider rounded-xl shadow-lg"
                >
                  <Pause className="w-4 h-4 fill-current" /> Pause
                </button>
                <button
                  onClick={handleResumeVideo}
                  className="btn-primary flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider rounded-xl shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" /> Resume
                </button>
              </>
            )}

            <button
              onClick={handleStopVideo}
              disabled={!activeVideoUrl && !inputUrl.trim()}
              className="btn-danger flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider rounded-xl shadow-lg disabled:opacity-40"
            >
              <StopCircle className="w-4 h-4" /> Stop Broadcast
            </button>
          </div>
        </div>

        {activeVideoUrl && (
          <div className="p-3 bg-cardBg/80 rounded-xl border border-cardBorder text-xs flex items-center justify-between">
            <span className="text-secondaryText font-mono truncate">Active URL: {activeVideoUrl}</span>
            <button
              onClick={handleStopVideo}
              className="text-urgentRedText hover:text-urgentRedText font-bold underline text-[11px] ml-2 flex-shrink-0"
            >
              Kill Feed
            </button>
          </div>
        )}
      </div>

      {/* ── SECTION 2: AUTOMATED PLAYER INTRO ANIMATION SEQUENCE ───────── */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder space-y-4">
        <div className="flex items-center justify-between border-b border-cardBorder pb-3">
          <h3 className="text-sm font-black font-heading text-white uppercase tracking-wider flex items-center gap-2">
            <Film className="w-4 h-4 text-warningGold" />
            Automated Player Intro Sequence
          </h3>
          {introState.isPlaying ? (
            <span className={`px-3 py-1 border text-xs font-mono font-bold rounded-full flex items-center gap-1.5 ${
              introState.isPaused
                ? 'bg-warningGold/10 border-warningGold/30 text-warningGold'
                : 'bg-warningGold/10 border-warningGold/30 text-warningGold animate-pulse'
            }`}>
              <span className={`w-2 h-2 rounded-full ${introState.isPaused ? 'bg-warningGold' : 'bg-warningGold'}`} />
              {introState.isPaused ? 'INTRO PAUSED' : 'INTRO RUNNING'}
            </span>
          ) : (
            <span className="px-3 py-1 bg-cardBg text-mutedText border border-cardBorder text-xs font-bold rounded-full">
              INTRO IDLE
            </span>
          )}
        </div>

        {/* Configuration Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-darkBg/60 p-4 rounded-xl border border-cardBorder">
          <div>
            <label className="block text-xs font-semibold text-secondaryText mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neonGreen" /> Card Display Duration (seconds)
            </label>
            <input
              type="number"
              min={3}
              max={10}
              value={durationPerPlayer}
              onChange={(e) => setDurationPerPlayer(Math.max(3, Math.min(10, Number(e.target.value))))}
              className="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start sm:gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-secondaryText font-semibold">
              <input
                type="checkbox"
                checked={repeatMode}
                onChange={(e) => setRepeatMode(e.target.checked)}
                className="w-4 h-4 accent-warningGold rounded"
              />
              <Repeat className="w-4 h-4 text-warningGold" />
              Repeat Playlist
            </label>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!introState.isPlaying ? (
            <button
              onClick={handleStartIntro}
              className="btn-primary flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider rounded-xl shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" /> Start Intro Sequence
            </button>
          ) : introState.isPaused ? (
            <button
              onClick={handleResumeIntro}
              className="btn-primary flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider rounded-xl shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" /> Resume Sequence
            </button>
          ) : (
            <button
              onClick={handlePauseIntro}
              className="btn-secondary flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider rounded-xl shadow-lg"
            >
              <Pause className="w-4 h-4 fill-current" /> Pause Sequence
            </button>
          )}

          <button
            onClick={handleSkipPrev}
            disabled={!introState.isPlaying}
            className="btn-secondary flex items-center justify-center gap-1 px-3 py-3 text-xs rounded-xl disabled:opacity-40"
            title="Previous Player"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handleSkipNext}
            disabled={!introState.isPlaying}
            className="btn-secondary flex items-center justify-center gap-1 px-3 py-3 text-xs rounded-xl disabled:opacity-40"
            title="Next Player"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={handleRestartIntro}
            disabled={!introState.isPlaying}
            className="btn-secondary flex items-center justify-center gap-1 px-3 py-3 text-xs rounded-xl disabled:opacity-40"
            title="Restart from First Player"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleStopIntro}
            disabled={!introState.isPlaying}
            className="btn-danger flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider rounded-xl shadow-lg disabled:opacity-40"
          >
            <StopCircle className="w-4 h-4" /> Stop Intro
          </button>
        </div>

        {/* Current Active Intro Card Status */}
        {introState.isPlaying && currentIntroPlayer && (
          <div className="p-4 bg-cardBg/90 rounded-2xl border border-warningGold/40 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <img
                src={getImageUrl(currentIntroPlayer.imageUrl, playerFallback('emerald'))}
                alt={currentIntroPlayer.name}
                className="w-12 h-12 rounded-xl object-cover border border-warningGold"
              />
              <div>
                <span className="text-[10px] font-mono text-warningGold uppercase font-bold">
                  Player {introState.currentIndex + 1} of {introState.players.length}
                </span>
                <h4 className="font-black text-white text-base leading-tight">{currentIntroPlayer.name}</h4>
                <p className="text-xs text-secondaryText">
                  {currentIntroPlayer.category || 'B Grade'} &bull; {currentIntroPlayer.primaryPosition || 'Player'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-mutedText font-bold uppercase">Base Price</span>
              <p className="font-mono font-black text-neonGreen text-sm">
                ৳{(currentIntroPlayer.basePrice || 2000000).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
