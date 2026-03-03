import { Terminal, ShieldAlert, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-primary/20 bg-background-dark">
      {/* Background Cyber Effect */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-20 grid-pattern" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-background-dark/80 to-background-dark" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:text-left flex flex-col lg:flex-row items-center gap-12">
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 space-y-8"
        >
          <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-4 py-1.5 rounded-none shadow-[0_0_15px_rgba(37,157,244,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-primary font-mono text-xs font-bold uppercase tracking-widest">
              System Active: SG-NODE-01
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-slate-100 leading-[1.1]">
              Strategic <br className="hidden lg:block" />
              <span className="text-primary italic">Intelligence</span>{" "}
              <br className="hidden lg:block" />
              Engine
            </h1>
            <div className="h-1 w-24 bg-primary mx-auto lg:mx-0 shadow-[0_0_10px_rgba(37,157,244,0.8)]" />
            <p className="text-lg md:text-xl text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Advanced neural talent matching and predictive upskilling pathways
              for the Singapore tech ecosystem.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
            <Button
              onClick={() => router.push("/login")}
              className="h-14 bg-primary text-background-dark hover:bg-white hover:text-background-dark hover:shadow-[0_0_20px_rgba(37,157,244,0.6)] border border-primary text-sm font-black uppercase tracking-widest rounded-none transition-all duration-300"
            >
              <Terminal className="w-5 h-5 mr-3" />
              Initialize Session
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="h-14 bg-transparent border-primary/40 text-primary hover:bg-primary/10 shadow-[inset_0_0_10px_rgba(37,157,244,0.05)] text-sm font-bold uppercase tracking-widest rounded-none transition-all duration-300"
            >
              <Cpu className="w-5 h-5 mr-3" />
              Explore Network
            </Button>
          </div>
        </motion.div>

        {/* Abstract Isometric/Cyber Visual Component */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 w-full max-w-md lg:max-w-none relative border border-primary/20 bg-background-dark/50 backdrop-blur-md p-8"
        >
          {/* Decorative Corner Borders */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />

          <div className="relative aspect-square sm:aspect-[4/3] flex items-center justify-center border border-white/5 bg-linear-to-br from-slate-900 to-black overflow-hidden group">
            {/* Scanning line animation */}
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-primary/10 to-transparent h-[10%] w-full animate-scan" />

            <ShieldAlert
              className="w-32 h-32 text-primary opacity-20 group-hover:opacity-40 transition-opacity duration-700 group-hover:scale-110"
              strokeWidth={1}
            />

            <div className="absolute bottom-4 left-4 font-mono text-[9px] text-primary/60 uppercase tracking-widest font-bold">
              Status: Synchronized <br />
              Vectors: Active
            </div>

            <div className="absolute top-4 right-4 flex gap-1">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
