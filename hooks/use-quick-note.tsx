"use client";

import { create } from "zustand";

type QuickNoteStore = {
  isEnabled: boolean;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
};

export const useQuickNote = create<QuickNoteStore>((set, get) => ({
  isEnabled: true,
  enable: () => set({ isEnabled: true }),
  disable: () => set({ isEnabled: false }),
  toggle: () => set({ isEnabled: !get().isEnabled }),
}));

