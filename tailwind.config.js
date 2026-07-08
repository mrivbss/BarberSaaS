/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAFA', // Ultra clean light background
        surface: '#FFFFFF',
        card: '#FFFFFF',
        'card-hover': '#FDFDFD',
        border: '#EAEAEA',
        'border-subtle': '#F4F4F4',
        muted: '#A1A1AA', // Zinc 400
        'muted-foreground': '#71717A', // Zinc 500
        foreground: '#09090B', // Zinc 950
        accent: '#09090B',
        primary: {
          DEFAULT: '#09090B',
          foreground: '#FAFAFA',
        },
        success: '#27272A',
        destructive: '#991B1B', 
      },
      borderRadius: {
        DEFAULT: '8px', // Evolving from brutalist 0px to premium rounded corners (Linear/Apple)
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'premium': '0 1px 2px rgba(0,0,0,0.02), 0 4px 16px -2px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.02)',
        'premium-hover': '0 2px 4px rgba(0,0,0,0.02), 0 8px 24px -4px rgba(0,0,0,0.04), 0 16px 32px -8px rgba(0,0,0,0.03)',
        'float': '0 0 0 1px rgba(0,0,0,0.03), 0 8px 32px -8px rgba(0,0,0,0.06)',
        'input': '0 1px 2px rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.06)',
        'input-focus': '0 0 0 2px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.02)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionDuration: {
        DEFAULT: '300ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.16, 1, 0.3, 1)', // Apple/Linear fluid ease
      },
    },
  },
  plugins: [],
};
