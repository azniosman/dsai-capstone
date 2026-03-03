import { Code2, Network, Cpu, Database } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Code2,
      title: "SYNTAX_ANALYSIS_ENGINE",
      desc: "Deep parsing of code repositories to establish baseline logic metrics.",
    },
    {
      icon: Network,
      title: "NEURAL_TALENT_GRAPH",
      desc: "Advanced graph matching algorithms to pair candidates with ideal roles.",
    },
    {
      icon: Database,
      title: "SKILLBRIDGE_SYNC_NODE",
      desc: "Seamless synchronization with government and enterprise datasets.",
    },
    {
      icon: Cpu,
      title: "REAL_TIME_PIPELINE",
      desc: "Low-latency evaluation pipelines running on cutting-edge compute grids.",
    },
  ];

  return (
    <section className="py-24 bg-background-dark relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 border-b border-l border-primary/20 bg-primary/5 hidden md:block">
        <span className="text-[8px] font-mono text-primary tracking-widest uppercase font-bold">
          SYS.FEATURES_V2
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="mb-16 space-y-4">
          <div className="tactical-label text-[#00f2f2]">
            INTELLIGENCE_MODULES
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-slate-100">
            ENGINE_COMPONENTS
          </h2>
          <div className="h-0.5 w-24 bg-[#00f2f2]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/5">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex gap-8 p-10 bg-background hover:bg-[#00f2f2]/5 transition-all group relative"
            >
              <div className="w-16 h-16 shrink-0 flex items-center justify-center border border-white/10 text-[#00f2f2] group-hover:border-[#00f2f2] group-hover:shadow-[0_0_15px_rgba(0,242,242,0.2)] transition-all">
                <feature.icon className="w-8 h-8" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-black text-slate-200 uppercase tracking-widest group-hover:text-[#00f2f2] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-[13px] font-sans text-slate-500 leading-relaxed uppercase tracking-wider">
                  {feature.desc}
                </p>
              </div>
              <div className="absolute top-4 right-4 tactical-label text-white/10">
                0{i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
