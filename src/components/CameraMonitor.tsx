import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { useExam } from '../ExamContext';
import { Camera, AlertCircle, UserCheck, UserMinus, Users, Activity } from 'lucide-react';

export const CameraMonitor: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { logViolation, setIsFaceDetected, faceCount, setFaceCount } = useExam();
  const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const lastViolationRef = useRef<Record<string, number>>({});
  const missingFaceFramesRef = useRef<number>(0);
  const detectorRef = useRef<any>(null);
  const objectDetectorRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const statusRef = useRef<'loading' | 'active' | 'error'>('loading');
  const faceCountHistoryRef = useRef<number[]>([]);
  const lastSentFaceCountRef = useRef<number>(-1);
  const SMOOTHING_WINDOW = 20; // ~1 second of frames at 20-30fps

  const setupCamera = async () => {
    setStatus('loading');
    statusRef.current = 'loading';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setupAudioAnalysis(stream);
      await setupDetector();
    } catch (err) {
      console.error("Camera Error:", err);
      setStatus('error');
      setIsFaceDetected(false);
    }
  };

  const setupAudioAnalysis = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let voiceStartTime = 0;
    let loudStartTime = 0;
    const VOICE_THRESHOLD = 80; 
    const LOUD_THRESHOLD = 150; // Threshold for "loud" speaking
    const DURATION = 3000; // 3 seconds for loud audio

    const checkAudio = () => {
      if (statusRef.current !== 'active') {
        requestAnimationFrame(checkAudio);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      // Detect Loud Audio
      if (average > LOUD_THRESHOLD) {
        if (loudStartTime === 0) {
          loudStartTime = Date.now();
        } else if (Date.now() - loudStartTime > DURATION) {
          const now = Date.now();
          if (!lastViolationRef.current['LOUD_AUDIO'] || now - lastViolationRef.current['LOUD_AUDIO'] > 15000) {
            logViolation('LOUD_AUDIO', { intensity: Math.round(average) });
            lastViolationRef.current['LOUD_AUDIO'] = now;
          }
          loudStartTime = Date.now();
        }
      } else {
        loudStartTime = 0;
      }

      // Detect Voice/Noise
      if (average > VOICE_THRESHOLD) {
        if (voiceStartTime === 0) {
          voiceStartTime = Date.now();
        } else if (Date.now() - voiceStartTime > 5000) {
          const now = Date.now();
          if (!lastViolationRef.current['VOICE_DETECTED'] || now - lastViolationRef.current['VOICE_DETECTED'] > 10000) {
            logViolation('VOICE_DETECTED', { intensity: Math.round(average) });
            lastViolationRef.current['VOICE_DETECTED'] = now;
          }
          voiceStartTime = Date.now(); 
        }
      } else {
        voiceStartTime = 0;
      }
      
      requestAnimationFrame(checkAudio);
    };

    checkAudio();
  };

  const setupDetector = async () => {
    try {
      // Try WebGL first, fallback to CPU if it fails
      try {
        await tf.setBackend('webgl');
      } catch (e) {
        console.warn("WebGL not supported, falling back to CPU");
        await tf.setBackend('cpu');
      }
      await tf.ready();
      
      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      detectorRef.current = await faceLandmarksDetection.createDetector(model, {
        runtime: 'tfjs',
        refineLandmarks: false, // Set to false for better performance/stability
        maxFaces: 5 // Track multiple people as requested
      });

      // Load Object Detector for mobile phones
      objectDetectorRef.current = await cocoSsd.load();
      
      setStatus('active');
      statusRef.current = 'active';
      detect();
    } catch (err) {
      console.error("Detector Error:", err);
      setStatus('error');
    }
  };

  const detect = async () => {
    if (detectorRef.current && objectDetectorRef.current && videoRef.current && videoRef.current.readyState === 4) {
      try {
        // Run both detectors
        const [faces, objects] = await Promise.all([
          detectorRef.current.estimateFaces(videoRef.current),
          objectDetectorRef.current.detect(videoRef.current)
        ]);

        // Smoothing logic for faceCount
        const rawFaceCount = faces.length;
        faceCountHistoryRef.current.push(rawFaceCount);
        if (faceCountHistoryRef.current.length > SMOOTHING_WINDOW) {
          faceCountHistoryRef.current.shift();
        }

        // Calculate the mode (most frequent value) for stability
        const frequencyMap: Record<number, number> = {};
        faceCountHistoryRef.current.forEach(count => {
          frequencyMap[count] = (frequencyMap[count] || 0) + 1;
        });

        let smoothedFaceCount = rawFaceCount;
        let maxFreq = 0;
        for (const count in frequencyMap) {
          if (frequencyMap[count] > maxFreq) {
            maxFreq = frequencyMap[count];
            smoothedFaceCount = parseInt(count);
          }
        }

        if (smoothedFaceCount !== lastSentFaceCountRef.current) {
          setFaceCount(smoothedFaceCount);
          lastSentFaceCountRef.current = smoothedFaceCount;
        }
        const currentFaceCount = smoothedFaceCount;

        // Check for mobile phones
        const phoneDetected = objects.some(obj => obj.class === 'cell phone' && obj.score > 0.6);
        const personDetected = objects.some(obj => obj.class === 'person' && obj.score > 0.6);

        // Draw Debug Overlay
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            
            // Draw Faces
            faces.forEach((face: any) => {
              const box = face.box;
              ctx.strokeStyle = '#10b981'; // Emerald 500
              ctx.lineWidth = 3;
              ctx.strokeRect(box.xMin, box.yMin, box.width, box.height);
            });

            // Draw Objects (Phones)
            objects.forEach(obj => {
              if (obj.class === 'cell phone' && obj.score > 0.6) {
                ctx.strokeStyle = '#ef4444'; // Red 500
                ctx.lineWidth = 4;
                ctx.strokeRect(obj.bbox[0], obj.bbox[1], obj.bbox[2], obj.bbox[3]);
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 12px Inter';
                ctx.fillText('MOBILE PHONE DETECTED', obj.bbox[0], obj.bbox[1] - 10);
              }
            });
          }
        }

        // Smoothing logic: Increased to 300 frames (~10 seconds) for extreme stability
        const MISSING_THRESHOLD = 300;
        if (currentFaceCount >= 1) {
          missingFaceFramesRef.current = 0;
          setIsFaceDetected(true);
        } else {
          missingFaceFramesRef.current += 1;
          if (missingFaceFramesRef.current > MISSING_THRESHOLD) {
            setIsFaceDetected(false);
          }
        }

        const now = Date.now();
        const throttle = (type: string, delay: number) => {
          if (!lastViolationRef.current[type] || now - lastViolationRef.current[type] > delay) {
            logViolation(type);
            lastViolationRef.current[type] = now;
          }
        };

        if (currentFaceCount === 1) {
          const face = faces[0];
          const keypoints = face.keypoints;
          
          // Simple Head Pose Estimation
          // Keypoints: 1 (nose), 33 (left eye), 263 (right eye)
          const nose = keypoints[1];
          const leftEye = keypoints[33];
          const rightEye = keypoints[263];

          if (nose && leftEye && rightEye) {
            const eyeDist = rightEye.x - leftEye.x;
            const noseOffset = nose.x - (leftEye.x + eyeDist / 2);
            const ratio = noseOffset / eyeDist;

            // If ratio is too high or too low, user is looking away
            if (Math.abs(ratio) > 0.45) {
              throttle('LOOKING_AWAY', 10000);
            }
          }
        }

        if (phoneDetected) {
          throttle('MOBILE_PHONE_USAGE', 10000);
        }

        if (personDetected && currentFaceCount === 0) {
          // Only log if person is detected but no face for a significant time
          if (missingFaceFramesRef.current > 60) {
            throttle('TURNING_AROUND', 10000);
          }
        }

        if (currentFaceCount > 1) {
          throttle('MULTIPLE_FACES', 15000);
        } else if (currentFaceCount === 0 && missingFaceFramesRef.current > MISSING_THRESHOLD) {
          throttle('FACE_MISSING', 20000);
        }
      } catch (err) {
        console.error("Detection Loop Error:", err);
      }
    }
    if (statusRef.current === 'active') {
      requestAnimationFrame(detect);
    }
  };

  useEffect(() => {
    setupCamera();

    const handleDeviceChange = () => {
      if (statusRef.current === 'active') {
        logViolation('AUDIO_DEVICE_CHANGE', { timestamp: new Date().toISOString() });
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl">
        <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none scale-x-[-1]" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full flex items-center gap-2 text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest">
            <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {status === 'active' ? 'AI ACTIVE' : 'INITIALIZING'}
          </div>
          <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full flex items-center gap-2 text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest">
            <Users size={12} className={faceCount === 1 ? 'text-emerald-400' : 'text-red-400'} />
            PEOPLE DETECTED: <span className={faceCount === 1 ? 'text-emerald-400' : 'text-red-400'}>{faceCount}</span>
          </div>
          {faceCount === 0 && missingFaceFramesRef.current > 0 && (
            <div className="px-3 py-1 bg-red-500/20 backdrop-blur-md rounded-full flex items-center gap-2 text-[10px] font-bold text-red-400 border border-red-500/20 uppercase tracking-widest animate-pulse">
              <AlertCircle size={12} />
              FACE LOST: {Math.ceil((300 - missingFaceFramesRef.current) / 30)}s REMAINING
            </div>
          )}
        </div>

        {status === 'error' && (
          <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <AlertCircle className="text-red-400" size={40} />
            <p className="text-sm font-bold text-white">Camera or AI Initialization Failed</p>
            <button 
              onClick={setupCamera}
              className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-white/90 transition-all"
            >
              RETRY INITIALIZATION
            </button>
          </div>
        )}
      </div>

      <button 
        onClick={setupCamera}
        className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white/50 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2"
      >
        <Activity size={14} /> Reset AI Proctoring Engine
      </button>
    </div>
  );
};
