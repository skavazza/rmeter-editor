import React, { useState, useEffect, useCallback } from 'react';
import { readFile, writeFile, readDir } from '@tauri-apps/plugin-fs';
import { dirname, join } from '@tauri-apps/api/path';
import CodeEditor from './CodeEditor';
import { Button } from './ui/button';
import { Save, AlertCircle, FileCode, FolderOpen, ChevronRight } from 'lucide-react';
import { useIniFile } from '@/context/IniFileContext';
import { useToast } from '@/hooks/use-toast';
import { autoDecodeContent } from '@/services/encoding-utils';
import { ScrollArea } from './ui/scroll-area';

interface IncFile {
  name: string;
  path: string;
  relativePath: string;
}

const VariablesEditor: React.FC = () => {
  const { currentIniFile } = useIniFile();
  const [incFiles, setIncFiles] = useState<IncFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<IncFile | null>(null);
  const [varContent, setVarContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resourcesPath, setResourcesPath] = useState<string | null>(null);
  const { toast } = useToast();

  const scanDirectory = useCallback(async (dirPath: string, baseDir: string): Promise<IncFile[]> => {
    let files: IncFile[] = [];
    try {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        const fullPath = await join(dirPath, entry.name);
        if (entry.isDirectory) {
          const subFiles = await scanDirectory(fullPath, baseDir);
          files = [...files, ...subFiles];
        } else if (entry.name.toLowerCase().endsWith('.inc')) {
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: fullPath.replace(baseDir, '').replace(/^[\\\/]/, ''),
          });
        }
      }
    } catch (e) {
      console.error(`Error scanning ${dirPath}:`, e);
    }
    return files;
  }, []);

  useEffect(() => {
    const discoverFiles = async () => {
      if (!currentIniFile) {
        setIncFiles([]);
        setSelectedFile(null);
        setResourcesPath(null);
        return;
      }

      setIsLoading(true);
      try {
        const dir = await dirname(currentIniFile);
        let currentDir = dir;
        let foundResources: string | null = null;

        // Climb up to 4 levels to find @Resources
        for (let i = 0; i < 4; i++) {
          const testPath = await join(currentDir, '@Resources');
          try {
            await readDir(testPath);
            foundResources = testPath;
            break;
          } catch (e) {
            const parent = await dirname(currentDir);
            if (parent === currentDir) break;
            currentDir = parent;
          }
        }

        if (foundResources) {
          setResourcesPath(foundResources);
          const discovered = await scanDirectory(foundResources, foundResources);
          const sorted = discovered.sort((a, b) => {
              // Variables.inc always first
              if (a.name.toLowerCase() === 'variables.inc') return -1;
              if (b.name.toLowerCase() === 'variables.inc') return 1;
              return a.name.localeCompare(b.name);
          });
          setIncFiles(sorted);
          
          if (sorted.length > 0) {
            handleSelectFile(sorted[0]);
          }
        } else {
          setIncFiles([]);
          setSelectedFile(null);
          setResourcesPath(null);
        }
      } catch (err) {
        console.error('Error discovering .inc files:', err);
      } finally {
        setIsLoading(false);
      }
    };

    discoverFiles();
  }, [currentIniFile, scanDirectory]);

  const handleSelectFile = async (file: IncFile) => {
    setSelectedFile(file);
    try {
      const bytes = await readFile(file.path);
      const decoded = autoDecodeContent(bytes);
      if (decoded) {
        setVarContent(decoded.content);
      }
    } catch (err) {
      console.error(`Error reading ${file.path}:`, err);
      toast({
        title: "❌ Error reading file",
        description: `Could not load ${file.name}`,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(varContent);
      await writeFile(selectedFile.path, data);
      toast({
        title: "✅ Saved",
        description: `${selectedFile.name} saved successfully.`,
      });
    } catch (err) {
      console.error('Error saving file:', err);
      toast({
        title: "❌ Error",
        description: "Failed to save the file.",
        variant: "destructive",
      });
    }
  };

  if (!currentIniFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-4">
        <AlertCircle className="h-12 w-12 opacity-20" />
        <p>Open a skin to edit its include files.</p>
      </div>
    );
  }

  if (!resourcesPath && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-4">
        <FolderOpen className="h-12 w-12 opacity-20 text-yellow-500" />
        <p>@Resources folder not found for this skin.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background/50 overflow-hidden relative">
      {/* Sidebar Selector */}
      <div className="w-64 border-r border-white/5 flex flex-col glass backdrop-blur-xl">
        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
            <FileCode className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/80">Include Files</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {incFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => handleSelectFile(file)}
                className={`w-full flex items-center p-2 rounded-lg text-left transition-all duration-200 group ${
                  selectedFile?.path === file.path 
                    ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)] border border-primary/20' 
                    : 'hover:bg-white/5 text-muted-foreground'
                }`}
              >
                <div className="truncate flex-1">
                    <p className={`text-xs font-medium ${selectedFile?.path === file.path ? 'text-primary-foreground' : ''}`}>
                        {file.name}
                    </p>
                    <p className="text-[10px] opacity-40 truncate">{file.relativePath}</p>
                </div>
                {selectedFile?.path === file.path && <ChevronRight className="h-3 w-3 ml-2" />}
              </button>
            ))}
            {incFiles.length === 0 && !isLoading && (
              <p className="text-center p-4 text-[10px] text-muted-foreground opacity-50">No .inc files found in @Resources</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-4 right-8 z-20">
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={!selectedFile}
            className="gap-2 shadow-xl bg-primary/80 hover:bg-primary transition-all active:scale-95"
          >
            <Save className="h-4 w-4" />
            Save {selectedFile?.name || '.inc'}
          </Button>
        </div>
        
        {selectedFile ? (
            <div className="flex-1">
                <CodeEditor
                    value={varContent}
                    onChange={setVarContent}
                    language="ini"
                    placeholder={`Editing ${selectedFile.name}...`}
                />
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-4">
                <FileCode className="h-16 w-16" />
                <p className="text-sm font-medium">Select an include file to start editing</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default VariablesEditor;
