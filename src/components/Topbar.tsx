import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { handleCreateDirectory } from '@/services/ExportToINI';
import { useToast } from "@/hooks/use-toast"
import ExportModal from './ExportModal'
import { checkForAppUpdates } from '@/services/CheckForAppUpdates';
import { version as appVersion } from '../../package.json';
import { Badge } from './ui/badge';
import { RainmeterService } from '@/services/RainmeterService';
import { FaBug, FaDiscord, FaSync } from 'react-icons/fa';
import { useIniFile } from '@/context/IniFileContext';
import { open as openUrl } from '@tauri-apps/plugin-shell';

const Topbar: React.FC = () => {
  const [version, setVersion] = useState('1.0.0');
  const v = appVersion;
  const { currentIniFile } = useIniFile();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkForAppUpdates(false);
    setVersion(v);
  }, [v]);

  const handleExport = async (metadata: { name: string; author: string; version: string; description: string},  allowScrollResize: boolean ) => {
    const success = await handleCreateDirectory(metadata, allowScrollResize);

    if (success) {
        toast({
            title: "Export Successful",
            description: "Your Rainmeter skin has been exported successfully.",
        });
    } else {
        toast({
            title: "Export Failed",
            description: "There was an error exporting your Rainmeter skin. Please try again. Most likely the skin already exists.",
            variant: "destructive",
        });
    }

    return success;
  };

  const handleRefresh = async () => {
    let skinName = undefined;
    if (currentIniFile) {
      // Extract skin name from path: .../Skins/Suite/Skin/Skin.ini -> Suite/Skin
      const parts = currentIniFile.split(/[\\/]/);
      const skinsIndex = parts.findIndex(p => p.toLowerCase() === 'skins');
      if (skinsIndex !== -1 && skinsIndex < parts.length - 2) {
        skinName = parts.slice(skinsIndex + 1, -1).join('\\');
      }
    }
    
    const success = await RainmeterService.refreshSkin(skinName);
    if (success) {
      toast({
        title: "✅ Skin Updated",
        description: skinName ? `!Refresh "${skinName}" sent.` : "!RefreshApp sent.",
      });
    } else {
      toast({
        title: "❌ Error updating",
        description: "Make sure Rainmeter is open.",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="h-16 z-2 bg-secondary border-gray-200 flex items-center justify-between px-6">
        <div className="text-xl text-secondary-foreground font-semibold">
          Rainmeter Editor <Badge variant="outline">v{version}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline"
                onClick={handleRefresh}
                className="hover:text-primary h-9 w-9 p-0"
              >
                <FaSync />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh Skin</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline"
                onClick={() => openUrl("https://discord.gg/tzY82KkS4H")} 
                className="hover:text-primary h-9 w-9 p-0"
              >
                <FaDiscord />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Join our Discord</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline"
                onClick={() => openUrl("https://github.com/kethakav/rainmeter-editor/issues")} 
                className="hover:text-destructive h-9 w-9 p-0"
              >
                <FaBug />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Report a Bug</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="default" onClick={() => setIsExportModalOpen(true)}>
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export Skin</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <ExportModal 
        onExport={handleExport} 
        open={isExportModalOpen} 
        onOpenChange={setIsExportModalOpen}
      />
    </TooltipProvider>
  )
}

export default Topbar;
