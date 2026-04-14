import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';
import { layerManager, LayerConfig, LayerType } from './LayerManager';
import { SkinMetadata } from '@/context/SkinMetadataContext';
import { FabricObject, Group, util } from 'fabric';

export interface ProjectState {
  version: string;
  metadata: SkinMetadata;
  iniContent: string;
  layers: SerializedLayer[];
  canvasState: {
    width: number;
    height: number;
    backgroundColor: string;
  };
}

interface SerializedLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  measure: string;
  fontName: string;
  imageSrc: string;
  fabricObject: any; // Fabric object JSON
  properties: any[];
}

class ProjectService {
  private static instance: ProjectService;
  private currentProjectPath: string | null = null;

  private constructor() {}

  public static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  public getCurrentPath(): string | null {
    return this.currentProjectPath;
  }

  /**
   * Serializes the current application state into a ProjectState object.
   */
  public async serialize(metadata: SkinMetadata, iniContent: string): Promise<ProjectState> {
    const layers = layerManager.getLayers();
    const skinBackground = layerManager.getSkinBackground() as Group;
    const backgroundObjects = skinBackground?.getObjects ? skinBackground.getObjects() : (skinBackground as any)?._objects;
    const backgroundRect = backgroundObjects?.[0] as any;

    const serializedLayers: SerializedLayer[] = layers.map(layer => {
      return {
        id: layer.id,
        type: layer.type,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        measure: layer.measure,
        fontName: layer.fontName,
        imageSrc: layer.imageSrc,
        fabricObject: layer.fabricObject.toObject(['id', 'name']), // Include custom fields if any
        properties: layer.properties,
      };
    });

    return {
      version: "1.0",
      metadata,
      iniContent,
      layers: serializedLayers,
      canvasState: {
        width: backgroundRect?.width || 400,
        height: backgroundRect?.height || 300,
        backgroundColor: backgroundRect?.fill?.toString() || "#FFFFFF",
      }
    };
  }

  /**
   * Saves the project to a file.
   */
  public async save(metadata: SkinMetadata, iniContent: string, saveAs: boolean = false): Promise<boolean> {
    try {
      let path = this.currentProjectPath;

      if (saveAs || !path) {
        path = await save({
          title: 'Save Rainmeter Project',
          filters: [{ name: 'Rainmeter Project', extensions: ['rmproj'] }],
          defaultPath: `${metadata.name || 'project'}.rmproj`
        });
      }

      if (!path) return false;

      const state = await this.serialize(metadata, iniContent);
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(state, null, 2));

      await writeFile(path, data);
      this.currentProjectPath = path;
      return true;
    } catch (error) {
      console.error('Failed to save project:', error);
      return false;
    }
  }

  /**
   * Loads a project from a file.
   */
  public async load(): Promise<ProjectState | null> {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: 'Rainmeter Project', extensions: ['rmproj'] }]
      });

      if (!path || Array.isArray(path)) return null;

      const data = await readFile(path);
      const decoder = new TextDecoder();
      const state = JSON.parse(decoder.decode(data)) as ProjectState;

      this.currentProjectPath = path;
      return state;
    } catch (error) {
      console.error('Failed to load project:', error);
      return null;
    }
  }
}

export const projectService = ProjectService.getInstance();
