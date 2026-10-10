import Contact from "@/components/Contact";
import Gallery from "@/components/Gallery";
import Hero from "@/components/Hero";
import Nav from "@/components/Nav";
import PinSequence from "@/components/PinSequence";
import Services from "@/components/Services";

export default function Home() {
  return (
    <main className="grain">
      <Nav />
      <Hero />
      <PinSequence />
      <Services />
      <Gallery />
      <Contact />
    </main>
  );
}
