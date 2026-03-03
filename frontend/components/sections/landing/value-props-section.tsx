import { Map, Radar, Shield } from "lucide-react";
import { motion } from "framer-motion";

const VALUE_PROPS = [
  {
    icon: Map,
    title: "Vector Mapping",
    description:
      "Precision 3D coordinate skill alignment using neural embedding vectors.",
  },
  {
    icon: Radar,
    title: "Gap Extraction",
    description:
      "Automated scanning and radar gap analysis against global industry benchmarks.",
  },
  {
    icon: Shield,
    title: "Verified Certifications",
    description:
      "Secure hexagonal shield certification verification powered by SSG data.",
  },
];

export function ValuePropsSection() {
  return (
    <section className="relative px-4 py-24 bg-background-dark/95 backdrop-blur-md border-b border-primary/10 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-coral/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-16 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-px bg-primary/50" />
            <h3 className="text-primary font-mono text-xs font-bold uppercase tracking-[0.3em]">
              Core Capabilities
            </h3>
          </div>
          <h2 className="text-slate-100 text-3xl md:text-4xl font-black uppercase tracking-tight">
            Strategic Advantages
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VALUE_PROPS.map((prop, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="group flex flex-col gap-6 rounded-none border border-primary/20 bg-background-dark/60 p-8 hover:border-primary/60 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex h-14 w-14 items-center justify-center border border-primary bg-primary/10 text-primary group-hover:bg-primary group-hover:text-background-dark transition-all duration-300 shadow-[inset_0_0_15px_rgba(37,157,244,0.1)]">
                <prop.icon className="w-6 h-6" />
              </div>

              <div className="flex flex-col gap-3 z-10">
                <h3 className="text-slate-100 text-lg font-black uppercase tracking-tight">
                  {prop.title}
                </h3>
                <p className="text-slate-400 text-sm font-mono leading-relaxed">
                  {prop.description}
                </p>
              </div>

              {/* Decorative progress line */}
              <div className="h-0.5 w-0 bg-primary group-hover:w-full transition-all duration-500 mt-2" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
