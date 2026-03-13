import React, { useState, useEffect } from 'react';
import { ExamProvider, useExam } from './ExamContext';
import { ExamInterface } from './components/ExamInterface';
import { CameraMonitor } from './components/CameraMonitor';
import { AuditorDashboard } from './components/AuditorDashboard';
import { ProctorDashboard } from './components/ProctorDashboard';
import { Shield, User, LogIn, LayoutDashboard, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LoginPage: React.FC = () => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const { login, loginWithGoogle, isAuthReady } = useExam();

  if (!isAuthReady) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl"
      >
        <div className="text-center space-y-4 mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Exam Guardrail</h1>
          <p className="text-white/50">Secure Online Integrity Platform</p>
        </div>

        <div className="flex p-1 bg-white/5 rounded-2xl mb-8">
          <button 
            onClick={() => setRole('student')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${role === 'student' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            Student
          </button>
          <button 
            onClick={() => setRole('admin')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${role === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            Teacher
          </button>
        </div>

        <div className="space-y-6">
          <button
            onClick={() => loginWithGoogle(role)}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 hover:bg-white/90"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#050505] px-2 text-white/30 font-bold tracking-widest">Or use ID</span></div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">
              {role === 'student' ? 'Student ID' : 'Teacher ID'}
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder={role === 'student' ? "e.g. 4JN23CS089" : "e.g. T-882"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative">
              <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="John Doe"
              />
            </div>
          </div>

          <button
            onClick={() => login(id, name, role)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group"
          >
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            {role === 'student' ? 'Join Exam Session' : 'Access Auditor Panel'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const { user, sessionId, startExam, isAuthReady, logout } = useExam();
  const [view, setView] = useState<'student' | 'admin'>('student');

  useEffect(() => {
    if (user?.role === 'admin') {
      setView('admin');
    }
  }, [user]);

  if (!isAuthReady) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <LoginPage />;

  if (view === 'admin') return (
    <>
      {user.role === 'admin' && (
        <button 
          onClick={() => setView(view === 'admin' ? 'student' : 'admin')}
          className="fixed top-8 right-8 z-50 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg"
        >
          {view === 'admin' ? 'Student View' : 'Admin View'}
        </button>
      )}
      <AuditorDashboard />
    </>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Shield size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight">Exam Guardrail</span>
          </div>
          
          <div className="flex items-center gap-6">
            {user.role === 'admin' && (
              <button 
                onClick={() => setView('admin')}
                className="flex items-center gap-2 text-xs font-bold text-white/50 hover:text-white transition-colors uppercase tracking-widest"
              >
                <LayoutDashboard size={16} /> Auditor Panel
              </button>
            )}
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold">{user.name}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{user.id}</p>
              </div>
              <button 
                onClick={logout}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <LogIn size={20} className="rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-12">
        {!sessionId ? (
          <div className="max-w-2xl mx-auto text-center space-y-8 px-6">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight">Ready to begin?</h1>
              <p className="text-white/50 text-lg">Please ensure you are in a quiet environment with good lighting. AI proctoring will be active throughout the session.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {[
                "Fullscreen mode is mandatory",
                "Tab switching is prohibited",
                "AI Camera monitoring active",
                "Trust score impacts results"
              ].map((rule, i) => (
                <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-sm font-medium">{rule}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                document.documentElement.requestFullscreen();
                startExam();
              }}
              className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-indigo-500/40 text-lg"
            >
              Start Integrity-Locked Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 max-w-[1600px] mx-auto">
            <div className="lg:col-span-3">
              <ExamInterface />
            </div>
            <div className="space-y-6">
              <div className="sticky top-32">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 ml-1">Live AI Proctoring</p>
                <CameraMonitor />
                <div className="mt-6">
                  <ProctorDashboard />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ExamProvider>
      <MainApp />
    </ExamProvider>
  );
}
