import React from 'react';
import './globals.css';

export const metadata = {
  title: 'AI Teaching Assistant | Voice Agent & 3D Avatar',
  description:
    'Interactive voice-first learning platform for Data Structures and Algorithms with real-time 3D avatar and algorithm visualizations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-cyan-500 selection:text-white">{children}</body>
    </html>
  );
}
