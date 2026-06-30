import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lumo — Adivina Quién',
  description: 'El juego multijugador de adivinar personajes. ¡Juega con amigos online!',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-lumo-bg">
        {children}
      </body>
    </html>
  );
}
