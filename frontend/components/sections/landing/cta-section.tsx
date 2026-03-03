import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function CtaSection() {
  const router = useRouter();

  return (
    <section className="relative py-32 bg-background-dark overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-3xl mx-auto px-4 text-center space-y-8"
      >
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-100">
          Ready to <span className="text-primary">Deploy</span>?
        </h2>
        <p className="text-slate-400 font-mono text-sm leading-relaxed max-w-xl mx-auto">
          Initialize your intelligence dossier and gain access to
          Singapore&apos;s most comprehensive career analytics engine.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            onClick={() => router.push("/login?tab=register")}
            className="h-14 bg-primary text-background-dark hover:bg-white hover:shadow-[0_0_30px_rgba(37,157,244,0.6)] border border-primary text-sm font-black uppercase tracking-widest rounded-none transition-all duration-300"
          >
            <Rocket className="w-5 h-5 mr-3" />
            Create Node
          </Button>
          <Button
            onClick={() => router.push("/login")}
            variant="outline"
            className="h-14 bg-transparent border-primary/40 text-primary hover:bg-primary/10 text-sm font-bold uppercase tracking-widest rounded-none transition-all duration-300"
          >
            Sign In
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
