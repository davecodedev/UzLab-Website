"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "ru" | "uz" | "en";

const LANG_KEY = "uzlab_lang";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "ru",
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "ru" || stored === "uz" || stored === "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage
      setLangState(stored);
    }
  }, []);

  function setLang(l: Lang) {
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Pick the string for the active language out of a {ru,uz,en} dictionary entry. */
export function pick<T>(dict: Record<Lang, T>, lang: Lang): T {
  return dict[lang];
}
