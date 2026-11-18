/**
 * NativeWind is used for layout/spacing only. Colors come from the shared TS
 * tokens (@inbox/ui-core) via ThemeProvider — per the migration plan we do NOT
 * rely on CSS variables / alpha modifiers inside NativeWind (risk item #1).
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
