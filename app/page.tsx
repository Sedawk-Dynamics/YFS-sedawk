import { About } from '@/components/site/about'
import { Contact } from '@/components/site/contact'
import { Faq } from '@/components/site/faq'
import { Footer } from '@/components/site/footer'
import { Hero } from '@/components/site/hero'
import { Navbar } from '@/components/site/navbar'
import { Partners } from '@/components/site/partners'
import { Products } from '@/components/site/products'
import { Services } from '@/components/site/services'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <Products />
        <Partners />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
