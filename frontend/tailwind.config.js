/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                /* ── Base surfaces (single source of truth) ──────────────── */
                darkBg: "#050505",            // main page background
                secondaryBg: "#0B0B0B",       // nav / sidebar / raised page surface
                cardBg: "#101010",            // card background
                surfaceHover: "#151515",      // row / item hover
                surfaceActive: "#1A1A1A",     // pressed / selected item
                darkGreenSurface: "#12200E",  // elevated dark-green accent surface

                /* ── Brand ───────────────────────────────────────────────── */
                neonGreen: "#58D20A",         // primary accent
                neonGreenHover: "#72F21A",    // hover / active accent
                successGreen: "#35C759",      // success state

                /* ── Text tiers ──────────────────────────────────────────── */
                primaryText: "#F5F5F5",
                secondaryText: "#A3A3A3",
                mutedText: "#666666",

                /* ── Lines ───────────────────────────────────────────────── */
                cardBorder: "#222222",
                borderStrong: "#333333",

                /* ── Status ──────────────────────────────────────────────── */
                urgentRed: "#B00012",         // live / urgent / destructive
                urgentRedText: "#FF5C5C",     // readable red for text on dark
                warningGold: "#F4C542",       // warnings & highlighted bid amounts
            },
            fontFamily: {
                heading: ['Inter', 'system-ui', 'sans-serif'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            fontSize: {
                '2xs': ['0.65rem', { lineHeight: '1rem' }],
            },
            borderRadius: {
                'card': '1rem',
                'panel': '1.25rem',
            },
            boxShadow: {
                'card': '0 8px 30px rgba(0, 0, 0, 0.45)',
                'card-hover': '0 12px 35px rgba(0, 0, 0, 0.6)',
                'accent': '0 4px 16px rgba(88, 210, 10, 0.3)',
                'accent-hover': '0 8px 24px rgba(114, 242, 26, 0.45)',
            },
        },
    },
    plugins: [],
};
