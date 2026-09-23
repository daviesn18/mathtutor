import './globals.css';
import { APP_NAME } from '@/lib/constants';

export const metadata = {
  title: APP_NAME,
  description: 'Algebra 2 lessons and practice with step-by-step help.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F6F8FB',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=STIX+Two+Text:ital,wght@0,400;0,600;1,400&display=swap"
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
