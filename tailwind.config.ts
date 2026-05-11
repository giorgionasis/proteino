import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Colors ──────────────────────────────────────────────
      colors: {
        // Primary coral — from Figma (#FE6F5E is the true accent)
        coral: {
          50:  "#FFF5EC",   // warm cream bg
          100: "#FDEADA",
          200: "#FBBBA3",
          400: "#FF9980",
          500: "#FF836E",
          600: "#FE6F5E",   // ← true primary (Figma)
          700: "#E05A4A",
          800: "#C04538",
        },

        // Zinc scale — Figma uses these for ALL text/border/surface
        zinc: {
          950: "#18181b",
          800: "#27272a",
          700: "#3f3f46",
          600: "#52525b",
          500: "#71717a",
          400: "#a1a1aa",
          300: "#d4d4d8",
          200: "#e4e4e7",
          100: "#f4f4f5",
          50:  "#fafafa",
        },

        // Semantic
        success:  "#1D9E75",
        danger:   "#E24B4A",
        warning:  "#FF9123",

        // iOS-style input/search background
        "ios-gray": "#f2f2f7",

        // Notification badge
        "badge-red": "#c51501",

        // Gold / achievement
        gold: "#F8D160",
      },

      // ── Typography ──────────────────────────────────────────
      fontFamily: {
        sans: ["Open Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      fontWeight: {
        normal:    "400",
        medium:    "500",
        semibold:  "600",
        bold:      "700",
        extrabold: "800",
        black:     "900",
      },
      fontSize: {
        "2xs": ["9px",  { lineHeight: "1.3" }],
        xs:    ["12px", { lineHeight: "1.4" }],
        sm:    ["14px", { lineHeight: "1.6" }],
        base:  ["16px", { lineHeight: "1.5" }],
        md:    ["18px", { lineHeight: "1.4" }],
        lg:    ["20px", { lineHeight: "1.3" }],
        xl:    ["22px", { lineHeight: "1.3" }],
        "2xl": ["24px", { lineHeight: "1.2" }],
        "3xl": ["26px", { lineHeight: "1.2" }],
        "4xl": ["32px", { lineHeight: "1.1" }],
        "5xl": ["36px", { lineHeight: "1.0" }],
      },

      // ── Spacing / Heights ───────────────────────────────────
      height: {
        9:  "36px",   // sm button
        11: "44px",   // md button / inputs
        13: "52px",   // lg button
        14: "56px",   // auth inputs / auth CTA button
      },

      // ── Border radius ───────────────────────────────────────
      borderRadius: {
        xs:    "4px",    // small badges, indicators
        sm:    "8px",    // stat cards, small cards
        input: "12px",   // auth inputs
        card:  "16px",   // large cards
        "2xl": "20px",   // preview cards
        search:"50px",   // search pill input
        full:  "9999px", // avatars, circular elements
      },

      // ── Border width ────────────────────────────────────────
      borderWidth: {
        DEFAULT: "1px",
        "0":     "0",
        "0.5":   "0.5px",
        "1":     "1px",
        "1.5":   "1.5px",
        "2":     "2px",
      },

      // ── Box shadow ──────────────────────────────────────────
      boxShadow: {
        card:    "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        elevated:"0 4px 16px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)",
        fab:     "0 4px 20px 0 rgb(254 111 94 / 0.35)",
        modal:   "0 -4px 32px 0 rgb(0 0 0 / 0.12)",
        header:  "0 1px 0 0 #e4e4e7",
      },

      // ── Easings (named tokens) ──────────────────────────────
      // ease-spring  : iOS-style decel; default for bottom sheets, page transitions
      // ease-soft    : Material-standard; default for general UI transitions
      // ease-pop     : overshoots slightly past 1.0 — for "tactile" reward
      //                interactions (likes, bookmarks, achievement unlocks)
      transitionTimingFunction: {
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
        soft:   "cubic-bezier(0.4, 0, 0.2, 1)",
        pop:    "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      // ── Animations ──────────────────────────────────────────
      keyframes: {
        slideUp: {
          "0%":   { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        slideDown: {
          "0%":   { transform: "translateY(0)",    opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition:  "400px 0" },
        },
        spin: {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
        popIn: {
          "0%":   { transform: "scale(0.85)", opacity: "0" },
          "70%":  { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)",    opacity: "1" },
        },
        starFill: {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "15%":      { transform: "translateX(-6px)" },
          "45%":      { transform: "translateX(5px)" },
          "70%":      { transform: "translateX(-3px)" },
          "85%":      { transform: "translateX(2px)" },
        },
        drawCheck: {
          "0%":   { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        scaleIn: {
          "0%":   { transform: "scale(0)", opacity: "0" },
          "60%":  { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)",  opacity: "1" },
        },
      },
      animation: {
        "slide-up":   "slideUp 280ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "slide-down": "slideDown 240ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "fade-in":    "fadeIn 200ms ease forwards",
        shimmer:      "shimmer 1.4s linear infinite",
        "spin-slow":  "spin 1s linear infinite",
        pulse:        "pulse 1.5s ease-in-out infinite",
        "pop-in":     "popIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "star-fill":  "starFill 200ms ease",
        shake:        "shake 500ms cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        "draw-check": "drawCheck 500ms ease forwards",
        "scale-in":   "scaleIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
