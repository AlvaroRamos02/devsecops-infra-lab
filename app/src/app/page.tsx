import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import SocialProof from "@/components/SocialProof";
import Process from "@/components/Process";
import Reviews from "@/components/Reviews";
import Contact from "@/components/Contact";
import Location from "@/components/Location";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <SocialProof />
      <Services />
      <Process />
      <Reviews />
      <Contact />
      <Location />
      <FloatingWhatsApp />

      <footer style={{
        textAlign: 'center',
        padding: '2rem',
        borderTop: '1px solid var(--glass-border)',
        color: '#666',
        fontSize: '0.9rem'
      }}>
        <p>&copy; {new Date().getFullYear()} MazCom. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
