import React, { createContext, useContext, useState, ReactNode } from 'react';

interface IniFileContextType {
  currentIniFile: string | null;
  iniContent: string;
  setCurrentIniFile: (path: string | null) => void;
  setIniContent: (content: string) => void;
}

const IniFileContext = createContext<IniFileContextType | undefined>(undefined);

export const IniFileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentIniFile, setCurrentIniFile] = useState<string | null>(null);
  const [iniContent, setIniContent] = useState<string>('');

  return (
    <IniFileContext.Provider
      value={{
        currentIniFile,
        iniContent,
        setCurrentIniFile,
        setIniContent,
      }}
    >
      {children}
    </IniFileContext.Provider>
  );
};

export const useIniFile = () => {
  const context = useContext(IniFileContext);
  if (!context) {
    throw new Error('useIniFile must be used within an IniFileProvider');
  }
  return context;
};
