// ═══════════════════════════════════════════════════════════════
// TAILWIND CONFIG — UptimeOps v2.2
// Cyberpunk Void Theme — Exact Design Token Matrix
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
      // ── Cyberpunk Void Color Matrix ──
      colors: {
        // Deep Void Background
        void: {
          DEFAULT: "#0a0a0f",
          deep: "#050507",
          light: "#111118",
          card: "rgba(15, 23, 42, 0.6)",
        },
        // Glassmorphism Surface
        surface: {
          DEFAULT: "rgba(15, 23, 42, 0.6)",
          solid: "#0f172a",
          hover: "rgba(30, 41, 59, 0.5)",
          border: "#1e293b",
          borderDark: "#0f172a",
        },
        // Neon Lime — System Active / Normal Status
        lime: {
          DEFAULT: "#a3e635",
          dark: "#84cc16",
          light: "#bef264",
          dim: "rgba(163, 230, 53, 0.15)",
          glow: "rgba(163, 230, 53, 0.4)",
        },
        // Cyber Cyan — Informational / Analytical / Processing
        cyan: {
          DEFAULT: "#22d3ee",
          dark: "#06b6d4",
          light: "#67e8f9",
          dim: "rgba(34, 211, 238, 0.15)",
          glow: "rgba(34, 211, 238, 0.4)",
        },
        // Vivid Magenta — AI Intelligence Engine
        magenta: {
          DEFAULT: "#e879f9",
          dark: "#d946ef",
          light: "#f0abfc",
          dim: "rgba(232, 121, 249, 0.15)",
          glow: "rgba(232, 121, 249, 0.4)",
        },
        // Intense Rose — Breach / Emergency / Scanner Alert
        rose: {
          DEFAULT: "#f43f5e",
          dark: "#e11d48",
          light: "#fb7185",
          dim: "rgba(244, 63, 94, 0.15)",
          glow: "rgba(244, 63, 94, 0.4)",
        },
        // Primary Text
        text: {
          primary: "#f8fafc",
          secondary: "#94a3b8",
          muted: "#64748b",
          disabled: "#475569",
        },
        // shadcn/ui compatibility layer
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

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'spin-slow': 'spin 8s linear infinite',
        'glow-lime': 'glowLime 2s ease-in-out infinite alternate',
        'glow-cyan': 'glowCyan 2s ease-in-out infinite alternate',
        'glow-magenta': 'glowMagenta 2s ease-in-out infinite alternate',
        'glow-rose': 'glowRose 2s ease-in-out infinite alternate',
        'scan-line': 'scanLine 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-magenta': 'pulseMagenta 2s ease-in-out infinite',
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
        glowLime: {
          '0%': { boxShadow: '0 0 5px rgba(163, 230, 53, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(163, 230, 53, 0.5), 0 0 40px rgba(163, 230, 53, 0.2)' },
        },
        glowCyan: {
          '0%': { boxShadow: '0 0 5px rgba(34, 211, 238, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.2)' },
        },
        glowMagenta: {
          '0%': { boxShadow: '0 0 5px rgba(232, 121, 249, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(232, 121, 249, 0.5), 0 0 40px rgba(232, 121, 249, 0.2)' },
        },
        glowRose: {
          '0%': { boxShadow: '0 0 5px rgba(244, 63, 94, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(244, 63, 94, 0.5), 0 0 40px rgba(244, 63, 94, 0.2)' },
        },
        scanLine: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseMagenta: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },

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
