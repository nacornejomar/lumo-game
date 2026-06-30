/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './data/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        lumo: {
          bg:      '#12090400',   // deep dark wood (used via body css)
          surface: '#2a1a0d',
          card:    '#f2e5c0',     // parchment
          border:  '#6b3f1e',     // wood border
          primary: '#c8953a',     // gold
          light:   '#e8b84a',     // bright gold
          gold:    '#f5d878',     // text gold
          peach:   '#d4601a',     // ember orange
          rose:    '#b83228',     // ember red
          sky:     '#3a7ab8',     // sapphire
          navy:    '#0e0804',
          dark:    '#1a0d05',
          text:    '#f0dfc0',     // cream text on dark
          muted:   '#9a8060',     // stone muted
          leaf:    '#4a7c3f',     // forest green
          wood:    '#4a2f18',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'Palatino Linotype', 'Georgia', 'serif'],
        body:    ['Lora', 'Georgia', 'serif'],
      },
      boxShadow: {
        lumo:        '0 4px 20px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)',
        'lumo-md':   '0 8px 30px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        'lumo-glow': '0 0 20px rgba(200,149,58,0.4)',
        'gold-glow': '0 0 24px rgba(232,184,74,0.5)',
        coin:        '0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
      },
      animation: {
        'slide-up':   'slideUp 0.3s ease-out',
        shake:        'shake 0.5s ease-in-out',
        float:        'float 3s ease-in-out infinite',
        'pulse-lumo': 'pulseLumo 2s ease-in-out infinite',
        'spin-slow':  'spin 4s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%':     { transform: 'translateX(-8px)' },
          '40%':     { transform: 'translateX(8px)' },
          '60%':     { transform: 'translateX(-4px)' },
          '80%':     { transform: 'translateX(4px)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        pulseLumo: {
          '0%,100%': { boxShadow: '0 0 10px rgba(200,149,58,0.2)' },
          '50%':     { boxShadow: '0 0 25px rgba(200,149,58,0.5)' },
        },
      },
    },
  },
  plugins: [],
};
