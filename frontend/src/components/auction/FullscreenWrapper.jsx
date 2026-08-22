import { useState, useRef, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';

/**
 * FullscreenWrapper — wraps content with a fullscreen toggle button.
 *
 * showToggle=false hides the button until a broadcast video is actually
 * playing (per-page decision), so fullscreen is offered ONLY for video
 * playback. If the user is ALREADY in fullscreen the button stays visible
 * so they can always exit.
 */
export default function FullscreenWrapper({ children, className = "", buttonClassName = "", showToggle = true }) {
    const wrapperRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleFullscreenChange = () => {
        const isNowFullscreen = !!document.fullscreenElement;
        setIsFullscreen(isNowFullscreen);
    };

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!wrapperRef.current) return;

        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div ref={wrapperRef} className={["group relative w-full h-full bg-darkBg [&:fullscreen]:bg-black", className].filter(Boolean).join(" ")}>
            {children}
            {(showToggle || isFullscreen) && (
                <button
                    onClick={toggleFullscreen}
                    className={["absolute top-4 right-4 z-[1000] p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all", buttonClassName].filter(Boolean).join(" ")}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
            )}
        </div>
    );
}