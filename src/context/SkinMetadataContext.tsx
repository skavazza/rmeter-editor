import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SkinMetadata {
  name: string;
  author: string;
  version: string;
  description: string;
  allowScrollResize: boolean;
  rawMetadata?: Record<string, string>;
  rawRainmeter?: Record<string, string>;
  rawVariables?: Record<string, string>;
}

interface SkinMetadataContextType {
  metadata: SkinMetadata;
  setMetadata: (metadata: SkinMetadata) => void;
  updateMetadata: (updates: Partial<SkinMetadata>) => void;
}

const defaultMetadata: SkinMetadata = {
  name: 'MySkin',
  author: 'MyName',
  version: '1.0',
  description: 'My skin description',
  allowScrollResize: false,
  rawMetadata: {},
  rawRainmeter: {},
  rawVariables: {},
};

const SkinMetadataContext = createContext<SkinMetadataContextType | undefined>(undefined);

export const SkinMetadataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [metadata, setMetadata] = useState<SkinMetadata>(defaultMetadata);

  const updateMetadata = (updates: Partial<SkinMetadata>) => {
    setMetadata(prev => ({ ...prev, ...updates }));
  };

  return (
    <SkinMetadataContext.Provider value={{ metadata, setMetadata, updateMetadata }}>
      {children}
    </SkinMetadataContext.Provider>
  );
};

export const useSkinMetadata = () => {
  const context = useContext(SkinMetadataContext);
  if (!context) {
    throw new Error('useSkinMetadata must be used within a SkinMetadataProvider');
  }
  return context;
};
