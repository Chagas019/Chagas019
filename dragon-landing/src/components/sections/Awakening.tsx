import { motion } from 'framer-motion';

export const Awakening = () => {
  return (
    <section id="universo" className="relative py-32 w-full overflow-hidden bg-[#050505] z-10">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-16">

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full md:w-1/2"
          >
            <h2 className="font-cinzel text-4xl md:text-6xl font-bold mb-6 text-white">
              O DESPERTAR <br /> DA <span className="text-[#8B0000]">LENDA</span>
            </h2>
            <div className="w-20 h-1 bg-[#8B0000] mb-8" />
            <p className="font-inter text-gray-400 text-lg leading-relaxed mb-6">
              Nas profundezas das cavernas monumentais esquecidas pelo tempo, uma energia primordial repousa. Não é apenas mito. A fusão da magia ancestral com o núcleo escuro da terra pulsa intensamente.
            </p>
            <p className="font-inter text-gray-400 text-lg leading-relaxed">
              Aqueles que ousam se aproximar sentem o calor radiante antes mesmo de ver o brilho carmesim rasgando a escuridão. O dragão não é uma fera; é a própria manifestação do poder absoluto.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="w-full md:w-1/2 relative h-[500px]"
          >
            {/* Visual placeholder for cave/dragon concept integrating with the dark fantasy theme */}
            <div className="absolute inset-0 glass-panel rounded-lg overflow-hidden border border-[#2a0000] shadow-[0_0_50px_rgba(139,0,0,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0000] via-[#1a0505] to-[#2a0a1a] opacity-80" />

              {/* Decorative elements representing the cave/eye */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-16 bg-[#ff3300] blur-[80px] rounded-full opacity-60" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-8 bg-[#8B0000] blur-[20px] rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-12 bg-black rounded-full shadow-[0_0_10px_black]" />

              {/* Overlay particles effect (CSS based for performance here) */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30 mix-blend-overlay" />
            </div>

            {/* Decorative corners */}
            <div className="absolute top-[-10px] left-[-10px] w-8 h-8 border-t-2 border-l-2 border-[#8B0000]" />
            <div className="absolute bottom-[-10px] right-[-10px] w-8 h-8 border-b-2 border-r-2 border-[#8B0000]" />
          </motion.div>

        </div>
      </div>
    </section>
  );
};
