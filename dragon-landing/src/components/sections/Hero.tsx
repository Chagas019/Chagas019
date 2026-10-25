import { motion } from 'framer-motion';

export const Hero = () => {
  return (
    <section id="início" className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* 3D Scene is placed absolutely behind this section via App.tsx to avoid re-rendering issues */}

      <div className="container mx-auto px-6 md:px-12 z-10 text-center flex flex-col items-center mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
        >
          <h1 className="font-cinzel text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight mb-6 drop-shadow-[0_0_30px_rgba(139,0,0,0.5)]">
            DESPERTE O PODER <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff3300] via-[#8B0000] to-[#4B0082]">
              DO DRAGÃO
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="font-inter text-gray-300 max-w-2xl text-lg md:text-xl mb-12 font-light drop-shadow-md"
        >
          Entre em um universo onde fogo, tecnologia e fantasia se encontram. Uma experiência criada para ultrapassar os limites da imaginação.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-6"
        >
          <button className="px-8 py-4 bg-[#8B0000] text-white font-inter uppercase tracking-widest text-sm font-semibold hover:bg-[#ff3300] transition-all duration-300 shadow-[0_0_20px_rgba(139,0,0,0.5)] hover:shadow-[0_0_30px_rgba(255,51,0,0.8)] border border-[#ff3300]">
            Explorar o universo
          </button>

          <button className="px-8 py-4 glass-panel text-white font-inter uppercase tracking-widest text-sm font-semibold hover:bg-white/10 transition-all duration-300">
            Assistir à experiência
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50"
      >
        <span className="font-inter text-xs uppercase tracking-widest">Descubra</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
      </motion.div>
    </section>
  );
};
