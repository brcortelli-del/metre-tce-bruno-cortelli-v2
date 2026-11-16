import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Atelier Métré Pro', description: 'Atelier privé de métré, minute et étude de prix.' };
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="fr"><body>{children}</body></html>; }
