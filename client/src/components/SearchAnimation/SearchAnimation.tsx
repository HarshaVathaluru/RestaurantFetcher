import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Compass, CheckCircle2, Sliders, ShieldCheck } from 'lucide-react';

interface SearchAnimationProps {
  query: string;
  onComplete?: () => void;
}

const STAGES = [
  { text: 'Understanding your request...', icon: Sparkles, detail: 'Extracting cuisine, budget, atmosphere & dietary intent' },
  { text: 'Finding places...', icon: Compass, detail: 'Querying geographical boundaries and place registry' },
  { text: 'Checking ratings and preferences...', icon: Sliders, detail: 'Verifying authentic reviews, prices and verified amenities' },
  { text: 'Matching the best results...', icon: ShieldCheck, detail: 'Evaluating relevance weights and compiling match evidence' },
  { text: 'Ready', icon: CheckCircle2, detail: 'Presenting personalized dining matches' },
];

export const SearchAnimation: React.FC<SearchAnimationProps> = ({ query }) => {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    return () => clearInterval(interval);
  }, []);

  const activeStage = STAGES[currentStage];
  const IconComponent = activeStage.icon;

  return (
    <div className="w-full max-w-xl mx-auto my-12 p-8 rounded-3xl bg-surface-card/90 border border-surface-border shadow-2xl backdrop-blur-xl text-center">
      {/* Ambient Pulsing Glow */}
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="absolute inset-0 w-16 h-16 rounded-full bg-amber-500/20 blur-xl animate-ping" />
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-black shadow-glow">
          <IconComponent className="w-7 h-7 animate-bounce" />
        </div>
      </div>

      {/* Query echo */}
      <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-2">
        AI Intent Engine Processing
      </p>
      <h3 className="text-lg font-medium text-slate-300 italic mb-6 line-clamp-1 px-4">
        &ldquo;{query}&rdquo;
      </h3>

      {/* Active Stage Label */}
      <div className="h-16 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-1"
          >
            <p className="text-xl font-bold text-white tracking-tight">
              {activeStage.text}
            </p>
            <p className="text-xs text-slate-400">
              {activeStage.detail}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stepper Progress Bar */}
      <div className="mt-8 flex items-center justify-between gap-2 max-w-xs mx-auto">
        {STAGES.map((stage, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                idx <= currentStage ? 'bg-amber-400 shadow-glow' : 'bg-slate-800'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
