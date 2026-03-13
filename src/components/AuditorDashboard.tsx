import React, { useEffect, useState } from 'react';
import { useExam } from '../ExamContext';
import { motion } from 'motion/react';
import { 
  Users, 
  ShieldAlert, 
  Activity, 
  History, 
  TrendingDown, 
  User,
  AlertCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const AuditorDashboard: React.FC = () => {
  const { socket } = useExam();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);

  const fetchSessions = async () => {
    const res = await fetch('/api/admin/sessions');
    const data = await res.json();
    setSessions(data);
  };

  useEffect(() => {
    fetchSessions();
    if (socket) {
      socket.on('violation_update', () => {
        fetchSessions();
      });
    }
    return () => { socket?.off('violation_update'); };
  }, [socket]);

  const fetchViolations = async (sessionId: string) => {
    const res = await fetch(`/api/admin/violations/${sessionId}`);
    const data = await res.json();
    setViolations(data);
  };

  const chartData = {
    labels: sessions.map(s => s.student_name).slice(0, 5),
    datasets: [
      {
        label: 'Trust Score',
        data: sessions.map(s => s.trust_score).slice(0, 5),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        tension: 0.4,
      }
    ]
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Auditor Dashboard</h1>
            <p className="text-white/50 mt-2">Real-time integrity monitoring and trust score analytics.</p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">System Live</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Active Sessions', value: sessions.length, icon: Users, color: 'text-indigo-400' },
            { label: 'Total Violations', value: sessions.reduce((acc, s) => acc + s.violation_count, 0), icon: ShieldAlert, color: 'text-red-400' },
            { label: 'Avg Trust Score', value: `${Math.round(sessions.reduce((acc, s) => acc + s.trust_score, 0) / (sessions.length || 1))}%`, icon: Activity, color: 'text-emerald-400' },
            { label: 'High Risk Students', value: sessions.filter(s => s.trust_score < 60).length, icon: AlertCircle, color: 'text-amber-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-white/50 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                  <stat.icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Monitor Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Live Student Monitor</h3>
            <span className="text-[10px] text-white/20 font-medium">{sessions.length} Students Online</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sessions.map((session) => (
              <motion.div 
                key={session.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4 relative overflow-hidden group hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{session.student_name}</p>
                      <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest">{session.student_id}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    session.trust_score > 80 ? "bg-emerald-500" : session.trust_score > 50 ? "bg-amber-500" : "bg-red-500"
                  )} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Trust Score</span>
                    <span className={cn(
                      "text-lg font-black",
                      session.trust_score > 80 ? "text-emerald-400" : session.trust_score > 50 ? "text-amber-400" : "text-red-400"
                    )}>{session.trust_score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${session.trust_score}%` }}
                      className={cn(
                        "h-full transition-all duration-1000",
                        session.trust_score > 80 ? "bg-emerald-500" : session.trust_score > 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={12} className="text-white/20" />
                    <span className="text-[10px] font-bold text-white/40">{session.violation_count} Alerts</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedSession(session);
                      fetchViolations(session.id);
                    }}
                    className="text-[10px] font-black text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Session List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-bottom border-white/10 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <History size={18} /> Recent Sessions
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-xs font-bold text-white/30 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Start Time</th>
                      <th className="px-6 py-4">Violations</th>
                      <th className="px-6 py-4">Trust Score</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                              <User size={16} />
                            </div>
                            <div>
                              <p className="font-medium">{session.student_name}</p>
                              <p className="text-xs text-white/30">{session.student_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/50">
                          {new Date(session.start_time).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-md text-xs font-bold",
                            session.violation_count > 5 ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/50"
                          )}>
                            {session.violation_count} Events
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden w-24">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000",
                                  session.trust_score > 80 ? "bg-emerald-500" : 
                                  session.trust_score > 50 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${session.trust_score}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold">{session.trust_score}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              setSelectedSession(session);
                              fetchViolations(session.id);
                            }}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                          >
                            View Logs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Analytics / Details */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <TrendingDown size={18} /> Score Distribution
              </h3>
              <div className="h-64">
                <Line data={chartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }} />
              </div>
            </div>

            {selectedSession && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Violation Timeline</h3>
                  <button onClick={() => setSelectedSession(null)} className="text-xs text-white/30 uppercase">Close</button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {violations.map((v, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{v.type}</span>
                        <span className="text-[10px] text-white/30">{new Date(v.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-white/70">{v.details !== "{}" ? v.details : 'Suspicious behavior detected'}</p>
                    </div>
                  ))}
                  {violations.length === 0 && (
                    <p className="text-center py-8 text-white/20 text-sm italic">No violations recorded for this session.</p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
