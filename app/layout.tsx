import { Analytics } from '@vercel/analytics/next'
import { MotionProvider } from '@/components/site/motion-provider'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

export const metadata: Metadata = {
  // Absolute base for Open Graph and canonical URLs, so relative asset paths
  // resolve correctly when the page is shared.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'YFS Infinity | The Benchmark of Financial Excellence',
  description:
    'YFS Infinity Private Limited is a trusted Corporate DSA connecting customers and channel partners with leading Banks, NBFCs and Housing Finance Companies across India.',

  keywords: [
    'Corporate DSA',
    'Loan Distribution',
    'DSA Partner',
    'Home Loan',
    'Business Loan',
    'Personal Loan',
    'Agra',
    'YFS Infinity',
  ],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'YFS Infinity | The Benchmark of Financial Excellence',
    description:
      'Corporate DSA partner between Banks, NBFCs, HFCs and Individual DSAs — transparent payouts, faster approvals, dedicated support.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#152B52',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${inter.variable} ${cormorant.variable}`}>
      <body className="antialiased">
        <MotionProvider>{children}</MotionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
