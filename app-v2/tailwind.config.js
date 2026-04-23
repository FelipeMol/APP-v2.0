/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 1px)',
        sm: 'calc(var(--radius) - 3px)'
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-bg))',
          foreground: 'hsl(var(--sidebar-fg))',
          border: 'hsl(var(--sidebar-border))',
          hover: 'hsl(var(--sidebar-bg-hover))',
          active: 'hsl(var(--sidebar-active-border))',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"DM Mono"', 'Consolas', 'monospace']
      },
      fontSize: {
        xs:   ['0.75rem',   { lineHeight: '1rem' }],
        sm:   ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg:   ['1.0625rem', { lineHeight: '1.625rem' }],
        xl:   ['1.1875rem', { lineHeight: '1.75rem' }],
        '2xl':['1.375rem',  { lineHeight: '1.875rem' }],
        '3xl':['1.75rem',   { lineHeight: '2.125rem' }],
        '4xl':['2.25rem',   { lineHeight: '2.5rem' }],
        '5xl':['3rem',      { lineHeight: '1' }],
      },
      boxShadow: {
        'xs':  '0 1px 2px hsl(215 30% 20% / 0.04)',
        'sm':  '0 1px 3px hsl(215 30% 20% / 0.06), 0 1px 2px hsl(215 30% 20% / 0.04)',
        'DEFAULT': '0 2px 6px hsl(215 30% 20% / 0.07), 0 1px 3px hsl(215 30% 20% / 0.05)',
        'md':  '0 4px 12px hsl(215 40% 25% / 0.08), 0 2px 4px hsl(215 30% 20% / 0.05)',
        'lg':  '0 8px 24px hsl(215 40% 25% / 0.10), 0 4px 8px hsl(215 30% 20% / 0.06)',
        'xl':  '0 16px 40px hsl(215 40% 25% / 0.12), 0 6px 12px hsl(215 30% 20% / 0.07)',
        '2xl': '0 24px 56px hsl(215 40% 25% / 0.15)',
        'inner': 'inset 0 1px 3px hsl(215 30% 20% / 0.08)',
        'none': 'none',
        'glow-primary': '0 0 20px hsl(214 46% 16% / 0.30)',
        'glow-accent':  '0 0 20px hsl(38 82% 53% / 0.35)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in':   'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-right':'slideRight 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'modal-in':   'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:    { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideRight: { '0%': { transform: 'translateX(-12px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        scaleIn:    { '0%': { transform: 'scale(0.93)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
    }
  },
  plugins: [],

}
