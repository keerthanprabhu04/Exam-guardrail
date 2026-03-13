import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  updateDoc,
  increment
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';

interface User {
  id: string;
  name: string;
  role: 'student' | 'admin';
  email?: string;
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
  loginWithGoogle: (role: 'student' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  startExam: () => Promise<void>;
  submitExam: (answers: any) => Promise<void>;
  logViolation: (type: string, details?: any) => Promise<void>;
  socket: Socket | null;
  isAuthReady: boolean;
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
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const s = io();
    setSocket(s);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          // Fallback or wait for manual login to set data
        }
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });

    return () => { 
      s.disconnect(); 
      unsubscribe();
    };
  }, []);

  // Sync violations in real-time if session exists
  useEffect(() => {
    if (!sessionId) return;

    const q = query(
      collection(db, 'sessions', sessionId, 'violations'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newViolations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Violation[];
      setViolations(newViolations);
    });

    return () => unsubscribe();
  }, [sessionId]);

  // Sync session status/score
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = onSnapshot(doc(db, 'sessions', sessionId), (doc) => {
      if (doc.exists()) {
        setTrustScore(doc.data().trustScore);
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  const login = async (id: string, name: string, role: 'student' | 'admin') => {
    // For simple ID login, we'll use the ID as a pseudo-UID in Firestore for now
    // In a real app, you'd use Firebase Auth for everything
    const userData: User = { id, name, role };
    await setDoc(doc(db, 'users', id), userData);
    setUser(userData);
  };

  const loginWithGoogle = async (role: 'student' | 'admin') => {
    const result = await signInWithPopup(auth, googleProvider);
    const userData: User = {
      id: result.user.uid,
      name: result.user.displayName || 'Anonymous',
      role,
      email: result.user.email || undefined
    };
    await setDoc(doc(db, 'users', result.user.uid), userData);
    setUser(userData);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setSessionId(null);
  };

  const startExam = async () => {
    if (!user) return;
    
    const newSessionRef = doc(collection(db, 'sessions'));
    const sessionData = {
      id: newSessionRef.id,
      studentId: user.id,
      studentName: user.name,
      startTime: new Date().toISOString(),
      status: 'active',
      trustScore: 100,
      violationCount: 0,
      lastHeartbeat: new Date().toISOString()
    };
    
    await setDoc(newSessionRef, sessionData);
    setSessionId(newSessionRef.id);
    setTrustScore(100);
  };

  const submitExam = async (answers: any) => {
    if (!sessionId || !user) return;

    await setDoc(doc(db, 'submissions', sessionId), {
      sessionId,
      studentId: user.id,
      studentName: user.name,
      answers,
      submittedAt: new Date().toISOString()
    });

    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'submitted',
      endTime: new Date().toISOString()
    });

    setSessionId(null);
  };

  const logViolation = async (type: string, details: any = {}) => {
    if (!sessionId || !user) return;

    const violationData = {
      sessionId,
      studentId: user.id,
      type,
      timestamp: new Date().toISOString(),
      details
    };

    await addDoc(collection(db, 'sessions', sessionId, 'violations'), violationData);

    // Update trust score in session doc
    const penalties: Record<string, number> = {
      TAB_SWITCH: 15,
      WINDOW_RESIZE: 10,
      COPY_ATTEMPT: 20,
      IDLE_DETECTED: 5,
      MULTIPLE_FACES: 30,
      FACE_MISSING: 20,
      VOICE_DETECTED: 20,
      LOUD_AUDIO: 25,
      AUDIO_DEVICE_CHANGE: 30,
      LOOKING_AWAY: 10,
      FULLSCREEN_EXIT: 15,
      PROHIBITED_OBJECT: 25,
      MOBILE_PHONE_USAGE: 25,
      TURNING_AROUND: 15,
      MANUAL_OVERRIDE: 5
    };

    const penalty = penalties[type] || 5;
    await updateDoc(doc(db, 'sessions', sessionId), {
      trustScore: increment(-penalty),
      violationCount: increment(1)
    });
  };

  return (
    <ExamContext.Provider value={{ 
      user, sessionId, trustScore, isFaceDetected, setIsFaceDetected, 
      faceCount, setFaceCount, violations,
      login, loginWithGoogle, logout, startExam, submitExam, logViolation, socket,
      isAuthReady
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
