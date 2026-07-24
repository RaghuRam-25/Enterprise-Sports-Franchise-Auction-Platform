import { useState, useEffect } from 'react';

export const useTimer = (initialSeconds, onTimesUp) => {
    const [seconds, setSeconds] = useState(initialSeconds);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval = null;

        if (isActive && seconds > 0) {
            interval = setInterval(() => {
                setSeconds((prevSeconds) => prevSeconds - 1);
            }, 1000);
        } else if (seconds === 0 && isActive) {
            setIsActive(false);
            if (onTimesUp) onTimesUp();
        }

        return () => clearInterval(interval);
    }, [isActive, seconds, onTimesUp]);

    const startTimer = (newSecs) => {
        if (newSecs) setSeconds(newSecs);
        setIsActive(true);
    };

    const pauseTimer = () => setIsActive(false);

    const resetTimer = (newSecs) => {
        setIsActive(false);
        setSeconds(newSecs || initialSeconds);
    };

    return { seconds, isActive, startTimer, pauseTimer, resetTimer };
};