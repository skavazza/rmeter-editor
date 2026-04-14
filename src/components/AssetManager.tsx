import React, { useState, useEffect } from 'react';
import { readDir } from '@tauri-apps/plugin-fs';
import { dirname, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useIniFile } from '@/context/IniFileContext';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { RefreshCw, Image as ImageIcon, Search } from 'lucide-react';
import { Input } from './ui/input';

interface Asset {
  name: string;
  path: string;
  url: string;
}

const AssetManager: React.FC = () => {
  const { currentIniFile } = useIniFile();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [_resourcesPath, setResourcesPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const scanAssets = async () => {
    if (!currentIniFile) return;

    setIsLoading(true);
    try {
      const dir = await dirname(currentIniFile);
      let currentDir = dir;
      let foundPath = null;
      
      for (let i = 0; i < 3; i++) {
        const testPath = await join(currentDir, '@Resources', 'Images');
        try {
          await readDir(testPath);
          foundPath = testPath;
          break;
        } catch (e) {
          currentDir = await dirname(currentDir);
        }
      }

      if (foundPath) {
        setResourcesPath(foundPath);
        const entries = await readDir(foundPath);
        const newAssets: Asset[] = [];
        
        for (const entry of entries) {
          if (entry.isFile && /\.(png|jpg|jpeg|bmp|ico|gif)$/i.test(entry.name)) {
            const fullPath = await join(foundPath, entry.name);
            newAssets.push({
              name: entry.name,
              path: fullPath,
              url: convertFileSrc(fullPath)
            });
          }
        }
        setAssets(newAssets);
      } else {
        setAssets([]);
      }
    } catch (err) {
      console.error('Error scanning assets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scanAssets();
  }, [currentIniFile]);

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyPath = (asset: Asset) => {
    // Relative path for Rainmeter: #@#Images\filename.png
    const rainmeterPath = `#@#Images\\${asset.name}`;
    navigator.clipboard.writeText(rainmeterPath);
    // Could also emit a signal to insert into editor
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-4 border-b border-sidebar-border gap-4 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/50">Assets (@Resources)</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={scanAssets} disabled={isLoading}>
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            className="pl-8 h-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-2 p-4">
          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset) => (
              <div 
                key={asset.path}
                className="group relative aspect-square bg-black/20 rounded-md overflow-hidden border border-transparent hover:border-primary cursor-pointer"
                onClick={() => handleCopyPath(asset)}
                title={asset.name}
              >
                <img 
                  src={asset.url} 
                  alt={asset.name}
                  className="w-full h-full object-contain p-2"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[10px] text-white font-medium text-center px-1 break-all">
                    Copy Path
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center py-12 text-sidebar-foreground/30 gap-2">
              <ImageIcon className="h-8 w-8 opacity-20" />
              <span className="text-xs">No images found</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AssetManager;
