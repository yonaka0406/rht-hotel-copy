/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}", // Crucial for scanning your Vue components and other JS/TS files
    // If you use Tailwind classes in other directories/files, add those paths here.
  ],
  darkMode: 'media', // or 'class' if you want to toggle manually
  theme: {
    extend: {},
  },
  plugins: [],
}