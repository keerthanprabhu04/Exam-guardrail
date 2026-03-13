import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  role: 'student' | 'admin';
}

interface Violation {
  id: string;
  type: string;
  timestamp: string;
  details?: any;
}

interface ExamContextType {
  user: User | null;
  sessionId: string | null;
  trustScore: number;
  isFaceDetected: boolean;
  faceCount: number;
  violations: Violation[];
  setIsFaceDetected: (detected: boolean) => void;
  setFaceCount: (count: number) => void;
  login: (id: string, name: string, role: 'student' | 'admin') => Promise<void>;
  startExam: () => Promise<void>;
  logViolation: (type: string, details?: any) => Promise<void>;
  socket: Socket | null;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const ExamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [trustScore, setTrustScore] = useState(100);
  const [isFaceDetected, setIsFaceDetected] = useState(true);
  const [faceCount, setFaceCount] = useState(0);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io();
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  const login = async (id: string, name: string, role: 'student' | 'admin') => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, role })
    });
    const data = await res.json();
    setUser(data);
  };

  const startExam = async () => {
    if (!user) return;
    const res = await fetch('/api/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: user.id })
    });
    const data = await res.json();
    setSessionId(data.sessionId);
    setTrustScore(100);
  };

  const logViolation = async (type: string, details: any = {}) => {
    if (!sessionId || !user) return;
    const res = await fetch('/api/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, studentId: user.id, type, details })
    });
    const data = await res.json();
    setTrustScore(data.trustScore);
    setViolations(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: new Date().toISOString(),
      details
    }, ...prev].slice(0, 50));
  };

  return (
    <ExamContext.Provider value={{ 
      user, sessionId, trustScore, isFaceDetected, setIsFaceDetected, 
      faceCount, setFaceCount, violations,
      login, startExam, logViolation, socket 
    }}>
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => {
  const context = useContext(ExamContext);
  if (!context) throw new Error('useExam must be used within an ExamProvider');
  return context;
};
