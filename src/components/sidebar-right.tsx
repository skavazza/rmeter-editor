import { useEffect, useState } from "react"

import { checkForAppUpdates } from "@/services/CheckForAppUpdates";
import { useToast } from "@/hooks/use-toast";
import { handleCreateDirectory } from "@/services/ExportToINI";
import { version as appVersion } from '../../package.json';
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";
import { Bug, Undo, Redo } from 'lucide-react';
import { FaDiscord, FaReddit } from "react-icons/fa";
import { useLayerContext } from "@/context/LayerContext";
import ExportModal from "./ExportModal";
import SkinProperties from "./PropertiesSidebar/SkinProperties";
import TextLayerProperties from "./PropertiesSidebar/TextProperties";
import ImageLayerProperties from "./PropertiesSidebar/ImageProperties";
import RotatorLayerProperties from "./PropertiesSidebar/RotatorProperties";
import BarLayerProperties from "./PropertiesSidebar/BarProperties";
import RoundlineLayerProperties from "./PropertiesSidebar/RoundlineProperties";
import ShapeLayerProperties from "./PropertiesSidebar/ShapeProperties";
import { ModeToggle } from "./mode-toggle";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { ScrollArea } from "./ui/scroll-area";
import { useSkinMetadata } from "@/context/SkinMetadataContext";


export function SidebarRight({
  className,
  ...props
}: React.ComponentProps<"div">) {
    const { selectedLayer } = useLayerContext();
    const selectedLayerId = selectedLayer?.id;
    const [version, setVersion] = useState('1.0.0');
  const v = appVersion;
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const { metadata } = useSkinMetadata();

  useEffect(() => {
    checkForAppUpdates(false);
    console.log(version);
    setVersion(v);
  }, []);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    const success = await handleCreateDirectory(metadata, metadata.allowScrollResize);

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
  
  return (
    <div
      className={`flex flex-col h-full w-full bg-transparent ${className || ''}`}
      {...props}
    >
      {/* Header */}
      <div className="flex flex-row justify-between border-b border-white/5 p-2 shrink-0 bg-white/[0.02] backdrop-blur-sm">
        <ModeToggle />
        <div className="flex gap-1 items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={!canUndo}
                className="h-8 w-8 hover:bg-white/5 disabled:opacity-30"
              >
                <Undo className={`h-4 w-4 ${canUndo ? 'text-primary' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={!canRedo}
                className="h-8 w-8 hover:bg-white/5 disabled:opacity-30"
              >
                <Redo className={`h-4 w-4 ${canRedo ? 'text-primary' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>
          
          <div className="w-[1px] h-4 bg-white/5 self-center mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="h-8 px-3 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)] transition-all duration-300" 
                variant="outline" 
                onClick={() => setIsExportModalOpen(true)}
              >
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export Skin</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {!selectedLayerId && (
          <SkinProperties />
        )}
        {selectedLayerId && (selectedLayer.type === 'text') && (
          <TextLayerProperties />
        )}
        {selectedLayerId && (selectedLayer.type === 'image') && (
          <ImageLayerProperties />
        )}
        {selectedLayerId && (selectedLayer.type === 'rotator') && (
          <RotatorLayerProperties />
        )}
        {selectedLayerId && (selectedLayer.type === 'bar') && (
          <BarLayerProperties />
        )}
        {selectedLayerId && (selectedLayer.type === 'roundline') && (
          <RoundlineLayerProperties />
        )}
        {selectedLayerId && (selectedLayer.type === 'shape') && (
          <ShapeLayerProperties />
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="flex flex-row justify-end border-t border-sidebar-border p-2 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => open("https://www.reddit.com/r/rainmetereditor/")}
              className="hover:text-primary"
            >
              <FaReddit />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Join our Subreddit</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => open("https://discord.gg/tzY82KkS4H")}
              className="hover:text-primary"
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
              onClick={() => open("https://github.com/kethakav/rainmeter-editor/issues")}
              className="hover:text-destructive"
            >
              <Bug />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Report a Bug</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <ExportModal
        onExport={handleExport}
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
      />
    </div>
  )
}
