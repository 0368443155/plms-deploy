import { create } from "zustand";
import { ReactNode } from "react";

interface NavbarActionsStore {
    title: string;
    description?: string;
    actions: ReactNode;
    setNavbarContent: (title: string, description?: string, actions?: ReactNode) => void;
    clearNavbarContent: () => void;
}

export const useNavbarActions = create<NavbarActionsStore>((set) => ({
    title: "",
    description: undefined,
    actions: null,
    setNavbarContent: (title, description, actions) =>
        set({ title, description, actions }),
    clearNavbarContent: () =>
        set({ title: "", description: undefined, actions: null }),
}));
