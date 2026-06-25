// ═══════════════════════════════════════════════════════════════
// TAILWIND CONFIG — UptimeOps
// Cyberpunk command-center color palette
// ═══════════════════════════════════════════════════════════════

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // ── UptimeOps Cyberpunk Palette ──
      colors: {
        // Void background
        void: {
          DEFAULT: "#050507",
          light: "#0a0a0f",
          lighter: "#111118",
        },
        // Surface cards
        surface: {
          DEFAULT: "#0e0e14",
          hover: "#15151d",
          border: "#1e1e2a",
        },
        // Neon Lime (primary accent)
        lime: {
          DEFAULT: "#d1ff00",
          dark: "#b3d900",
          light: "#e0ff4d",
          dim: "#d1ff0040",
        },
        // Cyan (secondary accent)
        cyan: {
          DEFAULT: "#00f0ff",
          dark: "#00c4cc",
          light: "#4df5ff",
          dim: "#00f0ff40",
        },
        // Magenta (alert / danger)
        magenta: {
          DEFAULT: "#ff0055",
          dark: "#cc0044",
          light: "#ff4d88",
          dim: "#ff005540",
        },
        // shadcn/ui compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      // ── Typography ──
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },

      // ── Spacing ──
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // ── Animation ──
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'spin-slow': 'spin 8s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 3s linear infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #d1ff0040' },
          '100%': { boxShadow: '0 0 20px #d1ff0080, 0 0 40px #d1ff0040' },
        },
        scan: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },

      // ── Border Radius ──
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },

  plugins: [
    require("tailwindcss-animate"),
  ],
};

export default config;
