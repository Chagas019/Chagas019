import { motion } from 'framer-motion';
import { Flame, Wind, Sparkles } from 'lucide-react';

const powers = [
  {
    title: "Fogo Ancestral",
    desc: "Chamas que queimam através da própria estrutura do tempo e espaço, purificando tudo que tocam.",
    icon: <Flame className="w-10 h-10 text-[#ff3300]" />,
    color: "from-[#8B0000] to-transparent"
  },
  {
    title: "Asas da Liberdade",
    desc: "Um bater de asas capaz de conjurar tempestades e moldar os ventos dos mundos esquecidos.",
    icon: <Wind className="w-10 h-10 text-[#D4AF37]" />,
    color: "from-[#D4AF37] to-transparent"
  },
  {
    title: "Energia Mística",
    desc: "Aura indomável que emana das escamas, refletindo a magia mais antiga conhecida no universo.",
    icon: <Sparkles className="w-10 h-10 text-[#4B0082]" />,
    color: "from-[#4B0082] to-transparent"
  }
];

export const Powers = () => {
  return (
    <section id="sobre" className="py-32 w-full bg-[#030303] relative z-10">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-cinzel text-3xl md:text-5xl font-bold text-white mb-4"
          >
            PODERES DO <span className="text-[#8B0000]">DRAGÃO</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="font-inter text-gray-400 max-w-2xl mx-auto"
          >
            Cada aspecto desta criatura lendária carrega um poder imensurável, moldando a realidade ao seu redor.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {powers.map((power, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              className="glass-panel p-8 rounded-xl relative overflow-hidden group cursor-pointer glass-panel-hover"
            >
              {/* Background Glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${power.color} opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full blur-[30px] -translate-y-10 translate-x-10`} />

              <div className="mb-6 relative z-10">
                <div className="w-16 h-16 rounded-full bg-black/50 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  {power.icon}
                </div>
              </div>

              <h3 className="font-cinzel text-xl font-bold text-white mb-4 relative z-10 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                {power.title}
              </h3>

              <p className="font-inter text-gray-400 text-sm leading-relaxed relative z-10">
                {power.desc}
              </p>

              {/* Animated bottom border */}
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-transparent via-[#8B0000] to-transparent group-hover:w-full transition-all duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
