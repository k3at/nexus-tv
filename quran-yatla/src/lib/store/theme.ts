import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "sepia" | "dark";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          if (theme === "light") {
            document.documentElement.removeAttribute("data-theme");
          } else {
            document.documentElement.setAttribute("data-theme", theme);
          }
        }
      },
    }),
    {
      name: "quran-yatla-theme",
    }
  )
);
