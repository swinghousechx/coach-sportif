/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0B',
        run: '#FC4C02',   // orange Strava — course
        gym: '#B9FF3C'     // lime électrique — salle
      },
      fontFamily: {
        display: ['Oswald', 'Arial Narrow', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)'
      }
    }
  },
  plugins: []
}
