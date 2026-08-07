import type { Config } from "tailwindcss";

/**
 * Tanduri design tokens — mirrors docs/DESIGN.md §2 (Stitch UI kit palette).
 * All values are copied verbatim from the §2.1/§2.2 tables; do not edit ad hoc.
 * Loaded by Tailwind v4 via `@config` in src/app/globals.css.
 */
const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#16A34A",
        "primary-container": "#00873A",
        "primary-fixed": "#7FFC97",
        "primary-fixed-dim": "#62DF7D",
        "on-primary": "#FFFFFF",
        "on-primary-container": "#F7FFF2",
        "on-primary-fixed": "#002109",
        "on-primary-fixed-variant": "#005320",
        "inverse-primary": "#62DF7D",

        surface: "#FFFFFF",
        "surface-bright": "#F0FDEF",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#EAF7E9",
        "surface-container": "#E4F1E3",
        "surface-container-high": "#DFECDE",
        "surface-container-highest": "#D9E6D8",
        "surface-dim": "#D1DDD0",
        "surface-variant": "#D9E6D8",
        "on-surface": "#1F2A21",
        "on-surface-variant": "#3E4A3D",
        "inverse-surface": "#28332A",
        "inverse-on-surface": "#E7F4E6",
        background: "#F8FAF7",
        "on-background": "#131E16",
        outline: "#6E7B6C",
        "outline-variant": "#BDCABA",
        "surface-tint": "#006E2D",

        secondary: "#526256",
        "on-secondary": "#FFFFFF",
        "secondary-container": "#D5E7D8",
        "on-secondary-container": "#58685C",
        "secondary-fixed": "#D5E7D8",
        "secondary-fixed-dim": "#BACBBC",
        "on-secondary-fixed": "#101F15",
        "on-secondary-fixed-variant": "#3B4A3F",

        tertiary: "#2B673F",
        "on-tertiary": "#FFFFFF",
        "tertiary-container": "#458156",
        "on-tertiary-container": "#F6FFF4",
        "tertiary-fixed": "#B1F2BE",
        "tertiary-fixed-dim": "#96D5A3",
        "on-tertiary-fixed": "#00210D",
        "on-tertiary-fixed-variant": "#12512C",

        error: "#DC2626",
        "on-error": "#FFFFFF",
        "error-container": "#FEE2E2",
        "on-error-container": "#93000A",
        "danger-soft": "#FFDAD6",

        // aliases (DESIGN §2.1 final row / kanban spec §4.2)
        text: "#1F2A21",
        "text-muted": "#5B6B5F",
        bg: "#F8FAF7",
        "border-color": "#E3E8E3",
        "kanban-progress": "#E3A334",
        "kanban-complete": "#2E7D32",
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "12px",
        full: "9999px",
      },
      spacing: {
        "margin-desktop": "64px",
        "margin-mobile": "20px",
      },
      fontFamily: {
        headline: ['var(--font-plus-jakarta-sans)', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['var(--font-plus-jakarta-sans)', "ui-sans-serif", "system-ui", "sans-serif"],
        body: ['var(--font-plus-jakarta-sans)', "ui-sans-serif", "system-ui", "sans-serif"],
        button: ['var(--font-plus-jakarta-sans)', "ui-sans-serif", "system-ui", "sans-serif"],
        label: ['var(--font-space-mono)', "ui-monospace", "SFMono-Regular", "monospace"],
        "label-sm": ['var(--font-space-mono)', "ui-monospace", "SFMono-Regular", "monospace"],
        "body-md": ['var(--font-plus-jakarta-sans)', "ui-sans-serif", "system-ui", "sans-serif"],
        "body-lg": ['var(--font-plus-jakarta-sans)', "ui-sans-serif", "system-ui", "sans-serif"],
        "headline-md": ['var(--font-plus-jakarta-sans)', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.1em", fontWeight: "500" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        button: ["14px", { lineHeight: "20px", letterSpacing: "0.05em", fontWeight: "700" }],
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "display-lg-mobile": ["36px", { lineHeight: "42px", fontWeight: "700" }],
        "headline-md": ["32px", { lineHeight: "40px", fontWeight: "600" }],
        "display-2xl": ["80px", { lineHeight: "88px", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
    },
  },
};

export default config;