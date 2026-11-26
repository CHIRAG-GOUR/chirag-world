import type { Metadata, Viewport } from 'next';
import { Geist, Instrument_Serif } from 'next/font/google';
import './globals.css';

const sans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const serif = Instrument_Serif({ variable: '--font-serif-display', weight: '400', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chirag Gour — The City',
  description: 'An explorable 3D city portfolio of Chirag Gour: developer, product associate and interactive experience creator.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#d9d3c7' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
