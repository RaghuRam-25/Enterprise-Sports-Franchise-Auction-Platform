/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                /* ── Primary brand green (single source of truth) ────────── */
                primaryGreen: "#0B2B26",

                /* ── Base surfaces (single source of truth) ──────────────── */
                darkBg: "#050505",            // main page background
                secondaryBg: "#0B0B0B",       // nav / sidebar / raised page surface
                cardBg: "#101010",            // card background
                surfaceHover: "#151515",      // row / item hover
                surfaceActive: "#1A1A1A",     // pressed / selected item
                darkGreenSurface: "#0B2B26",  // elevated dark-green accent surface

                /* ── Brand (all green surfaces/borders/glows = #0B2B26) ──── */
                neonGreen: "#0B2B26",         // legacy alias → primary green
                neonGreenHover: "#0B2B26",    // legacy alias → primary green
                successGreen: "#0B2B26",      // success state surface

                /* ── Text tiers ──────────────────────────────────────────── */
                primaryText: "#FFFFFF",
                softText: "#D8E5DF",
                secondaryText: "#D8E5DF",
                mutedText: "#9FB3AA",
                faintText: "#9FB3AA",

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
                display: ['Barlow Condensed', 'Inter', 'system-ui', 'sans-serif'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
                algerian: ['Algerian', 'Cinzel', 'Georgia', 'serif'],
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
                'accent': '0 4px 16px rgba(11, 43, 38, 0.60)',
                'accent-hover': '0 8px 24px rgba(11, 43, 38, 0.85)',
                'green-glow': '0 0 20px rgba(11, 43, 38, 0.85)',
            },
        },
    },
    plugins: [],
};
