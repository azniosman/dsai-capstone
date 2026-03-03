import { Code2, Network, Cpu, Database } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Code2,
      title: "Syntax & Logic Analysis",
      desc: "Deep parsing of code repositories to establish baseline logic metrics.",
    },
    {
      icon: Network,
      title: "Neural Talent Matching",
      desc: "Advanced graph matching algorithms to pair candidates with ideal roles.",
    },
    {
      icon: Database,
      title: "Data Lake Integration",
      desc: "Seamless synchronization with government and enterprise datasets.",
    },
    {
      icon: Cpu,
      title: "Real-time Processing",
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
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-100">
            System Modules
          </h2>
          <div className="h-1 w-16 bg-primary mx-auto" />
          <p className="text-primary/60 font-mono text-xs uppercase tracking-widest">
            Architecture breakdown of the intelligence engine
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex gap-6 p-6 border border-white/5 bg-slate-900/50 hover:bg-primary/5 hover:border-primary/30 transition-all rounded-lg group"
            >
              <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-background-dark border border-primary/20 text-primary group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(37,157,244,0.1)]">
                <feature.icon className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-200 uppercase tracking-tight group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm font-mono text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
