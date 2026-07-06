/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0F1115',
        surface: '#171A21',
        card: '#1C1F26',
        'card-hover': '#21242C',
        border: '#252830',
        'border-subtle': '#1E2128',
        muted: '#8B919E',
        'muted-foreground': '#6B7280',
        foreground: '#F4F4F5',
        accent: '#FFFFFF',
        primary: {
          DEFAULT: '#F4F4F5',
          foreground: '#0F1115',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '12px',
        xl: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
