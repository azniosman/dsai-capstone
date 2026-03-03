import { create } from "zustand";

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
}

export interface ProfileBuilderState {
  step: number;

  resumeFile?: File;
  parsedResume?: Record<string, unknown>;

  personalInfo: PersonalInfo;
  skills: string[];

  // Actions
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;

  setResume: (file: File) => void;
  setParsedResume: (data: Record<string, unknown>) => void;
  setPersonalInfo: (data: Partial<PersonalInfo>) => void;
  setSkills: (skills: string[]) => void;

  reset: () => void;
}

const defaultPersonalInfo: PersonalInfo = {
  name: "",
  email: "",
  phone: "",
  location: "",
};

export const useProfileBuilderStore = create<ProfileBuilderState>((set) => ({
  step: 1,

  resumeFile: undefined,
  parsedResume: undefined,

  personalInfo: { ...defaultPersonalInfo },
  skills: [],

  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 4) })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),
  setStep: (step: number) => set({ step: Math.max(1, Math.min(step, 4)) }),

  setResume: (file) => set({ resumeFile: file }),
  setParsedResume: (data) => set({ parsedResume: data }),

  setPersonalInfo: (data) =>
    set((state) => ({
      personalInfo: { ...state.personalInfo, ...data },
    })),

  setSkills: (skills) => set({ skills }),

  reset: () => set({
    step: 1,
    resumeFile: undefined,
    parsedResume: undefined,
    personalInfo: { ...defaultPersonalInfo },
    skills: [],
  }),
}));
