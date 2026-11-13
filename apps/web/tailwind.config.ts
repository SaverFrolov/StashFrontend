import type { Config } from "tailwindcss";
import preset from "@inbox/ui/preset";

export default {
  presets: [preset as Config],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
} satisfies Config;
