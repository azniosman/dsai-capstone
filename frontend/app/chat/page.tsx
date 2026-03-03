"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Terminal, Send, Paperclip, Mic, Settings2 } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: React.ReactNode;
  time: string;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      time: "T+0.002s",
      text: (
        <>
          <span className="text-primary">ALIGNMENT_QUERY:</span> 98% MATCH
          DETECTED FOR{" "}
          <span className="text-primary underline">GOVTECH_NODE</span>
          .<br />
          <br />
          DATA_SYNOPSIS: Candidate profile matches structural requirements for
          Senior Neural Architect. Proceed with node evaluation?
        </>
      ),
    },
    {
      id: "2",
      sender: "user",
      time: "T+4.120s",
      text: "EXECUTE_ANALYSIS: SHOW_MATCH_DETAILS",
    },
    {
      id: "3",
      sender: "ai",
      time: "T+4.890s",
      text: (
        <div className="font-mono text-[12px] leading-tight text-slate-400 space-y-1 w-full">
          <div className="flex justify-between border-b border-primary/20 pb-1 mb-2">
            <span className="text-primary font-bold">NODE_ID</span>
            <span className="text-slate-200">GT-X882</span>
          </div>
          <p className="text-slate-200 uppercase mb-2">
            METRIC_EXTRACTION_SUCCESSFUL:
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[100px] bg-slate-900 h-1.5 overflow-hidden">
              <div className="bg-primary h-full w-[94%] shadow-[0_0_5px_#259df4]" />
            </div>
            <span>SKILL_OVERLAP: 94%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[100px] bg-slate-900 h-1.5 overflow-hidden">
              <div className="bg-primary h-full w-[88%] shadow-[0_0_5px_#259df4]" />
            </div>
            <span>CULTURAL_SYNC: 88%</span>
          </div>
          <p className="pt-2 text-[11px] text-slate-500 uppercase tracking-widest mt-2">
            Awaiting further instruction strings...
          </p>
        </div>
      ),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      time: `T+${(Math.random() * 10).toFixed(3)}s`,
      text: input.toUpperCase(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    // Mock AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        time: `T+${(Math.random() * 10).toFixed(3)}s`,
        text: (
          <>
            <span className="text-primary">PROCESSING_INPUT:</span>
            <br />
            Command acknowledged. Analyzing parameters according to SCTP
            compliance protocols. Please stand by for computational alignment...
          </>
        ),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-background-dark font-display text-slate-100 selection:bg-primary selection:text-background-dark overflow-hidden">
      <style>{`
        .cyber-grid {
          background-image: linear-gradient(to right, rgba(37, 157, 244, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(37, 157, 244, 0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .scanline {
          width: 100%;
          height: 2px;
          background: rgba(37, 157, 244, 0.1);
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10;
          pointer-events: none;
        }
        /* Custom Scrollbar for Terminal */
        .terminal-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .terminal-scroll::-webkit-scrollbar-track {
          background: rgba(37, 157, 244, 0.05);
        }
        .terminal-scroll::-webkit-scrollbar-thumb {
          background: rgba(37, 157, 244, 0.3);
        }
        .terminal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(37, 157, 244, 0.6);
        }
      `}</style>

      <div className="absolute inset-0 cyber-grid pointer-events-none z-0"></div>
      <div className="scanline"></div>

      {/* Header */}
      <header className="relative z-20 flex items-center bg-background-dark/80 backdrop-blur-md border-b border-primary/20 p-4 justify-between">
        <Link
          href="/dashboard"
          className="text-primary flex size-10 shrink-0 items-center justify-center border border-primary/30 hover:bg-primary/10 transition-colors"
        >
          <Terminal className="h-5 w-5" />
        </Link>
        <h1 className="text-primary text-sm font-bold leading-tight tracking-[0.2em] flex-1 text-center font-mono uppercase">
          NEURAL_ASSISTANT_INTERFACE
        </h1>
        <div className="flex w-10 items-center justify-end">
          <button className="flex items-center justify-center size-10 border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
            <Settings2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* System Status Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-1.5 border-b border-primary/10 bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="size-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_5px_rgba(37,157,244,0.8)]"></div>
          <span className="text-[10px] font-mono text-primary tracking-widest uppercase font-bold">
            CORE_SYSTEM_ACTIVE
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          LOC: SG_REGION_01
        </span>
      </div>

      {/* Chat Area */}
      <main className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 terminal-scroll">
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] ${
                msg.sender === "user" ? "items-end ml-auto" : "items-start"
              }`}
            >
              {msg.sender === "ai" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase px-2 py-0.5 border border-primary/30 bg-primary/10 shadow-[0_0_10px_rgba(37,157,244,0.1)]">
                      TALENT_GPT_CORE
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">
                      {msg.time}
                    </span>
                  </div>
                  <div className="bg-(--card-dark) border-l-2 border-primary p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(37,157,244,0.05)]">
                    <div className="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-300">
                      {msg.text}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase">
                      {msg.time}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 font-bold tracking-widest uppercase px-2 py-0.5 border border-slate-600 bg-slate-800">
                      USER_NODE
                    </span>
                  </div>
                  <div className="bg-slate-800 border-r-2 border-slate-400 p-4 sm:p-5">
                    <p className="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-100 uppercase tracking-wider">
                      {msg.text}
                    </p>
                  </div>
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Footer / Input Area */}
      <footer className="relative z-20 bg-background-dark/90 backdrop-blur-md border-t border-primary/20 p-4 sm:p-6 pb-20 md:pb-6 space-y-4">
        <div className="max-w-4xl mx-auto">
          {/* Quick Commands */}
          <div className="flex gap-2 overflow-x-auto pb-4 terminal-scroll">
            <button
              onClick={() => setInput("INITIATE_MOCK_INTERVIEW")}
              className="whitespace-nowrap font-mono text-[10px] font-bold border border-primary/30 bg-primary/5 px-4 py-2 text-primary hover:bg-primary hover:text-background-dark transition-all uppercase tracking-widest"
            >
              INITIATE_MOCK_INTERVIEW
            </button>
            <button
              onClick={() => setInput("RUN_SALARY_DELTA_QUERY")}
              className="whitespace-nowrap font-mono text-[10px] font-bold border border-primary/30 bg-primary/5 px-4 py-2 text-primary hover:bg-primary hover:text-background-dark transition-all uppercase tracking-widest"
            >
              RUN_SALARY_DELTA_QUERY
            </button>
            <button
              onClick={() => setInput("EXTRACT_SKILL_NODES")}
              className="whitespace-nowrap font-mono text-[10px] font-bold border border-primary/30 bg-primary/5 px-4 py-2 text-primary hover:bg-primary hover:text-background-dark transition-all uppercase tracking-widest"
            >
              EXTRACT_SKILL_NODES
            </button>
          </div>

          {/* Input Bar */}
          <div className="flex flex-col gap-3">
            <form
              onSubmit={handleSend}
              className="relative flex items-center border border-primary/30 bg-(--card-dark) focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(37,157,244,0.1)] transition-all"
            >
              <div className="pl-4 text-primary animate-pulse">
                <span className="font-mono font-bold text-lg">&gt;</span>
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-slate-100 font-mono text-sm sm:text-base uppercase tracking-wider placeholder:text-slate-600 py-4 sm:py-5 px-3"
                placeholder="AWAITING_INPUT_PACKET..."
                type="text"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-primary/20 border-l border-primary/30 text-primary font-mono font-bold text-[11px] px-6 py-4 sm:py-5 hover:bg-primary hover:text-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-[0.2em] flex items-center gap-2"
              >
                <span className="hidden sm:inline">SEND_PACKET</span>
                <Send className="h-4 w-4" />
              </button>
            </form>

            <div className="flex justify-between px-2">
              <div className="flex gap-6">
                <button className="text-slate-500 hover:text-primary transition-colors flex items-center gap-1 group">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-[9px] font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                    Attach
                  </span>
                </button>
                <button className="text-slate-500 hover:text-primary transition-colors flex items-center gap-1 group">
                  <Mic className="h-4 w-4" />
                  <span className="text-[9px] font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                    Audio
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">
                ENCRYPT_MODE: <span className="text-primary/70">AES_256</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
