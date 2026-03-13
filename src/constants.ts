import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PENALTIES: Record<string, number> = {
  TAB_SWITCH: 15,
  WINDOW_RESIZE: 10,
  COPY_ATTEMPT: 20,
  IDLE_DETECTED: 5,
  MULTIPLE_FACES: 30,
  FACE_MISSING: 20,
  VOICE_DETECTED: 20,
  LOOKING_AWAY: 10,
  FULLSCREEN_EXIT: 15,
  PROHIBITED_OBJECT: 25
};

export const QUESTIONS = [
  { id: 1, text: "What is the primary purpose of the 'Exam Guardrail System'?", options: ["Game development", "Integrity monitoring", "Social media", "E-commerce"] },
  { id: 2, text: "Which API is used to detect tab switching?", options: ["Geolocation API", "VisibilityChange API", "Battery API", "Web Bluetooth API"] },
  { id: 3, text: "What is the initial Trust Score for a student?", options: ["50", "0", "100", "75"] },
  { id: 4, text: "Which AI model is used for face detection in this project?", options: ["GPT-4", "MediaPipe", "Stable Diffusion", "DALL-E"] },
  { id: 5, text: "What happens when a student exits fullscreen mode?", options: ["Exam ends", "Violation logged", "Score increases", "Nothing"] }
];
