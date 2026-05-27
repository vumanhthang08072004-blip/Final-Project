import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgriSmart Peach Tree',
  description: 'IoT Web System for Peach Tree monitoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
