import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useIniFile } from '@/context/IniFileContext';
import { useToast } from '@/hooks/use-toast';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';
import { layerManager } from '@/services/LayerManager';
import { encodeContent, autoDecodeContent } from '@/services/encoding-utils';
import { projectService } from '@/services/ProjectService';
import { useSkinMetadata } from '@/context/SkinMetadataContext';
import { File, FilePlus, FileDown, FolderOpen, LogOut, Save, Box } from 'lucide-react';

interface FileMenuProps {
  onClearCanvas?: () => void;
}

const FileMenu: React.FC<FileMenuProps> = ({ onClearCanvas }) => {
  const { currentIniFile, iniContent, setCurrentIniFile, setIniContent } = useIniFile();
  const { metadata, setMetadata } = useSkinMetadata();
  const { toast } = useToast();

  const handleNew = () => {
    if (onClearCanvas) {
      onClearCanvas();
    }
    setCurrentIniFile(null);
    setIniContent('');
    toast({
      title: "New project",
      description: "A new blank project has been created.",
    });
  };

  const handleOpenProject = async () => {
      try {
          const state = await projectService.load();
          if (state) {
              if (onClearCanvas) onClearCanvas();
              
              // Load Metadata
              setMetadata(state.metadata);
              
              // Load INI Content
              setIniContent(state.iniContent);
              
              // Load Layers
              await layerManager.loadFromProject(state.layers);
              
              toast({
                  title: "✅ Project loaded",
                  description: `Project ${state.metadata.name} loaded successfully.`,
              });
          }
      } catch (error) {
          console.error('Error loading project:', error);
          toast({
              title: "❌ Error loading",
              description: "Failed to load the project file.",
              variant: "destructive",
          });
      }
  }

  const handleSaveProject = async (saveAs: boolean = false) => {
      try {
          const success = await projectService.save(metadata, iniContent, saveAs);
          if (success) {
              toast({
                  title: "✅ Project saved",
                  description: "Your project has been saved successfully.",
              });
          }
      } catch (error) {
          console.error('Error saving project:', error);
          toast({
              title: "❌ Error saving",
              description: "Failed to save the project.",
              variant: "destructive",
          });
      }
  }

  const handleOpen = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Rainmeter INI', extensions: ['ini'] }],
      });

      if (selected && !Array.isArray(selected)) {
        const filePath = selected;

        // Clear current state
        if (onClearCanvas) {
          onClearCanvas();
        }

        // Read and decode file
        const bytes = await readFile(filePath);
        const decoded = autoDecodeContent(bytes);

        if (!decoded) {
          toast({
            title: "❌ Encoding error",
            description: "Could not decode the file.",
            variant: "destructive",
          });
          return;
        }

        setCurrentIniFile(filePath);
        setIniContent(decoded.content);

        // Load into canvas (with error handling)
        try {
          const pathSeparator = filePath.lastIndexOf('\\') !== -1 ? '\\' : '/';
          const folderPath = filePath.substring(0, filePath.lastIndexOf(pathSeparator));
          const metadata = await layerManager.loadFromIni(decoded.content, folderPath);
          if (metadata) {
            setMetadata(metadata as any);
          }
        } catch (loadError) {
          console.warn('Error loading canvas (file still opened):', loadError);
        }

        toast({
          title: "✅ File opened",
          description: `File ${filePath.split(/[\\/]/).pop()} loaded successfully.`,
        });
      }
    } catch (error) {
      console.error('Error opening file:', error);
      toast({
        title: "❌ Error opening",
        description: "Failed to open the selected file.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!currentIniFile) {
      toast({
        title: "No file open",
        description: "Open or create a file before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = encodeContent(iniContent, 'utf-8');
      await writeFile(currentIniFile, data);
      toast({
        title: "✅ File saved",
        description: `File saved at: ${currentIniFile.split(/[\\/]/).pop()}`,
      });
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: "❌ Error saving",
        description: "Failed to save the file.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAs = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'Rainmeter INI', extensions: ['ini'] }],
      });

      if (filePath) {
        const data = encodeContent(iniContent, 'utf-8');
        await writeFile(filePath, data);
        setCurrentIniFile(filePath);
        toast({
          title: "✅ File saved",
          description: `File saved as: ${filePath.split(/[\\/]/).pop()}`,
        });
      }
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: "❌ Error saving",
        description: "Failed to save the file.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setCurrentIniFile(null);
    setIniContent('');
    toast({
      title: "Project closed",
      description: "The current project has been closed.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
          <File className="h-4 w-4" />
          <span className="text-xs">File</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={handleNew} className="gap-2">
          <FilePlus className="h-4 w-4" />
          <span>New Project</span>
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+N</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleOpenProject} className="gap-2">
          <Box className="h-4 w-4" />
          <span>Open Project (.rmproj)</span>
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+O</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleOpen} className="gap-2">
          <FolderOpen className="h-4 w-4" />
          <span>Open INI File...</span>
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+Shift+O</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleSaveProject(false)} className="gap-2">
          <Save className="h-4 w-4 text-blue-500" />
          <span className="font-semibold">Save Project</span>
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+S</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleSaveProject(true)} className="gap-2">
          <FileDown className="h-4 w-4 text-blue-400" />
          <span>Save Project As...</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSave} className="gap-2" disabled={!currentIniFile}>
          <Save className="h-4 w-4" />
          <span>Save INI File</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleSaveAs} className="gap-2">
          <FileDown className="h-4 w-4" />
          <span>Save INI File As...</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleClose} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span>Close Project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FileMenu;
