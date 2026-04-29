import type { Config } from "tailwindcss";

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
        coral: {
          50:  "#FAECE7",
          100: "#F5D8CF",
          200: "#EDBAA8",
          400: "#F5A882",
          500: "#F0997B",
          600: "#D85A30",
          800: "#993C1D",
        },
        success: "#1D9E75",
        danger:  "#E24B4A",
      },

      // ── Typography ──────────────────────────────────────────
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI",
          "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "1.4" }],
        xs:    ["11px", { lineHeight: "1.4" }],
        sm:    ["13px", { lineHeight: "1.6" }],
        base:  ["14px", { lineHeight: "1.6" }],
        md:    ["15px", { lineHeight: "1.5" }],
        lg:    ["17px", { lineHeight: "1.4" }],
        xl:    ["20px", { lineHeight: "1.3" }],
        "2xl": ["24px", { lineHeight: "1.2" }],
      },

      // ── Spacing / Heights ───────────────────────────────────
      height: {
        9:  "36px",   // sm button
        11: "44px",   // md button
        13: "52px",   // lg button
      },

      // ── Border radius ───────────────────────────────────────
      borderRadius: {
        input: "12px",
        card:  "16px",
        pill:  "20px",
        "2xl": "20px",
        "3xl": "24px",
      },

      // ── Border width ────────────────────────────────────────
      borderWidth: {
        DEFAULT: "1px",
        "0":     "0",
        "0.5":   "0.5px",   // default state
        "1":     "1px",
        "1.5":   "1.5px",   // focus / active state
        "2":     "2px",
      },

      // ── Box shadow ──────────────────────────────────────────
      boxShadow: {
        card:    "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        elevated:"0 4px 16px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)",
        fab:     "0 4px 20px 0 rgb(216 90 48 / 0.35)",
        modal:   "0 -4px 32px 0 rgb(0 0 0 / 0.12)",
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
        "slide-up":    "slideUp 280ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "slide-down":  "slideDown 240ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "fade-in":     "fadeIn 200ms ease forwards",
        shimmer:       "shimmer 1.4s linear infinite",
        "spin-slow":   "spin 1s linear infinite",
        pulse:         "pulse 1.5s ease-in-out infinite",
        "pop-in":      "popIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "star-fill":   "starFill 200ms ease",
        shake:         "shake 500ms cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        "draw-check":  "drawCheck 500ms ease forwards",
        "scale-in":    "scaleIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
