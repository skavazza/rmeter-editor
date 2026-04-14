// src/components/Layout.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { LayoutDashboard, Code, Terminal, Zap, Settings2, GripVertical } from 'lucide-react'
import CanvasRenderer from './CanvasRenderer'
import Toolbar from './Toolbar'
import { Toaster } from './ui/toaster'
import { SidebarInset, SidebarProvider } from './ui/sidebar'
import SidebarLeft from './sidebar-left'
import { SidebarRight } from './sidebar-right'
import CodeEditor from './CodeEditor'
import LogViewer from './LogViewer'
import BangGenerator from './BangGenerator'
import VariablesEditor from './VariablesEditor'
import FileMenu from './FileMenu'
import { projectService } from '@/services/ProjectService'
import { useToast } from '@/hooks/use-toast'
import { Button } from './ui/button'
import { useIniFile } from '@/context/IniFileContext'
import { useLayerContext } from '@/context/LayerContext'
import { layerManager } from '@/services/LayerManager'
import { DEFAULT_INI_TEMPLATE } from '@/constants/templates'
import UndoRedoManager from '@/services/UndoRedoManager'
import { generateIniContent } from '@/services/ExportToINI'
import { useSkinMetadata } from '@/context/SkinMetadataContext'

const SIDEBAR_RIGHT_MIN_WIDTH = 250;
const SIDEBAR_RIGHT_MAX_WIDTH = 600;
const SIDEBAR_RIGHT_DEFAULT_WIDTH = 300;

