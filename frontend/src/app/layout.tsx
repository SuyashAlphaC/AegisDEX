import type { Metadata } from 'next'
import { Instrument_Serif, Barlow } from 'next/font/google'
import './globals.css'
import '@initia/interwovenkit-react/styles.css'
import Providers from './providers'
import Navbar from '@/components/Navbar'
import BackgroundVideo from '@/components/BackgroundVideo'

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  style: ['italic', 'normal'],
  variable: '--font-heading',
})

const barlow = Barlow({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'SocialYield — Order Surplus Yield for .init Holders',
  description:
    'A batch-auction DEX appchain on Initia where 100% of captured order surplus is redistributed to .init name holders every epoch.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${instrumentSerif.variable} ${barlow.variable} font-body bg-black text-white antialiased`}>
        <Providers>
          <BackgroundVideo />
          <Navbar />
          <main className="min-h-screen relative z-10">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
