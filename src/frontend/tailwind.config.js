import typography from '@tailwindcss/typography';
import containerQueries from '@tailwindcss/container-queries';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['index.html', 'src/**/*.{js,ts,jsx,tsx,html,css}'],
    theme: {
        extend: {
                container: {
                    center: true,
                    padding: {
                        DEFAULT: '1rem',
                        sm: '1rem',
                        lg: '2rem',
                        xl: '4rem',
                    }
                },
            screens: {
                xs: '375px',
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
                '2xl': '1536px',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Space Grotesk', 'system-ui', 'sans-serif'],
                body: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            spacing: {
                '0.5': '0.125rem',
                '1': '0.25rem',
                '1.5': '0.375rem',
                '2': '0.5rem',
                '2.5': '0.625rem',
                '3': '0.75rem',
                '3.5': '0.875rem',
                '4': '1rem',
                '5': '1.25rem',
                '6': '1.5rem',
                '7': '1.75rem',
                '8': '2rem',
                '9': '2.25rem',
                '10': '2.5rem',
                '11': '2.75rem',
                '12': '3rem',
                '14': '3.5rem',
                '16': '4rem',
                '20': '5rem',
                '24': '6rem',
                '28': '7rem',
                '32': '8rem',
                '36': '9rem',
                '40': '10rem',
                '44': '11rem',
                '48': '12rem',
                '52': '13rem',
                '56': '14rem',
                '60': '15rem',
                '64': '16rem',
                '72': '18rem',
                '80': '20rem',
                '96': '24rem',
            },
            borderRadius: {
                'none': '0',
                'sm': '0.25rem',
                'DEFAULT': '0.5rem',
                'md': '0.625rem',
                'lg': '0.75rem',
                'xl': '0.875rem',
                '2xl': '1rem',
                '3xl': '1.25rem',
                '4xl': '1.5rem',
                '5xl': '1.75rem',
                '6xl': '2rem',
                '7xl': '2.5rem',
                '8xl': '3rem',
                'full': '9999px',
            },
            colors: {
                border: 'oklch(var(--border))',
                input: 'oklch(var(--input))',
                ring: 'oklch(var(--ring) / <alpha-value>)',
                background: 'oklch(var(--background))',
                foreground: 'oklch(var(--foreground))',
                primary: {
                    DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
                    foreground: 'oklch(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
                    foreground: 'oklch(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
                    foreground: 'oklch(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
                    foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
                },
                accent: {
                    DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
                    foreground: 'oklch(var(--accent-foreground))'
                },
                popover: {
                    DEFAULT: 'oklch(var(--popover))',
                    foreground: 'oklch(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'oklch(var(--card))',
                    foreground: 'oklch(var(--card-foreground))'
                },
                warning: {
                    DEFAULT: 'oklch(var(--warning) / <alpha-value>)',
                    foreground: 'oklch(var(--warning-foreground))'
                },
                success: {
                    DEFAULT: 'oklch(var(--success) / <alpha-value>)',
                    foreground: 'oklch(var(--success-foreground))'
                },
                chart: {
                    1: 'oklch(var(--chart-1))',
                    2: 'oklch(var(--chart-2))',
                    3: 'oklch(var(--chart-3))',
                    4: 'oklch(var(--chart-4))',
                    5: 'oklch(var(--chart-5))'
                },
                sidebar: {
                    DEFAULT: 'oklch(var(--sidebar))',
                    foreground: 'oklch(var(--sidebar-foreground))',
                    primary: 'oklch(var(--sidebar-primary))',
                    'primary-foreground': 'oklch(var(--sidebar-primary-foreground))',
                    accent: 'oklch(var(--sidebar-accent))',
                    'accent-foreground': 'oklch(var(--sidebar-accent-foreground))',
                    border: 'oklch(var(--sidebar-border))',
                    ring: 'oklch(var(--sidebar-ring))'
                }
            },
            boxShadow: {
                'neon-cyan': '0 0 10px oklch(0.7 0.32 195 / 0.5), 0 0 20px oklch(0.7 0.32 195 / 0.3), 0 0 40px oklch(0.7 0.32 195 / 0.15)',
                'neon-purple': '0 0 10px oklch(0.65 0.35 290 / 0.5), 0 0 20px oklch(0.65 0.35 290 / 0.3), 0 0 40px oklch(0.65 0.35 290 / 0.15)',
                'neon-pink': '0 0 10px oklch(0.68 0.38 335 / 0.5), 0 0 20px oklch(0.68 0.38 335 / 0.3), 0 0 40px oklch(0.68 0.38 335 / 0.15)',
                'neon-amber': '0 0 10px oklch(0.76 0.35 75 / 0.5), 0 0 20px oklch(0.76 0.35 75 / 0.3), 0 0 40px oklch(0.76 0.35 75 / 0.15)',
                'neon-green': '0 0 10px oklch(0.72 0.32 145 / 0.5), 0 0 20px oklch(0.72 0.32 145 / 0.3), 0 0 40px oklch(0.72 0.32 145 / 0.15)',
                'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.3)',
                'glass-md': '0 8px 24px rgba(0, 0, 0, 0.35)',
                'glass-lg': '0 12px 32px rgba(0, 0, 0, 0.4)',
                'glass-xl': '0 20px 48px rgba(0, 0, 0, 0.5)',
                'inner-glow': 'inset 0 0 20px rgba(0, 0, 0, 0.3)',
                'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
                'soft-md': '0 4px 12px rgba(0, 0, 0, 0.1)',
                'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
                'elegant': '0 4px 20px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08)',
                'elegant-lg': '0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)',
            },
            backdropBlur: {
                'xs': '2px',
            },
            transitionDuration: {
                '0': '0ms',
                '100': '100ms',
                '200': '200ms',
                '300': '300ms',
                '400': '400ms',
                '500': '500ms',
                '600': '600ms',
                '700': '700ms',
                '800': '800ms',
                '900': '900ms',
                '1000': '1000ms',
            },
            transitionTimingFunction: {
                'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'gradient-shift': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' }
                },
                'neon-pulse': {
                    '0%, 100%': { boxShadow: '0 0 10px oklch(var(--primary) / 0.5), 0 0 20px oklch(var(--primary) / 0.3)' },
                    '50%': { boxShadow: '0 0 20px oklch(var(--primary) / 0.7), 0 0 30px oklch(var(--primary) / 0.5)' }
                },
                'spring-in': {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' }
                },
                'spring-out': {
                    from: { opacity: '1', transform: 'scale(1)' },
                    to: { opacity: '0', transform: 'scale(0.95)' }
                },
                'floating': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-12px)' }
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)' },
                    '50%': { boxShadow: '0 0 30px rgba(0, 255, 255, 0.6)' }
                },
                'fade-in-spring': {
                    from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
                    to: { opacity: '1', transform: 'translateY(0) scale(1)' }
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' }
                },
                'scale-in': {
                    from: { opacity: '0', transform: 'scale(0.9)' },
                    to: { opacity: '1', transform: 'scale(1)' }
                },
                'slide-down': {
                    from: { opacity: '0', transform: 'translateY(-12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                },
                'breathe': {
                    '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
                    '50%': { opacity: '1', transform: 'scale(1.05)' }
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                },
                'slide-in-right': {
                    from: { opacity: '0', transform: 'translateX(100%)' },
                    to: { opacity: '1', transform: 'translateX(0)' }
                },
                'slide-out-right': {
                    from: { opacity: '1', transform: 'translateX(0)' },
                    to: { opacity: '0', transform: 'translateX(100%)' }
                },
                'slide-in-left': {
                    from: { opacity: '0', transform: 'translateX(-100%)' },
                    to: { opacity: '1', transform: 'translateX(0)' }
                },
                'slide-out-left': {
                    from: { opacity: '1', transform: 'translateX(0)' },
                    to: { opacity: '0', transform: 'translateX(-100%)' }
                },
                'zoom-in': {
                    from: { opacity: '0', transform: 'scale(0.8)' },
                    to: { opacity: '1', transform: 'scale(1)' }
                },
                'zoom-out': {
                    from: { opacity: '1', transform: 'scale(1)' },
                    to: { opacity: '0', transform: 'scale(0.8)' }
                },
                'flip-in': {
                    from: { opacity: '0', transform: 'rotateY(-90deg)' },
                    to: { opacity: '1', transform: 'rotateY(0)' }
                },
                'flip-out': {
                    from: { opacity: '1', transform: 'rotateY(0)' },
                    to: { opacity: '0', transform: 'rotateY(90deg)' }
                },
                'bounce-in': {
                    '0%': { opacity: '0', transform: 'scale(0.3)' },
                    '50%': { transform: 'scale(1.05)' },
                    '70%': { transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' }
                },
                'elastic-in': {
                    '0%': { opacity: '0', transform: 'scaleX(1.3) scaleY(0.7)' },
                    '50%': { transform: 'scaleX(0.9) scaleY(1.1)' },
                    '100%': { opacity: '1', transform: 'scaleX(1) scaleY(1)' }
                },
                'morph-in': {
                    from: { opacity: '0', transform: 'border-radius(50% 50% 50% 50% / 50% 50% 50% 50%)' },
                    to: { opacity: '1', transform: 'border-radius(0)' }
                },
                'blur-in': {
                    from: { opacity: '0', filter: 'blur(12px)' },
                    to: { opacity: '1', filter: 'blur(0)' }
                },
                'swing-in': {
                    from: { opacity: '0', transform: 'rotateZ(-90deg)' },
                    to: { opacity: '1', transform: 'rotateZ(0)' }
                },
                'wobble': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-5px) rotate(-5deg)' },
                    '75%': { transform: 'translateX(5px) rotate(5deg)' }
                },
                'jelly': {
                    '0%, 100%': { transform: 'scaleX(1) scaleY(1)' },
                    '25%': { transform: 'scaleX(1.1) scaleY(0.9)' },
                    '50%': { transform: 'scaleX(0.95) scaleY(1.05)' },
                    '75%': { transform: 'scaleX(1.05) scaleY(0.95)' }
                },
                'heartbeat': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '14%': { transform: 'scale(1.3)' },
                    '28%': { transform: 'scale(1)' },
                    '42%': { transform: 'scale(1.3)' },
                    '70%': { transform: 'scale(1)' }
                },
                'ring-pulse': {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '100%': { transform: 'scale(1.5)', opacity: '0' }
                },
                'progress-bar': {
                    from: { width: '0%' },
                    to: { width: '100%' }
                },
                'spin-slow': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' }
                },
                'spin-slow-reverse': {
                    from: { transform: 'rotate(360deg)' },
                    to: { transform: 'rotate(0deg)' }
                },
                'float-gentle': {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '33%': { transform: 'translateY(-6px) rotate(1deg)' },
                    '66%': { transform: 'translateY(-3px) rotate(-1deg)' }
                },
                'aurora': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' }
                },
                'typing-cursor': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'gradient-shift': 'gradient-shift 15s ease infinite',
                'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
                'spring-in': 'spring-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'spring-out': 'spring-out 400ms cubic-bezier(0.36, 0, 0.66, -0.56)',
                'floating': 'floating 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'fade-in-spring': 'fade-in-spring 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'slide-up': 'slide-up 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'fade-in': 'fade-in 300ms ease-out',
                'scale-in': 'scale-in 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'slide-down': 'slide-down 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'breathe': 'breathe 3s ease-in-out infinite',
                'shimmer': 'shimmer 3s ease-in-out infinite',
                'slide-in-right': 'slide-in-right 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'slide-out-right': 'slide-out-right 300ms cubic-bezier(0.36, 0, 0.66, -0.56)',
                'slide-in-left': 'slide-in-left 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'slide-out-left': 'slide-out-left 300ms cubic-bezier(0.36, 0, 0.66, -0.56)',
                'zoom-in': 'zoom-in 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'zoom-out': 'zoom-out 250ms cubic-bezier(0.36, 0, 0.66, -0.56)',
                'flip-in': 'flip-in 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'flip-out': 'flip-out 400ms cubic-bezier(0.36, 0, 0.66, -0.56)',
                'bounce-in': 'bounce-in 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                'elastic-in': 'elastic-in 700ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                'morph-in': 'morph-in 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'blur-in': 'blur-in 400ms ease-out',
                'swing-in': 'swing-in 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'wobble': 'wobble 500ms ease-in-out',
                'jelly': 'jelly 600ms ease-in-out',
                'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
                'ring-pulse': 'ring-pulse 1s ease-out infinite',
                'progress-bar': 'progress-bar 2s ease-out forwards',
                'spin-slow': 'spin-slow 8s linear infinite',
                'spin-slow-reverse': 'spin-slow-reverse 10s linear infinite',
                'float-gentle': 'float-gentle 4s ease-in-out infinite',
                'aurora': 'aurora 20s ease infinite',
                'typing-cursor': 'typing-cursor 1s step-end infinite'
            }
        }
    },
    plugins: [typography, containerQueries, animate]
};
