import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'RISEx Trading | Perpetuals on Risechain',
  description: 'Trade perpetual markets on Risechain with the RISEx social trading platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-900 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
