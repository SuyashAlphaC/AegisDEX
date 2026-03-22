import type { Metadata } from 'next'
import './globals.css'
import '@initia/interwovenkit-react/styles.css'
import Providers from './providers'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'SocialYield — MEV Yield for .init Holders',
  description:
    'A batch-auction DEX appchain on Initia where 100% of captured MEV is redistributed to .init name holders every epoch.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="pt-20 min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
