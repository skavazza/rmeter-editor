"use client"

// import * as React from "react"
import { useEffect, useState } from "react"
import {
  Import,
  Save,
  FolderOpen,
  FileCode,
} from "lucide-react"
import UndoRedoManager from "@/services/UndoRedoManager";
import { DeleteLayerCommand, ReorderLayersCommand } from "@/services/commands";
import { open } from '@tauri-apps/plugin-dialog';
import { readFile, readDir } from '@tauri-apps/plugin-fs';
import { autoDecodeContent } from '@/services/encoding-utils';
import { useToast } from "@/hooks/use-toast";
import { useIniFile } from '@/context/IniFileContext';
import { projectService } from "@/services/ProjectService";
import { useSkinMetadata } from "@/context/SkinMetadataContext";


// import { NavFavorites } from "@/components/nav-favorites"
// import { NavMain } from "@/components/nav-main"
// import { NavSecondary } from "@/components/nav-secondary"
// import { NavWorkspaces } from "@/components/nav-workspaces"
// import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { layerManager } from "@/services/LayerManager";
import { Button } from "./ui/button";
import { useLayerContext } from "@/context/LayerContext";
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Type, Image, Gauge, Minus, Trash, Layers, FolderSearch, Library, Circle, PenTool } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import AssetManager from "./AssetManager";
import SnippetManager from "./SnippetManager";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { version } from "../../package.json"

interface Layer {
    id: string;
    name: string;
    type: string;
  }
  
  interface SortableItemProps {
    layer: Layer;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
  }
  
  const SortableItem: React.FC<SortableItemProps> = ({ layer, isSelected, onSelect, onDelete }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: layer.id });
  
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
  
    const handleClick = () => {
      layerManager.selectLayer(layer.id);
      onSelect(layer.id);
    };
  
    const handleDelete = () => {
      const command = new DeleteLayerCommand(layer.id);
      UndoRedoManager.getInstance().execute(command);
      onDelete(layer.id);
    };
  
    return (
        <div ref={setNodeRef} style={style} className="flex items-center group mb-1">
          <SidebarMenuButton
            {...attributes} {...listeners}
            className={`flex-grow justify-start h-10 transition-all duration-200 ${isSelected ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]' : 'hover:bg-white/5'}`}
            variant={isSelected ? 'outline' : 'default'}
            onClick={handleClick}
          >
            <div className={`p-1.5 rounded-md mr-2 flex items-center justify-center ${isSelected ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-white/5 text-muted-foreground'}`}>
                {layer.type === 'text' && <Type className="h-4 w-4" />}
                {layer.type === 'image' && <Image className="h-4 w-4" />}
                {layer.type === 'shape' && <PenTool className="h-4 w-4" />}
                {layer.type === 'rotator' && <Gauge className="h-4 w-4" />}
                {layer.type === 'bar' && <Minus className="h-4 w-4" />}
                {layer.type === 'roundline' && <Circle className="h-4 w-4" />}
            </div>
            <span className={`text-xs font-medium truncate ${isSelected ? 'text-primary-foreground font-semibold' : 'text-foreground/70'}`}>
                {layer.name.replace(/(\D)(\d)/, '$1 $2')}
            </span>
          </SidebarMenuButton>
          <Button
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/50 hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      );
  };

