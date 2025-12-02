"use client";

import { create } from "zustand";

type StudyModeStore = {
  isActive: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
};

export const useStudyMode = create<StudyModeStore>((set, get) => ({
  isActive: false,
  toggle: () => set({ isActive: !get().isActive }),
  enable: () => set({ isActive: true }),
  disable: () => set({ isActive: false }),
}));

