import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        card: '#1e293b',
        critical: '#ef4444',
        elevated: '#f97316',
        moderate: '#facc15',
        low: '#22c55e',
        insufficient: '#94a3b8',
      },
    },
  },
  plugins: [],
}

export default config
