export const metadata = {
  title: 'Shapelection Strategy',
  description: 'Perpetual Shape Machine',
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0b0b0c] text-zinc-50 min-h-screen">
        <div className="fixed inset-0 bg-[radial-gradient(1200px_800px_at_80%_-10%,rgba(34,211,238,0.08),transparent)] pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(900px_700px_at_-10%_10%,rgba(110,231,183,0.06),transparent)] pointer-events-none" />
        {children}
      </body>
    </html>
  );
} 