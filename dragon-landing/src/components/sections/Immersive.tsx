import { motion } from 'framer-motion';

export const Immersive = () => {
  return (
    <section id="experiência" className="py-20 w-full bg-transparent relative z-10 pointer-events-none">
      {/* We add pointer-events-none to the section container but pointer-events-auto to inner content to let clicks pass through to the 3D canvas behind it if needed, or we just keep it as a distinct UI overlay */}

      <div className="container mx-auto px-6 md:px-12 pointer-events-auto">
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-panel p-8 md:p-12 rounded-2xl border border-[#8B0000]/30 shadow-[0_0_50px_rgba(139,0,0,0.1)] relative overflow-hidden"
          >
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#8B0000]/10 to-transparent pointer-events-none" />

            <h2 className="font-cinzel text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">
              EXPERIÊNCIA <span className="text-[#8B0000]">IMERSIVA</span>
            </h2>

            <p className="font-inter text-gray-300 max-w-xl mx-auto mb-8 relative z-10">
              Interaja com o núcleo primordial. Use o cursor para alterar a perspectiva e testemunhar o poder latente aguardando para ser libertado.
            </p>

            <div className="inline-block relative z-10">
              <span className="font-cinzel text-xl md:text-2xl text-[#ff3300] tracking-widest uppercase font-bold drop-shadow-[0_0_10px_rgba(255,51,0,0.5)]">
                Não observe a lenda. Faça parte dela.
              </span>
            </div>

            {/* Visual indicator for interaction */}
            <div className="mt-8 flex justify-center animate-bounce opacity-50 relative z-10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
