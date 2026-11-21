/** Colours come from CSS variables (see src/index.css) so light/dark theme switch is automatic. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), ink: v('ink'), muted: v('muted'), line: v('line'),
        brand: v('brand'), 'brand-strong': v('brand-strong'), sage: v('sage'), cream: v('cream'), soft: v('soft'),
        teal: {
          DEFAULT: v('teal'),
          bright: v('teal-bright'),
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        olive: { 900: '#2D4A22', 700: '#436B32', 500: '#5F8F45', 400: '#8FB86D', 100: '#EDF5E7' },
        danger: '#b3402e', warn: '#b7791f', ok: '#0d9488',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: { card: '0 1px 3px rgb(13 148 136 / 0.06), 0 8px 24px -8px rgb(22 36 32 / 0.12)' },
    },
  },
  plugins: [],
}
