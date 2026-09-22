import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PassPass - Ticket Engine',
  description: 'Event ticketing & gate access control',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 antialiased">{children}</body>
    </html>
  );
}