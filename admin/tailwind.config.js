/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
    "./assets/css/main.css",
  ],
  theme: {
    extend: {
      backgroundColor: {
        primary: "var(--primary-color)",
        "primary-light": "var(--primary-color-light)",
        secondary: "var(--secondary-color)",
        success: "var(--success-color)",
        warning: "var(--warning-color)",
        danger: "var(--danger-color)",
        info: "var(--info-color)",
        base: "#F0F3F4",
        accent: "#0085FF",
        ['primary-transparent']: "rgba(99, 102, 241, 0.6)",
        ['secondary-transparent']: "rgba(16, 185, 129, 0.6)",
        ['danger-transparent']: "rgba(239, 68, 68, 0.6)",
        ['base-transparent']: "rgba(240, 243, 244, 0.6)",
        ['warning-transparent']: "rgba(245, 158, 11, 0.6)",
        ['accent-transparent']: "rgba(0, 133, 255, 0.6)",
        ['success-transparent']: "rgba(34, 197, 94, 0.6)",
        ['info-transparent']: "rgba(59, 130, 246, 0.6)",
      },
      colors: {
        primary: "var(--primary-color)",
        "primary-light": "var(--primary-color-light)",
        secondary: "var(--secondary-color)",
        success: "var(--success-color)",
        warning: "var(--warning-color)",
        danger: "var(--danger-color)",
        info: "var(--info-color)",
        base: "#F0F3F4",
        accent: "#0085FF",
      },
      textColor: {
        primary: "var(--primary-color)",
        "primary-light": "var(--primary-color-light)",
        secondary: "var(--secondary-color)",
        success: "var(--success-color)",
        warning: "var(--warning-color)",
        danger: "var(--danger-color)",
        info: "var(--info-color)",
      },
      borderColor: {
        primary: "var(--primary-color)",
        "primary-light": "var(--primary-color-light)",
        secondary: "var(--secondary-color)",
        success: "var(--success-color)",
        warning: "var(--warning-color)",
        danger: "var(--danger-color)",
        info: "var(--info-color)",
      },
      ringColor: {
        primary: "var(--primary-color)",
        "primary-light": "var(--primary-color-light)",
        secondary: "var(--secondary-color)",
        success: "var(--success-color)",
        warning: "var(--warning-color)",
        danger: "var(--danger-color)",
        info: "var(--info-color)",
      },
      outlineColor: {
        primary: "var(--primary-color)",
        "primary-light": "var(--primary-color-light)",
        secondary: "var(--secondary-color)",
        success: "var(--success-color)",
        warning: "var(--warning-color)",
        danger: "var(--danger-color)",
        info: "var(--info-color)",
      },
      opacity: {
        '15': '0.15',
        '35': '0.35',
        '85': '0.85',
      },
      keyframes: {
        jump: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        jump: 'jump 1s ease-in-out infinite',
      },
    },
  },
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.radio-custom': {
          'position': 'relative',
          'width': '20px',
          'height': '20px',
          'borderRadius': '50%',
          'border': '2px solid var(--primary-color)',
          'backgroundColor': 'white',
          'cursor': 'pointer',
          '&:checked': {
            'borderColor': 'var(--primary-color)',
            '&::before': {
              'opacity': '1',
              'backgroundColor': 'var(--primary-color)',
            }
          },
        },
      })
    }
  ],
}