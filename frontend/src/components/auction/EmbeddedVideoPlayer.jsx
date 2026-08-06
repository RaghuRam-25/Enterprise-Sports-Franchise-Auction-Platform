import React from 'react';

const YouTubeEmbed = ({ videoId, startOffset = 0 }) => {
    // Parameters used to hide YouTube logo, controls, and start at synchronized live offset
    const startSec = Math.max(0, Math.floor(startOffset));
    const params = `autoplay=1&controls=0&rel=0&iv_load_policy=3&loop=1&playlist=${videoId}${startSec > 0 ? `&start=${startSec}` : ''}`;
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
    let videoId = null;
    let fileId = null;

    try {
        const urlObject = new URL(url);
        if (urlObject.hostname.includes('youtube.com') || urlObject.hostname.includes('youtu.be')) {
            videoId = urlObject.hostname.includes('youtu.be')
                ? urlObject.pathname.slice(1)
                : urlObject.searchParams.get('v');
        } else if (urlObject.hostname.includes('drive.google.com')) {
            const pathParts = urlObject.pathname.split('/');
            const dIndex = pathParts.indexOf('d');
            if (dIndex !== -1 && pathParts.length > dIndex + 1) {
                fileId = pathParts[dIndex + 1];
            }
        }
    } catch (error) {
        console.error("Invalid URL for video player:", error);
        return <div className="text-white p-4 flex items-center justify-center h-full">Invalid or unsupported video URL.</div>;
    }

    // Calculate synchronized live start offset in seconds
    let startOffset = 0;
    if (videoState === 'PAUSED') {
        startOffset = pausedAtPosition || 0;
    } else if (videoStartTime && videoState === 'PLAYING') {
        startOffset = Math.max(0, (Date.now() - videoStartTime) / 1000);
    }

    if (videoId) return <YouTubeEmbed videoId={videoId} startOffset={startOffset} />;
    if (fileId) return <GoogleDriveEmbed fileId={fileId} />;

    return <div className="text-white p-4 flex items-center justify-center h-full">Please use a YouTube or Google Drive link.</div>;
}