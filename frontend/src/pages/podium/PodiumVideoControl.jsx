import { useState, useEffect } from 'react';
import { Play, StopCircle, Video, Film, Clock } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuction } from '../../context/AuctionContext';

export default function PodiumVideoControl() {
    const { socket } = useSocket();
    const { triggerToast } = useAuction();
    const [inputUrl, setInputUrl] = useState('');
    const [loopDuration, setLoopDuration] = useState(15);
    const [isLooping, setIsLooping] = useState(false);

    useEffect(() => {
        if (!socket) return;
        const handleStatus = (status) => {
            if (typeof status?.isLooping === 'boolean') {
                setIsLooping(status.isLooping);
            }
        };
        socket.on('podium:intro-loop-status', handleStatus);
        socket.emit('podium:get-intro-loop-status');
        return () => socket.off('podium:intro-loop-status', handleStatus);
    }, [socket]);

    const handlePlay = () => {
        if (inputUrl.trim() && socket) {
            // Send a socket event that the PodiumDashboard will listen to
            socket.emit('podium:video-control', { url: inputUrl.trim() });
            triggerToast('Video broadcast is starting...', 'success');
        }
    };

    const handleStop = () => {
        if (socket) {
            // Send a null URL to stop the video
            socket.emit('podium:video-control', { url: null });
            triggerToast('Video broadcast stopped.', 'info');
        }
        setInputUrl('');
    };

    const handleStartIntroLoop = () => {
        if (socket) {
            socket.emit('podium:intro-loop-control', { action: 'start', durationMinutes: loopDuration });
            triggerToast(`Starting player intro loop for ${loopDuration} minutes.`, 'success');
        }
    };

    const handleStopIntroLoop = () => {
        if (socket) {
            socket.emit('podium:intro-loop-control', { action: 'stop' });
            triggerToast('Player intro loop stopped.', 'info');
        }
    };

    return (
        <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <h1 className="text-2xl font-black font-heading text-white flex items-center gap-3">
                    <Video className="w-6 h-6 text-blue-400" />
                    Podium Video Broadcast Control
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                    Control a video feed on the main podium screen instead of the default animation. Use a YouTube or Google Drive link.
                </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <div className="max-w-lg mx-auto space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Bidding Video URL</h4>
                    <p className="text-xs text-slate-400">
                        Paste a YouTube or Google Drive video link below. The video will autoplay on the main screen without controls.
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            placeholder="YouTube or Google Drive URL"
                            className="glass-input flex-1 px-3 py-2 rounded-lg text-sm"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handlePlay}
                            disabled={!inputUrl.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition disabled:opacity-50"
                        >
                            <Play className="w-5 h-5" /> Play Broadcast
                        </button>
                        <button
                            onClick={handleStop}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition"
                        >
                            <StopCircle className="w-5 h-5" /> Stop Broadcast
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <div className="max-w-lg mx-auto space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Film className="w-4 h-4 text-purple-400" />
                        Pre-Auction Player Intro Loop
                    </h4>
                    <p className="text-xs text-slate-400">
                        Automatically cycle through unsold players with their reveal animation to build hype before the event starts.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Loop Duration (minutes)</label>
                        <input
                            type="number"
                            value={loopDuration}
                            onChange={(e) => setLoopDuration(Math.max(1, Number(e.target.value)))}
                            className="glass-input w-full px-3 py-2 rounded-lg text-sm"
                            disabled={isLooping}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleStartIntroLoop}
                            disabled={isLooping}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition disabled:opacity-50"
                        >
                            <Play className="w-5 h-5" /> Start Intro Loop
                        </button>
                        <button
                            onClick={handleStopIntroLoop}
                            disabled={!isLooping}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition disabled:opacity-50"
                        >
                            <StopCircle className="w-5 h-5" /> Stop Loop
                        </button>
                    </div>
                    {isLooping && (
                        <p className="text-xs text-center text-emerald-400 animate-pulse font-semibold">Intro loop is currently active on the main display.</p>
                    )}
                </div>
            </div>
        </div>
    );
}