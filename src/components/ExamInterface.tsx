import React, { useState, useEffect } from 'react';
import { useExam } from '../ExamContext';
import { QUESTIONS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, Shield, AlertTriangle, Users, Activity } from 'lucide-react';

export const ExamInterface: React.FC = () => {
  const { trustScore, logViolation, isFaceDetected, setIsFaceDetected, faceCount, violations } = useExam();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [shuffledQuestions, setShuffledQuestions] = useState(QUESTIONS);
  const [isIdle, setIsIdle] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    
    const resetIdleTimer = () => {
      setIsIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsIdle(true);
      }, 60000); // 60 seconds
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer));

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
    };
  }, []);

  useEffect(() => {
    setShuffledQuestions([...QUESTIONS].sort(() => Math.random() - 0.5));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitoring Hooks
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('TAB_SWITCH', { timestamp: new Date().toISOString() });
      }
    };

    const handleResize = () => {
      // Disable window resize violations for now as they are too sensitive in the preview environment
      console.log('Window resized:', window.innerWidth);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const forbidden = (e.ctrlKey && ['c', 'v', 'x', 'i', 'j'].includes(e.key.toLowerCase())) || 
                        ['F12', 'PrintScreen'].includes(e.key);
      if (forbidden) {
        e.preventDefault();
        logViolation('COPY_ATTEMPT', { key: e.key });
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logViolation('COPY_ATTEMPT', { type: 'context_menu' });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    // In a real app, we would send the answers to the server here
    console.log("Exam submitted:", answers);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-emerald-500 rounded-full mx-auto flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white tracking-tight">Exam Submitted Successfully</h1>
          <p className="text-white/50 text-lg">Your integrity-locked session has been completed. Your results are being processed by the AI Auditor.</p>
        </div>
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4 text-left">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">Final Trust Score</span>
            <span className={`text-lg font-bold ${trustScore > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{trustScore}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">Violations Recorded</span>
            <span className="text-lg font-bold text-white">{violations.length}</span>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const q = shuffledQuestions[currentQuestion];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 relative">
      {/* Floating Real-time Integrity Badge */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed top-24 right-8 z-[60] hidden xl:block"
      >
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 w-32">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-white/5"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="226.19"
                initial={{ strokeDashoffset: 226.19 }}
                animate={{ strokeDashoffset: 226.19 - (226.19 * trustScore) / 100 }}
                className={cn(
                  "transition-all duration-1000",
                  trustScore > 80 ? "text-emerald-500" : trustScore > 50 ? "text-amber-500" : "text-red-500"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-black text-white">{trustScore}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Integrity</p>
            <p className={cn(
              "text-[8px] font-bold uppercase tracking-tighter mt-1",
              trustScore > 80 ? "text-emerald-400" : trustScore > 50 ? "text-amber-400" : "text-red-400"
            )}>
              {trustScore > 80 ? 'EXCELLENT' : trustScore > 50 ? 'CAUTION' : 'CRITICAL'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Time Remaining</p>
            <p className="text-xl font-bold text-white font-mono">{formatTime(timeLeft)}</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl",
            trustScore > 80 ? "bg-emerald-500/20 text-emerald-400" : 
            trustScore > 50 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
          )}>
            <Shield size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Trust Score</p>
            <p className={cn(
              "text-xl font-bold",
              trustScore > 80 ? "text-emerald-400" : 
              trustScore > 50 ? "text-amber-400" : "text-red-400"
            )}>{trustScore}%</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-violet-500/20 rounded-xl text-violet-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Progress</p>
            <p className="text-xl font-bold text-white">{currentQuestion + 1} / {shuffledQuestions.length}</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl",
            faceCount === 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          )}>
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">People in Frame</p>
            <p className={cn(
              "text-xl font-bold",
              faceCount === 1 ? "text-emerald-400" : "text-red-400"
            )}>{faceCount}</p>
          </div>
        </div>
      </div>

      {/* Question Area */}
      <motion.div 
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl relative min-h-[400px] flex flex-col justify-center overflow-hidden group"
      >
        <div className="absolute -top-3 left-8 px-4 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full z-10">
          QUESTION {currentQuestion + 1}
        </div>

        {/* Privacy Warning Badge */}
        <AnimatePresence>
          {!isFaceDetected && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 right-6 z-30 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full shadow-lg shadow-red-500/20"
            >
              <Shield size={16} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Face Not Detected</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn(
          "space-y-8 transition-[filter,opacity] duration-700 ease-in-out select-none",
          (!isFaceDetected || isIdle)
            ? "blur-2xl opacity-40 pointer-events-none" 
            : "opacity-100"
        )}>
          <h2 className="text-2xl font-medium text-white leading-relaxed cursor-default">
            {q.text}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setAnswers({ ...answers, [q.id]: idx })}
                className={cn(
                  "w-full p-5 rounded-2xl text-left transition-all duration-200 border",
                  answers[q.id] === idx 
                    ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10" 
                    : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors",
                    answers[q.id] === idx ? "border-indigo-400 bg-indigo-400 text-indigo-900" : "border-white/20"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="font-medium">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {isIdle ? (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
             <div className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-xl shadow-2xl">
               IDLE DETECTION: MOVE MOUSE TO RESUME
             </div>
          </div>
        ) : !isFaceDetected && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
             <button 
               onClick={() => {
                 setIsFaceDetected(true);
                 logViolation('MANUAL_OVERRIDE', { reason: 'Detection failure' });
               }}
               className="px-6 py-3 bg-white text-black text-xs font-bold rounded-xl shadow-2xl hover:scale-105 transition-transform"
             >
               I AM IN FRONT OF CAMERA (MANUAL VERIFY)
             </button>
             <p className="mt-4 text-[10px] text-white/40 font-medium uppercase tracking-widest">Manual verification will be logged</p>
          </div>
        )}

        {/* Face Lost Overlay Message (Optional, but user said 'ensure all questions are blurred') */}
        {!isFaceDetected && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <p className="text-white/30 text-sm font-medium uppercase tracking-[0.2em]">Monitoring Active</p>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          disabled={currentQuestion === 0}
          onClick={() => setCurrentQuestion(prev => prev - 1)}
          className="px-6 py-3 rounded-xl bg-white/5 text-white/50 font-medium hover:bg-white/10 disabled:opacity-0 transition-all"
        >
          Previous
        </button>
        
        {currentQuestion === shuffledQuestions.length - 1 ? (
          <button 
            disabled={answers[q.id] === undefined}
            onClick={handleSubmit}
            className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Exam
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(prev => prev + 1)}
            disabled={answers[q.id] === undefined}
            className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Question
          </button>
        )}
      </div>

      {trustScore < 50 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
          <AlertTriangle />
          <p className="text-sm font-medium">Warning: Your trust score is critically low. Continued violations will result in automatic disqualification.</p>
        </div>
      )}

      {/* Monitoring Log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Live Monitoring Log</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest">System Healthy</span>
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="max-h-[200px] overflow-y-auto p-2 space-y-1 scrollbar-hide">
            <AnimatePresence initial={false}>
              {violations.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-white/20 font-medium italic">No violations recorded. Integrity maintained.</p>
                </div>
              ) : (
                violations.map((v) => (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                        <AlertTriangle size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">{v.type.replace(/_/g, ' ')}</p>
                        <p className="text-[9px] text-white/40 font-mono">{new Date(v.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                      Logged
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
