export default {
  content: ['./index.html', './index.tsx', './App.tsx', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'church-green': 'var(--church-green)',
        'church-green-dark': 'var(--church-green-dark)',
        'church-gray': '#f3f4f6',
      },
    },
  },
};
