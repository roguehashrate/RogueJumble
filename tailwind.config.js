/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 16px)'
      },
      colors: {
        surface: {
          background: 'hsl(var(--surface-background))'
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        zap: 'hsl(var(--zap))',
        repost: 'hsl(var(--repost))',
        bookmark: 'hsl(var(--bookmark))',
        comment: 'hsl(var(--comment))',
        noteHover: 'hsl(var(--note-hover))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))'
        },
        highlight: 'hsl(var(--highlight))'
      },
      animation: {
        shimmer: 'shimmer 3s ease-in-out infinite',
        float: 'float 8s ease-in-out infinite',
        'float-slow': 'float-slow 20s linear infinite',
        'float-fast': 'float 6s ease-in-out infinite',
        orbit: 'orbit 20s linear infinite',
        'orbit-reverse': 'orbit-reverse 25s linear infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        gradient: 'gradient-shift 8s ease infinite',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-scale': 'fadeInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'magnetic-lift': 'magnetic-lift 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        aurora: 'aurora 15s ease-in-out infinite',
        ripple: 'ripple 1s cubic-bezier(0, 0.2, 0.8, 1) forwards',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'stagger-fade': 'staggerFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'icon-bounce': 'iconBounce 0.3s ease-out'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '400% 0' },
          '100%': { backgroundPosition: '0% 0' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '25%': { transform: 'translateY(-20px) translateX(10px)' },
          '50%': { transform: 'translateY(-10px) translateX(-15px)' },
          '75%': { transform: 'translateY(-30px) translateX(5px)' }
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(var(--orbit-radius, 60px)) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(var(--orbit-radius, 60px)) rotate(-360deg)' }
        },
        'orbit-reverse': {
          '0%': { transform: 'rotate(360deg) translateX(var(--orbit-radius, 80px)) rotate(-360deg)' },
          '100%': { transform: 'rotate(0deg) translateX(var(--orbit-radius, 80px)) rotate(0deg)' }
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px hsl(var(--primary) / 0.2), 0 0 40px hsl(var(--primary) / 0.1)'
          },
          '50%': {
            boxShadow: '0 0 30px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.2)'
          }
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px) scale(0.95)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        fadeInScale: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        'magnetic-lift': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' }
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' }
        },
        aurora: {
          '0%': { backgroundPosition: '0% 50%', transform: 'rotate(-5deg)' },
          '50%': { backgroundPosition: '100% 50%', transform: 'rotate(5deg)' },
          '100%': { backgroundPosition: '0% 50%', transform: 'rotate(-5deg)' }
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' }
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(40px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-40px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        staggerFadeIn: {
          from: { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: '100%' }
        },
        shake: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '10%': { transform: 'translate(-1px, -1px) rotate(-1deg)' },
          '20%': { transform: 'translate(1px, -1px) rotate(1deg)' },
          '30%': { transform: 'translate(-1px, 1px) rotate(-1deg)' },
          '40%': { transform: 'translate(1px, 1px) rotate(1deg)' },
          '50%': { transform: 'translate(-1px, -1px) rotate(-1deg)' },
          '60%': { transform: 'translate(1px, -1px) rotate(1deg)' },
          '70%': { transform: 'translate(-1px, 1px) rotate(-1deg)' },
          '80%': { transform: 'translate(1px, 1px) rotate(1deg)' },
          '90%': { transform: 'translate(-1px, -1px) rotate(-1deg)' }
        },
        iconBounce: {
          '0%': { transform: 'scale(1)' },
          '20%': { transform: 'scale(1.25)' },
          '40%': { transform: 'scale(0.9)' },
          '60%': { transform: 'scale(1.05)' },
          '80%': { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')]
}
