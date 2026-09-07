import { Analytics } from '@vercel/analytics/next'
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
  title: 'YFS Infinity | The Benchmark of Financial Excellence',
  description:
    'YFS Infinity Private Limited is a trusted Corporate DSA connecting customers and channel partners with leading Banks, NBFCs and Housing Finance Companies across India.',
  generator: 'v0.app',
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
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
