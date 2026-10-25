import { motion } from 'framer-motion';

export const Footer = () => {
  return (
    <footer className="relative bg-[#020202] pt-32 pb-10 overflow-hidden border-t border-[#1a1a1a] z-10">
      {/* Background Particles/Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#8B0000] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="mb-20"
        >
          <h2 className="font-cinzel text-4xl md:text-6xl font-bold text-white mb-8">
            O PORTAL ESTÁ <span className="text-[#8B0000]">ABERTO</span>
          </h2>
          <button className="px-12 py-5 bg-gradient-to-r from-[#8B0000] to-[#4B0082] text-white font-inter uppercase tracking-[0.2em] text-sm font-bold hover:shadow-[0_0_40px_rgba(139,0,0,0.6)] transition-all duration-500 scale-100 hover:scale-105">
            Entre no Universo
          </button>
        </motion.div>

        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-10" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-cinzel font-bold text-lg tracking-wider text-gray-500">DRACONIS</span>
          </div>

          <div className="flex gap-6">
            {['Twitter', 'Discord', 'YouTube'].map((social) => (
              <a
                key={social}
                href="#"
                className="font-inter text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors"
              >
                {social}
              </a>
            ))}
          </div>

          <div className="font-inter text-xs text-gray-600">
            &copy; 2024 Draconis Studio Fictício. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
};
