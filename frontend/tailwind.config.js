/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                darkBg: "#0b0f19",
                cardBg: "#131c2e",
                cardBorder: "rgba(255, 255, 255, 0.08)",
                neonGreen: "#10b981",
                neonBlue: "#3b82f6",
                neonGold: "#f59e0b",
                neonPurple: "#8b5cf6",
                dangerRed: "#ef4444",
            },
            fontFamily: {
                heading: ['Outfit', 'sans-serif'],
                sans: ['Plus Jakarta Sans', 'sans-serif'],
            },
        },
    },
    plugins: [],
};