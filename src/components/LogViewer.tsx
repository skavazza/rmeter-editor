import React, { useState, useEffect, useRef } from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Trash2, RefreshCw, FileSearch } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

const LogViewer: React.FC = () => {
  const [logContent, setLogContent] = useState<string>('');
  const [logPath, setLogPath] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLogPath = async () => {
      try {
        const home = await homeDir();
        const defaultPath = await join(home, 'AppData', 'Roaming', 'Rainmeter', 'Rainmeter.log');
        setLogPath(defaultPath);
      } catch (err) {
        console.error('Failed to get home dir:', err);
      }
    };
    initLogPath();
  }, []);

  const fetchLog = async () => {
    if (!logPath) return;
    try {
      const content = await readTextFile(logPath);
      setLogContent(content);
      setError(null);
    } catch (err) {
      setError(`Failed to read log file at: ${logPath}`);
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLog();
    const interval = setInterval(fetchLog, 2000);
    return () => clearInterval(interval);
  }, [logPath]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logContent, autoScroll]);

  const handleChooseFile = async () => {
    const selected = await open({
      title: 'Select Rainmeter.log',
      multiple: false,
      filters: [{ name: 'Log Files', extensions: ['log'] }]
    });
    if (selected && typeof selected === 'string') {
      setLogPath(selected);
    }
  };

  const handleClearConsole = () => {
    setLogContent('');
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-t border-sidebar-border">
      <div className="flex items-center justify-between p-2 border-b border-sidebar-border bg-sidebar-header">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/50">Rainmeter Log</span>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="auto-scroll" 
              checked={autoScroll} 
              onCheckedChange={(checked) => setAutoScroll(!!checked)} 
            />
            <label htmlFor="auto-scroll" className="text-xs font-medium cursor-pointer">Auto-scroll</label>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={fetchLog} title="Refresh Log">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleChooseFile} title="Choose Log File">
            <FileSearch className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClearConsole} title="Clear Console">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      
      <ScrollArea ref={scrollRef} className="flex-1 p-4 font-mono text-xs whitespace-pre-wrap">
        {error ? (
          <div className="text-destructive p-2 bg-destructive/10 rounded">
            {error}
            <p className="mt-2 text-foreground/70">
              Please ensure logging is enabled in Rainmeter settings or select the file manually.
            </p>
          </div>
        ) : (
          <div className="text-sidebar-foreground/80">
            {logContent || 'Waiting for log activity...'}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default LogViewer;
