import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B1A2B',
          light: '#F5E8EA',
          dark: '#5C0F1C',
        },
        secondary: {
          DEFAULT: '#C9A84C',
          light: '#FAF3E0',
        },
        background: '#FAFAF8',
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F5F5F3',
        },
        divider: '#E8E8E4',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.06)',
        sm: '0 2px 8px rgba(0,0,0,0.08)',
        md: '0 4px 16px rgba(0,0,0,0.12)',
        lg: '0 8px 32px rgba(0,0,0,0.16)',
        xl: '0 16px 48px rgba(0,0,0,0.20)',
      },
    },
  },
  plugins: [],
};

export default config;
