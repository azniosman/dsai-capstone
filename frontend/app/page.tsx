"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, FileText, Briefcase, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProfileWizard from "@/components/profile/profile-wizard";

const HERO_FEATURES = [
  { icon: <FileText className="h-10 w-10" />, label: "Resume Parsing", desc: "AI-powered skill extraction from your resume" },
  { icon: <Briefcase className="h-10 w-10" />, label: "50+ Tech Roles", desc: "Comprehensive Singapore job market coverage" },
  { icon: <GraduationCap className="h-10 w-10" />, label: "SCTP Courses", desc: "SkillsFuture-eligible upskilling paths" },
];

export default function ProfilePage() {
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Redirect logged-in users with a profile to the dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    const profileId = localStorage.getItem("profileId");
    if (token && profileId) {
      router.replace("/dashboard");
    }
  }, [router]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-primary/20 bg-primary/5 text-primary rounded-full">
            Powered by AI & SkillsFuture
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-secondary animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Discover Your Next<br />
            Tech Career in Singapore
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
            AI-powered job matching, skill gap analysis, and personalized upskilling roadmaps tailored for you.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Button
              size="lg"
              onClick={scrollToForm}
              className="h-12 px-8 text-lg rounded-full shadow-lg hover:shadow-primary/25 transition-all"
            >
              Get Started
              <ArrowDown className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-lg rounded-full"
            >
              Learn More
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-left">
            {HERO_FEATURES.map((f) => (
              <div key={f.label} className="group p-6 rounded-2xl bg-card border hover:border-primary/50 transition-all hover:shadow-lg">
                <div className="mb-4 p-3 rounded-xl bg-primary/10 w-fit text-primary group-hover:scale-110 transition-transform">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.label}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 blur-[120px] rounded-full opacity-50 -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-secondary/20 blur-[120px] rounded-full opacity-30 -z-10 pointer-events-none" />
      </section>

      {/* Profile Wizard Section */}
      <section id="form-section" ref={formRef} className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <ProfileWizard />
        </div>
      </section>
    </div>
  );
}