const SidebarLeft: React.FC = () => {

    const [layers, setLayers] = useState<Layer[]>(layerManager.getLayers());
  const { selectedLayer, setSelectedLayer } = useLayerContext();
  const { toast } = useToast();
  const { setCurrentIniFile, setIniContent, iniContent } = useIniFile();
  const { metadata, setMetadata } = useSkinMetadata();
  const isTauriApp = !!(typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__);

  const handleSaveProject = async () => {
      try {
          const success = await projectService.save(metadata, iniContent);
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
  };

  const handleOpenProject = async () => {
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
      } catch (error) {
          console.error('Error loading project:', error);
          toast({
              title: "❌ Error loading",
              description: "Failed to load the project file.",
              variant: "destructive",
          });
      }
  };

  const setSelectedLayerId = (id: string) => {
    const layer = layerManager.getLayers().find(layer => layer.id === id);
    if (!layer) return;
    setSelectedLayer(layer);
  };

  const selectedLayerId = selectedLayer?.id;

  // Function to open .ini file
  const handleOpenIniFile = async () => {
    try {
      // Check if running in Tauri
      if (typeof window === 'undefined' || !(window as any).__TAURI__) {
        toast({
          title: "⚠️ Feature unavailable",
          description: "This function is only available in the Tauri desktop application. Run 'npm run tauri dev'.",
          variant: "destructive",
        });
        return;
      }

      const selected = await open({
        title: 'Open .ini file',
        filters: [
          {
            name: 'Rainmeter INI',
            extensions: ['ini'],
          },
        ],
        multiple: false,
      });

      if (selected) {
        const filePath = Array.isArray(selected) ? selected[0] : selected;

        if (filePath) {
          console.log('Trying to open file:', filePath);

          try {
            // Try auto-detect encoding
            const bytes = await readFile(filePath as string);
            const decoded = autoDecodeContent(bytes);

            if (!decoded) {
              toast({
                title: "❌ Encoding error",
                description: "Could not decode the file.",
                variant: "destructive",
              });
              return;
            }

            console.log(`File decoded with: ${decoded.encoding}`);
            setCurrentIniFile(filePath as string);
            setIniContent(decoded.content);

            // Try to load into canvas, but don't fail if it errors
            try {
              const pathSeparator = filePath.lastIndexOf('\\') !== -1 ? '\\' : '/';
              const dirPath = filePath.substring(0, filePath.lastIndexOf(pathSeparator));
              await layerManager.loadFromIni(decoded.content, dirPath);
            } catch (e) {
              console.warn('Canvas load failed (file still opened):', e);
            }

            const fileName = filePath.split(/[\\/]/).pop();

            toast({
              title: "✅ File opened",
              description: `File ${fileName} loaded successfully.`,
            });
          } catch (innerError) {
            console.error('Error processing file:', innerError);
            toast({
              title: "❌ Error processing",
              description: "Error reading file content.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error('Error opening file:', error);
      toast({
        title: "❌ Error opening file",
        description: error instanceof Error ? error.message : "Unknown error. Check console for details.",
        variant: "destructive",
      });
    }
  };

  // Function to open skin folder
  const handleOpenSkinFolder = async () => {
    try {
      // Check if running in Tauri
      if (typeof window === 'undefined' || !(window as any).__TAURI__) {
        toast({
          title: "⚠️ Feature unavailable",
          description: "This function is only available in the Tauri desktop application. Run 'npm run tauri dev'.",
          variant: "destructive",
        });
        return;
      }

      const selected = await open({
        title: 'Open skin folder',
        directory: true,
        multiple: false,
      });

      if (selected) {
        const folderPath = Array.isArray(selected) ? selected[0] : selected;
        
        if (folderPath) {
          console.log('Trying to open folder:', folderPath);
          
          // Read directory content
          const entries = await readDir(folderPath as string);
          
          // Search for .ini file in folder
          const iniFile = entries.find((entry: any) => 
            entry.name && entry.name.toLowerCase().endsWith('.ini')
          );

          if (iniFile) {
            const iniPath = `${folderPath}/${iniFile.name}`;
            console.log('Opening .ini file:', iniPath);

            // Try auto-detect encoding
            const bytes = await readFile(iniPath);
            const decoded = autoDecodeContent(bytes);
            
            if (!decoded) {
              toast({
                title: "❌ Encoding error",
                description: "Could not decode the skin's .ini file.",
                variant: "destructive",
              });
              return;
            }

            console.log(`File decoded with: ${decoded.encoding}`);
            setCurrentIniFile(iniPath);
            setIniContent(decoded.content);
            
            toast({
              title: "✅ Skin opened",
              description: `File ${iniFile.name} loaded successfully.`,
            });
          } else {
            toast({
              title: "⚠️ .ini file not found",
              description: "No .ini file was found in this folder.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error('Error opening folder:', error);
      toast({
        title: "❌ Error opening folder",
        description: error instanceof Error ? error.message : "Unknown error. Check console for details.",
        variant: "destructive",
      });
    }
  };

  // Check if running in Tauri

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = layers.findIndex(layer => layer.id === active.id);
      const newIndex = layers.findIndex(layer => layer.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newLayerOrder = arrayMove(layers, oldIndex, newIndex);
        const oldOrder = layers.map(l => l.id);
        const newOrder = newLayerOrder.map(l => l.id);
        
        const command = new ReorderLayersCommand(oldOrder, newOrder);
        UndoRedoManager.getInstance().execute(command);
        
        setLayers(newLayerOrder);
      }
    }
  };

  useEffect(() => {
    const updateLayers = () => {
      setLayers(layerManager.getLayers().reverse());
    };

    layerManager.subscribeToLayerChanges(updateLayers);

    return () => {
      layerManager.unsubscribeFromLayerChanges(updateLayers);
    };
  }, []);

  // Update the selected layer state when the selectedLayerId changes
  useEffect(() => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) => ({
        ...layer,
        isSelected: layer.id === selectedLayerId,
      }))
    );
  }, [selectedLayerId]);

  const handleDeleteLayer = () => {
    setLayers(layerManager.getLayers().reverse());
  };
  return (
    <Sidebar>
        <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                {/* <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <img 
                    src={appLogo} 
                    alt="Rainmeter Editor Logo" 
                    className="w-full h-full object-contain"
                  />
                </div> */}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Rainmeter Editor</span>
                </div>
                <Badge variant="outline" className="ml-2">v{version}</Badge>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="mx-0"/>
        <SidebarMenu>
          <SidebarMenuItem>
                <SidebarMenuButton onClick={handleOpenIniFile} disabled={!isTauriApp}>
                    <span>
                        <FileCode style={{width: '18px'}}/>
                    </span>
                    <span className="text-xs font-semibold">Open .ini File {isTauriApp ? '' : '(Tauri only)'}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleOpenSkinFolder} disabled={!isTauriApp}>
                    <span>
                        <FolderOpen style={{width: '18px'}}/>
                    </span>
                    <span className="text-xs font-semibold">Open Skin Folder {isTauriApp ? '' : '(Tauri only)'}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSaveProject}>
                    <span>
                        <Save style={{width: '18px'}}/>
                    </span>
                    <span className="text-xs font-semibold">Save Project</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleOpenProject}>
                    <span>
                        <Import style={{width: '18px'}}/>
                    </span>
                    <span className="text-xs font-semibold">Open Project (.rmproj)</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <Tabs defaultValue="layers" className="w-full h-full flex flex-col">
          <TabsList className="w-full grid grid-cols-3 rounded-none bg-sidebar border-b border-sidebar-border h-10 shrink-0">
            <TabsTrigger value="layers" className="data-[state=active]:bg-sidebar-accent rounded-none border-r border-sidebar-border text-[10px] uppercase font-bold tracking-widest gap-1">
              <Layers className="h-3 w-3" />
              Layers
            </TabsTrigger>
            <TabsTrigger value="assets" className="data-[state=active]:bg-sidebar-accent rounded-none border-r border-sidebar-border text-[10px] uppercase font-bold tracking-widest gap-1">
              <FolderSearch className="h-3 w-3" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="snippets" className="data-[state=active]:bg-sidebar-accent rounded-none text-[10px] uppercase font-bold tracking-widest gap-1">
              <Library className="h-3 w-3" />
              Models
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="layers" className="mt-0 border-none outline-none flex-1 overflow-hidden">
            <SidebarGroup className="h-full overflow-hidden flex flex-col">
              <SidebarGroupLabel>Layers</SidebarGroupLabel>
              <ScrollArea className="flex-1">
                <SidebarMenu>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                  >
                    <SortableContext
                      items={layers.map(layer => layer.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {layers.map((layer) => (
                        <SidebarMenuItem key={layer.id} className="px-2">
                          <SortableItem
                            layer={layer}
                            isSelected={layer.id === selectedLayerId}
                            onSelect={setSelectedLayerId}
                            onDelete={handleDeleteLayer}
                          />
                        </SidebarMenuItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                </SidebarMenu>
              </ScrollArea>
            </SidebarGroup>
          </TabsContent>
          
          <TabsContent value="assets" className="mt-0 border-none outline-none flex-1 overflow-hidden text-nowrap">
            <AssetManager />
          </TabsContent>

          <TabsContent value="snippets" className="mt-0 border-none outline-none flex-1 overflow-hidden">
            <SnippetManager />
          </TabsContent>
        </Tabs>
      </SidebarContent>
        {/* <SidebarRail /> */}
        <SidebarSeparator className="mx-0" />
        <SidebarFooter>
          {/* Footer content can be added here in the future */}
        </SidebarFooter>
    </Sidebar>
  )
}

export default SidebarLeft;

// export function SidebarLeft({
//   ...props
// }: React.ComponentProps<typeof Sidebar>) {
//   return (
//     <Sidebar className="border-r-0" {...props}>
    //   <SidebarHeader>
    //     {/* <TeamSwitcher teams={data.teams} />
    //     <NavMain items={data.navMain} /> */}
    //   </SidebarHeader>
//       <SidebarContent>
//         {/* <NavFavorites favorites={data.favorites} />
//         <NavWorkspaces workspaces={data.workspaces} />
//         <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
//       </SidebarContent>
//       <SidebarRail />
//     </Sidebar>
//   )
// }
