import type { Config } from "tailwindcss";

/** Shared Tailwind preset driven by the CSS-variable design tokens. */
export const preset: Partial<Config> = {
  content: [],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-subtle": "var(--surface-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        text: "var(--text)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-hover": "var(--accent-hover)",
        "accent-subtle": "var(--accent-subtle)",
        success: "rgb(var(--success-rgb) / <alpha-value>)",
        warning: "rgb(var(--warning-rgb) / <alpha-value>)",
        danger: "rgb(var(--danger-rgb) / <alpha-value>)",
        "glass-border": "var(--glass-border)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        xs: ["12px", "16px"],
        sm: ["13px", "18px"],
        base: ["14px", "20px"],
        md: ["16px", "24px"],
        lg: ["18px", "26px"],
        xl: ["22px", "28px"],
        "2xl": ["28px", "34px"],
        reading: ["16px", "26px"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
      },
      borderRadius: {
        control: "10px",
        dialog: "18px",
      },
      boxShadow: {
        pop: "var(--shadow-pop)",
        glow: "var(--shadow-glow)",
      },
      spacing: {
        px4: "4px",
        px8: "8px",
        px12: "12px",
        px16: "16px",
        px24: "24px",
        px32: "32px",
        px48: "48px",
        px64: "64px",
      },
      maxWidth: {
        feed: "720px",
        detail: "760px",
        settings: "640px",
        "auth-form": "400px",
      },
      transitionDuration: {
        fast: "150ms",
      },
      transitionTimingFunction: {
        out: "ease-out",
      },
    },
  },
  plugins: [],
};

export default preset;
