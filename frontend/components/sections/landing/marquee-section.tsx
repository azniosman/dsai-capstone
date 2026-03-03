import { motion } from "framer-motion";

const PARTNERS = [
  "GovTech",
  "SSG",
  "WSG",
  "SkillsFuture",
  "IMDA",
  "Smart Nation",
  "Singpass",
];

export function MarqueeSection() {
  return (
    <section className="py-12 border-b border-primary/10 overflow-hidden bg-background-dark/95 relative">
      <div className="absolute inset-0 bg-linear-to-r from-background-dark via-transparent to-background-dark z-10 pointer-events-none" />

      <div className="px-4 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/40 text-center">
          System Partners & Governance
        </p>
      </div>

      <div className="flex overflow-hidden relative">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 25,
          }}
          className="flex whitespace-nowrap gap-16 items-center px-8 opacity-50 hover:opacity-100 transition-opacity duration-500"
        >
          {/* Double the array for seamless looping */}
          {[...PARTNERS, ...PARTNERS].map((partner, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center min-w-fit grayscale hover:grayscale-0 transition-all duration-300"
            >
              <span className="text-slate-300 hover:text-primary font-black text-2xl tracking-tighter uppercase font-mono">
                {partner}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
