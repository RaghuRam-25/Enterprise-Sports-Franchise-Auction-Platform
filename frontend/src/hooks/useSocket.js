import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

// নির্দিষ্ট কোনো সকেট ইভেন্ট শোনার জন্য এই হুকটি ব্যবহার করা হবে
export const useSocketEvent = (eventName, callback) => {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.on(eventName, callback);

        // ক্লিনআপ ফাংশন
        return () => {
            socket.off(eventName, callback);
        };
    }, [socket, eventName, callback]);
};