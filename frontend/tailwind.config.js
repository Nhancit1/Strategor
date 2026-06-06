/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        orange:      '#E8621A',
        orangeDark:  '#C04E10',
        orangeLight: '#F07830',
        ink:         '#1C1A17',
        ink2:        '#3A3630',
        ink3:        '#6E6A62',
        paper:       '#F7F4EF',
        paper2:      '#EDE9E1',
        paper3:      '#E2DDD4',
        green:       '#1E5C38',
        blue:        '#1B3E6A',
      },
      fontFamily: {
        title: ['Comfortaa', 'system-ui', 'sans-serif'],
        body:  ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        cardHover: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
