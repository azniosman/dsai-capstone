import { CheckCircle2, MoveRight } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Data Ingestion",
      desc: "Connect your resume or Singpass profile to sync your baseline credentials into the neural network.",
    },
    {
      step: "02",
      title: "Market Analysis",
      desc: "Our engine cross-references your vector space against 10M+ live jobs to identify the shortest path to your goal.",
    },
    {
      step: "03",
      title: "Execution Plan",
      desc: "Receive deterministic, hyper-personalized upskilling routes and SSG subsidy breakdowns.",
    },
  ];

  return (
    <section className="py-24 bg-background-dark/95 border-y border-white/5 relative">
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background-dark/5 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-100">
            Pipeline Sequence
          </h2>
          <div className="h-1 w-16 bg-accent-coral mx-auto shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          <p className="text-slate-400 font-mono text-sm uppercase tracking-widest max-w-xl mx-auto">
            Standard operating procedure to navigate your personalized
            intelligence feed
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-[40px] left-0 w-full h-px bg-primary/20 pointer-events-none" />

          {steps.map((item, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center text-center space-y-6 group"
            >
              <div className="w-20 h-20 rounded-none bg-background-dark border border-primary/30 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(37,157,244,0.1)] group-hover:bg-primary/5 transition-colors">
                <span className="font-mono text-xl font-bold text-primary">
                  {item.step}
                </span>
                {i < steps.length - 1 && (
                  <MoveRight className="hidden md:block absolute -right-8 w-6 h-6 text-primary/40 bg-background-dark z-20" />
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-bold uppercase tracking-tight text-slate-100 flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-coral" />
                  {item.title}
                </h3>
                <p className="text-sm font-mono text-slate-400 leading-relaxed px-4">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
