import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chronopost Tracking Service',
  description: 'Service web pour vérifier le statut des colis Chronopost',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}