const Layout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'canvas' | 'code' | 'variables'>('canvas');
  const prevTabRef = useRef<'canvas' | 'code' | 'variables'>(activeTab);
  const [showLog, setShowLog] = useState<boolean>(false);
  const [isBangGenOpen, setIsBangGenOpen] = useState<boolean>(false);
  const [sidebarRightWidth, setSidebarRightWidth] = useState<number>(
    () => parseInt(localStorage.getItem('sidebar-right-width') || String(SIDEBAR_RIGHT_DEFAULT_WIDTH))
  );
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const { currentIniFile, iniContent, setIniContent, setCurrentIniFile } = useIniFile();
  const { setSelectedLayer } = useLayerContext();
  const { metadata, setMetadata } = useSkinMetadata();
  const { toast } = useToast();

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl + S: Save Project
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        try {
          const success = await projectService.save(metadata, iniContent);
          if (success) {
            toast({
              title: "✅ Project saved",
              description: "Your project has been saved successfully.",
            });
          }
        } catch (err) {
          console.error('Save shortcut error:', err);
        }
      }

      // Ctrl + O: Open Project
      if (e.ctrlKey && e.key === 'o' && !e.shiftKey) {
          e.preventDefault();
          try {
              const state = await projectService.load();
              if (state) {
                  setSelectedLayer(null);
                  setMetadata(state.metadata);
                  setIniContent(state.iniContent);
                  await layerManager.loadFromProject(state.layers);
                  toast({
                      title: "✅ Project loaded",
                      description: `Project ${state.metadata.name} loaded successfully.`,
                  });
              }
          } catch (err) {
              console.error('Open shortcut error:', err);
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [metadata, iniContent, setMetadata, setIniContent, setSelectedLayer, toast]);

  // Refs for resize handling
  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthRef = useRef<number>(0);

  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = sidebarRightWidth;
  }, [sidebarRightWidth]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const deltaX = resizeStartXRef.current - e.clientX;
    const newWidth = Math.min(
      SIDEBAR_RIGHT_MAX_WIDTH,
      Math.max(SIDEBAR_RIGHT_MIN_WIDTH, resizeStartWidthRef.current + deltaX)
    );
    setSidebarRightWidth(newWidth);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  useEffect(() => {
    localStorage.setItem('sidebar-right-width', String(sidebarRightWidth));
  }, [sidebarRightWidth]);

  // Code-to-Canvas Sync when switching tabs
  useEffect(() => {
    if (activeTab === 'canvas' && (prevTabRef.current === 'code' || prevTabRef.current === 'variables')) {
      const syncToCanvas = async () => {
        try {
          let folderPath = '';
          if (currentIniFile) {
            const pathSeparator = currentIniFile.lastIndexOf('\\') !== -1 ? '\\' : '/';
            folderPath = currentIniFile.substring(0, currentIniFile.lastIndexOf(pathSeparator));
          }
          
          const newMetadata = await layerManager.loadFromIni(iniContent, folderPath);
          if (newMetadata) {
            setMetadata(newMetadata as any);
          }
          
          toast({
            title: "🔄 Layout updated",
            description: "Canvas synchronized with code changes.",
          });
        } catch (error) {
          console.error("Failed to sync code to canvas:", error);
          toast({
            title: "❌ Sync failed",
            description: "Could not parse the code. Check for errors in the editor.",
            variant: "destructive",
          });
        }
      };
      syncToCanvas();
    }
    prevTabRef.current = activeTab;
  }, [activeTab, iniContent, currentIniFile, setMetadata, toast]);

  // Auto-sync code editor when canvas changes
  useEffect(() => {
    const syncCode = async () => {
      // Re-generate INI whenever a change is made in the canvas
      const newIni = await generateIniContent(metadata, metadata.allowScrollResize);
      setIniContent(newIni);
    };

    // Initial sync
    syncCode();

    // Subscribe to undo/redo changes which cover most canvas operations
    UndoRedoManager.getInstance().subscribe('stack-change', syncCode);
    
    return () => {
      UndoRedoManager.getInstance().unsubscribe(syncCode);
    };
  }, [metadata, setIniContent, activeTab]);

  const handleClearCanvas = useCallback(() => {
    try {
      layerManager.clearLayers();
      setSelectedLayer(null);
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  }, [setSelectedLayer]);

  const handleCodeChange = (value: string) => {
    setIniContent(value);
  };

  const handleInsertBang = (bang: string) => {
    setIniContent(iniContent + (iniContent.endsWith('\n') ? '' : '\n') + bang);
  };

  return (
    <SidebarProvider>
      <SidebarLeft className="glass border-r border-white/5" />
      <SidebarInset className="flex flex-col h-screen overflow-hidden relative bg-background/50">
        {/* Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        
        {/* Tab Switcher */}
        <div className="flex border-b border-white/5 bg-sidebar/30 backdrop-blur-md p-2 gap-1 items-center justify-between z-20">
          <div className="flex gap-1 items-center">
            <FileMenu onClearCanvas={handleClearCanvas} />
            
            <div className="h-6 w-[1px] bg-white/5 mx-1" />
            
            <Button
              variant={activeTab === 'canvas' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('canvas')}
              className={`gap-2 transition-all duration-300 ${activeTab === 'canvas' ? 'shadow-[0_0_15px_rgba(var(--primary),0.3)]' : ''}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="font-medium">Canvas Visual</span>
            </Button>
            <Button
              variant={activeTab === 'code' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('code')}
              className={`gap-2 transition-all duration-300 ${activeTab === 'code' ? 'shadow-[0_0_15px_rgba(var(--primary),0.3)]' : ''}`}
            >
              <Code className="h-4 w-4" />
              <span className="font-medium">Code Editor {currentIniFile && `- ${currentIniFile.split(/[\\/]/).pop()}`}</span>
            </Button>
            <Button
              variant={activeTab === 'variables' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('variables')}
              className={`gap-2 transition-all duration-300 ${activeTab === 'variables' ? 'shadow-[0_0_15px_rgba(var(--primary),0.3)]' : ''}`}
            >
              <Settings2 className="h-4 w-4" />
              <span className="font-medium">Variables</span>
            </Button>

            <div className="h-4 w-[1px] bg-white/5 mx-2" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBangGenOpen(true)}
              className="gap-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
            >
              <Zap className="h-4 w-4 fill-current" />
              Bangs
            </Button>
          </div>

          <Button
            variant={showLog ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowLog(!showLog)}
            className="gap-2"
          >
            <Terminal className="h-4 w-4" />
            Log
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden flex flex-col z-10">
          <div className="flex-1 relative overflow-hidden bg-white/[0.02]">
            {/* Canvas - always mounted but hidden when not active */}
            <div className={activeTab === 'canvas' ? 'absolute inset-0 z-10' : 'absolute inset-0 z-0 pointer-events-none invisible'}>
              <CanvasRenderer />
              {activeTab === 'canvas' && <Toolbar />}
            </div>

            {/* Code Editor */}
            {activeTab === 'code' && (
              <div className="absolute inset-0 z-10">
                <CodeEditor
                  value={iniContent || DEFAULT_INI_TEMPLATE}
                  onChange={handleCodeChange}
                  language="ini"
                  placeholder="Load an .ini file to edit..."
                />
              </div>
            )}

            {/* Variables Editor */}
            {activeTab === 'variables' && (
              <div className="absolute inset-0 z-10">
                <VariablesEditor />
              </div>
            )}
          </div>

          {showLog && (
            <div className="h-1/3 min-h-[200px] glass-card m-2 rounded-xl overflow-hidden">
              <LogViewer />
            </div>
          )}
        </div>
      </SidebarInset>

      {/* Resize Handle */}
      <div
        className={`relative w-1 cursor-col-resize bg-white/5 hover:bg-primary/50 transition-all duration-300 shrink-0 ${isResizing ? 'bg-primary/50' : ''}`}
        onMouseDown={handleResizeStart}
      >
        <div className="absolute inset-y-0 -left-1 right-0 flex items-center justify-center">
          <GripVertical className={`h-4 w-4 ${isResizing ? 'text-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'text-muted-foreground/30'}`} />
        </div>
      </div>

      <div style={{ width: `${sidebarRightWidth}px` }} className="shrink-0 glass border-l border-white/5">
        <SidebarRight />
      </div>

      <Toaster />
      <BangGenerator
        open={isBangGenOpen}
        onOpenChange={setIsBangGenOpen}
        onInsert={handleInsertBang}
      />
    </SidebarProvider>
  )
}

export default Layout
