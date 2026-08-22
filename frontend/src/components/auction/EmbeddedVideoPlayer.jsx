import { useEffect, useMemo, useRef, useState } from 'react';
import soundManager from './soundManager';

const YouTubeEmbed = ({ videoId, startOffset = 0, initiallyMuted = false, playerRef }) => {
    // Parameters used to hide YouTube logo/controls and start at the
    // synchronized live offset. `enablejsapi=1` lets us mute/unmute via
    // postMessage WITHOUT reloading the iframe (a src change restarts playback).
    // `mute=1` only applies on FIRST load when the global preference is off.
    const startSec = Math.max(0, Math.floor(startOffset));
    const params = [
        'autoplay=1',
        'controls=0',
        'rel=0',
        'iv_load_policy=3',
        'enablejsapi=1',
        'loop=1',
        `playlist=${videoId}`,
        initiallyMuted ? 'mute=1' : '',
        startSec > 0 ? `start=${startSec}` : '',
    ].filter(Boolean).join('&');
    const embedUrl = `https://www.youtube.com/embed/${videoId}?${params}`;

    // Top and bottom bars are hidden using a CSS trick
    const wrapperStyle = {
        position: 'relative',
        width: '100%',
        height: '100%', // Fill parent height
        overflow: 'hidden',
        minHeight: '600px', // Maintain a minimum height for non-fullscreen view
    };

    const iframeStyle = {
        position: 'absolute',
        top: '-60px', // To crop the top part
        left: '0',
        width: '100%',
        height: 'calc(100% + 120px)', // Increase height to allow for cropping
        border: 'none',
    };

    return (
        <div style={wrapperStyle}>
            <iframe
                ref={playerRef}
                style={iframeStyle}
                src={embedUrl}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        </div>
    );
};

const GoogleDriveEmbed = ({ fileId }) => {
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    return (
        <iframe
            src={embedUrl}
            width="100%"
            height="100%" // Fill parent height
            style={{ border: 'none', minHeight: '600px' }} // Maintain minimum height for non-fullscreen
            allow="autoplay"
            title="Google Drive video player"
        ></iframe>
    );
};

export default function EmbeddedVideoPlayer({ url, videoStartTime, videoState, pausedAtPosition }) {
    // Initial global preference — baked into the FIRST src only (muted
    // autoplay is allowed by browsers; unmuted needs the postMessage path).
    const [initiallyMuted] = useState(() => soundManager.isMuted());
    const iframeRef = useRef(null);

    // ── Mute/unmute WITHOUT restarting playback ──────────────────────────────
    // Changing the iframe src reloads the video from the start. Instead we
    // drive the YouTube IFrame API through postMessage, which flips audio
    // instantly and leaves the playback position untouched.
    useEffect(() => {
        const applyMute = (muted) => {
            const win = iframeRef.current?.contentWindow;
            if (!win) return;
            try {
                win.postMessage(
                    JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }),
                    '*'
                );
            } catch { /* iframe not ready yet — harmless */ }
        };
        applyMute(soundManager.isMuted());
        return soundManager.subscribe(applyMute);
    }, []);

    // Parse once per url change (hooks stay unconditional — never early-return before them)
    const parsed = useMemo(() => {
        try {
            const urlObject = new URL(url);
            if (urlObject.hostname.includes('youtube.com') || urlObject.hostname.includes('youtu.be')) {
                const id = urlObject.hostname.includes('youtu.be')
                    ? urlObject.pathname.slice(1)
                    : urlObject.searchParams.get('v');
                if (id) return { videoId: id };
            }
            if (urlObject.hostname.includes('drive.google.com')) {
                const pathParts = urlObject.pathname.split('/');
                const dIndex = pathParts.indexOf('d');
                if (dIndex !== -1 && pathParts.length > dIndex + 1) {
                    return { fileId: pathParts[dIndex + 1] };
                }
            }
        } catch (error) {
            console.error("Invalid URL for video player:", error);
        }
        return {};
    }, [url]);

    // ── Freeze the sync offset per play session ──────────────────────────────
    // The live offset depends on Date.now(); recomputing it on EVERY render
    // would change the iframe `src` every second on pages with 1s timers
    // (e.g. the landing countdown) — reloading the player and killing
    // playback. Memoized on stable session inputs only.
    const startOffset = useMemo(() => {
        if (videoState === 'PAUSED') return pausedAtPosition || 0;
        if (videoStartTime && videoState === 'PLAYING') {
            return Math.max(0, Math.floor((Date.now() - videoStartTime) / 1000));
        }
        return 0;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, parsed.videoId, parsed.fileId, videoState]);

    if (!parsed.videoId && !parsed.fileId) {
        return <div className="text-white p-4 flex items-center justify-center h-full">Please use a YouTube or Google Drive link.</div>;
    }

    if (parsed.videoId) {
        return (
            <YouTubeEmbed
                videoId={parsed.videoId}
                startOffset={startOffset}
                initiallyMuted={initiallyMuted}
                playerRef={iframeRef}
            />
        );
    }
    return <GoogleDriveEmbed fileId={parsed.fileId} />;
}
