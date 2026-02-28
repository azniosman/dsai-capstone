import { create } from "zustand";

export type ModalType =
  | "resumeUpload"
  | "resumePreview"
  | "careerAnalysis"
  | "skillGap"
  | "aiChat"
  | "profile"
  | "voiceCoach"
  | "jdMatch"
  | "interview"
  | "roleMatch"
  | "skillsFutureCourses"
  | null;

interface ModalStore {
  type: ModalType;
  isOpen: boolean;
  data: unknown;
  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  type: null,
  isOpen: false,
  data: {},
  openModal: (type, data = {}) => set({ type, isOpen: true, data }),
  closeModal: () => set({ type: null, isOpen: false, data: {} }),
}));
