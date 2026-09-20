import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { AppTheme, lightTheme, darkTheme } from '../theme/theme';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    storage.get<boolean>(STORAGE_KEYS.SETTINGS + '_dark', false).then((saved) => {
      setIsDark(saved);
    });
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      storage.set(STORAGE_KEYS.SETTINGS + '_dark', next);
      return next;
    });
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
