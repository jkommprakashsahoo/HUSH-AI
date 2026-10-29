import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hush — Anonymous AI Companion',
  description: 'Your thoughts. Your space. No identity required. Private local AI companion with Thought Trails.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-hush-bg font-sans text-hush-textPrimary min-h-screen antialiased selection:bg-hush-violet/25 selection:text-hush-lavender">
        {children}
      </body>
    </html>
  );
}
