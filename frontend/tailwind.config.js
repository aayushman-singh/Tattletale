/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			montserrat: ["Montserrat", "sans-serif"],
  			sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
  			serif: ["Spectral", "Georgia", "serif"],
  			mono: ["IBM Plex Mono", "ui-monospace", "monospace"]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			dossier: '0 2px 4px rgba(0,0,0,.35), 0 14px 36px -18px rgba(0,0,0,.75)'
  		},
  		colors: {
  			ink: { 900: '#0c0a08', 870: '#110e0b', 850: '#15110d', 820: '#1a1611', 780: '#211c16', 740: '#29231b', 700: '#342d24' },
  			paper: { 50: '#f1e9da', 100: '#e6dccb', 300: '#c5bba8' },
  			mute: '#998f7e',
  			faint: '#6b6253',
  			rust: { 300: '#e9866a', 400: '#d75e3d', 500: '#c0492e', 600: '#9c3a23', 700: '#7e2d1a' },
  			brass: '#c7a35d',
  			file: { DEFAULT: '#e7ddc7', soft: '#ddd0b4', line: '#c7b893', ink: '#2a241a' },
  			signal: { ok: '#45a06a', warn: '#d99a32', err: '#d2483b', info: '#5a86c0' },
  			cluster: { 0: '#c0492e', 1: '#d99a32', 2: '#45a06a', 3: '#9b7bc0', 4: '#cf6a96', 5: '#3f9aa0' },
  			pf: { instagram: '#e1568b', facebook: '#4f7bd0', x: '#9aa6b2', telegram: '#4aa3e0', google: '#d99a32', whatsapp: '#45a06a', discord: '#8b7fe6', mastodon: '#8f74e0' },
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  
};
