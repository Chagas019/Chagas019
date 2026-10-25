import { Navbar } from './components/layout/Navbar';
import { Hero } from './components/sections/Hero';
import { Awakening } from './components/sections/Awakening';
import { Powers } from './components/sections/Powers';
import { Immersive } from './components/sections/Immersive';
import { Footer } from './components/sections/Footer';
import { SceneContainer } from './components/canvas/SceneContainer';

function App() {
  return (
    <main className="relative bg-[#050505] min-h-screen text-white overflow-x-hidden selection:bg-[#8B0000] selection:text-white">
      {/*
        Global 3D Canvas
        Positioned fixed to serve as a background for the Hero
        and an interactive element throughout the page
      */}
      <div className="fixed inset-0 z-0">
        <SceneContainer interactive={true} />
      </div>

      {/* Content Layer */}
      <div className="relative z-10">
        <Navbar />
        <Hero />

        {/* Gradient transition to mask the 3D scene smoothly as user scrolls */}
        <div className="w-full h-32 bg-gradient-to-b from-transparent to-[#050505] relative z-10 -mt-32 pointer-events-none" />

        <Awakening />
        <Powers />

        {/* Gradient transition to reveal the 3D scene again for the Immersive section */}
        <div className="w-full h-32 bg-gradient-to-t from-transparent to-[#030303] relative z-10 pointer-events-none" />

        <Immersive />

        {/* Gradient transition back to dark for the Footer */}
        <div className="w-full h-32 bg-gradient-to-b from-transparent to-[#020202] relative z-10 pointer-events-none" />
        <Footer />
      </div>
    </main>
  );
}

export default App;
