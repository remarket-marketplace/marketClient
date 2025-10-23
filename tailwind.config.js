/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        background: 'var(--background-color)',
        mainText: 'var(--main-text)',

        text: {
          main: 'var(--main-text)',
          error: 'var(--error-text)',
          link: 'var(--link-text)',
          secondary: 'var(--secondary-text)',
          secondaryDark: 'var(--secondary-dark-text)',
        },
        input: {
          main: 'var(--color-input)',
        },
        button: {
          main: 'var(--color-button-primary)',
        },
      },
    },
  },
  plugins: [],
}
