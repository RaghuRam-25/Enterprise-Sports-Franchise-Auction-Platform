import { useState, useRef, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export default function FullscreenWrapper({ children, className = "", buttonClassName = "" }) {
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
        <div ref={wrapperRef} className={["group relative w-full h-full bg-slate-950 [&:fullscreen]:bg-black", className].filter(Boolean).join(" ")}>
            {children}
            <button
                onClick={toggleFullscreen}
                className={["absolute top-4 right-4 z-[1000] p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all", buttonClassName].filter(Boolean).join(" ")}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
        </div>
    );
}