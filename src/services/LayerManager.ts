//LayerManager.ts
// import { useToolContext } from '@/context/ToolContext';
import { arrayMove } from '@dnd-kit/sortable';
import { join, resourceDir } from '@tauri-apps/api/path';
import { Canvas, Circle, Ellipse, FabricObject, FabricObjectProps, Rect, Triangle, IText, FabricImage, Group, Line, Text} from 'fabric';
import { Canvas, Circle, Ellipse, FabricObject, FabricObjectProps, Rect, Triangle, IText, FabricImage, Group, Line, Text, util } from 'fabric';
import { convertFileSrc } from '@tauri-apps/api/core';
import { SingleFontLoad } from './singleFontLoad';
import UndoRedoManager from './UndoRedoManager';
import { AddLayerCommand } from './commands';

import { IniParser } from '../lib/IniParser';
import { RainmeterUtils } from '../lib/RainmeterUtils';
import { fromRainmeterColor } from '../lib/colorUtils';

// Enum for layer types
export enum LayerType {
  TEXT = 'text',
  SHAPE = 'shape',
  IMAGE = 'image',
  ROTATOR = 'rotator',
  BAR = 'bar',
  ROUNDLINE = 'roundline',
}

interface LayerProperties {
  property: string;
  value: string;
}

// Interface for layer properties
export interface LayerConfig {
  id: string;
  // mmtype: string;
  type: LayerType;
  fabricObject: FabricObject;
  visible: boolean;
  locked: boolean;
  name: string;
  measure: string;
  fontName: string;
  imageSrc: string;
  UIElements: FabricObject;
  properties: LayerProperties[];
}

class LayerManager {
    private static instance: LayerManager | null = null;
    public canvas: Canvas | null = null;
    private skinBackground: FabricObject | null = null;
    private sessionImages: string[] = [];

    public activeTool: string = 'select';
  
    public layers: LayerConfig[] = [];

    private listeners: (() => void)[] = [];
    

    private layerCounts: { [key in LayerType]: number } = {
      [LayerType.TEXT]: 0,
      [LayerType.SHAPE]: 0,
      [LayerType.IMAGE]: 0,
      [LayerType.ROTATOR]: 0,
      [LayerType.BAR]: 0,
      [LayerType.ROUNDLINE]: 0,
    };
  
    private constructor() {} // Make the constructor private

    public clearLayers() {
      try {
        if (this.canvas) {
          this.layers.forEach(layer => {
            try {
              this.canvas?.remove(layer.fabricObject);
              if (layer.UIElements) {
                this.canvas?.remove(layer.UIElements);
              }
            } catch (removeError) {
              console.warn('Error removing layer:', removeError);
            }
          });
        }
      } catch (clearError) {
        console.error('Error in clearLayers:', clearError);
      }
      
      this.layers = [];
      this.layerCounts = {
        [LayerType.TEXT]: 0,
        [LayerType.SHAPE]: 0,
        [LayerType.IMAGE]: 0,
        [LayerType.ROTATOR]: 0,
        [LayerType.BAR]: 0,
        [LayerType.ROUNDLINE]: 0,
      };
      this.notifyListeners();
    }

    
  
    public async loadFromProject(layersData: any[]) {
      this.clearLayers();
      
      const fabricObjects = await util.enlivenObjects(layersData.map(l => l.fabricObject));
      
      for (let i = 0; i < layersData.length; i++) {
        const data = layersData[i];
        const fabricObj = fabricObjects[i] as FabricObject;
        
        // Re-generate UIElements (they are editor-only overlays)
        let uiElements = new Group();
        if (data.type === LayerType.ROTATOR) {
            // Re-create rotator UI specific elements if needed
            // For now, we'll use an empty group or recreate basic ones
        }

        const newLayer: LayerConfig = {
          id: data.id,
          type: data.type,
          fabricObject: fabricObj,
          visible: data.visible,
          locked: data.locked,
          name: data.name,
          measure: data.measure,
          fontName: data.fontName,
          imageSrc: data.imageSrc,
          UIElements: uiElements,
          properties: data.properties,
        };

        if (this.canvas) {
          this.canvas.add(fabricObj);
          this.canvas.add(uiElements);
        }
        this.layers.push(newLayer);
      }
      
      this.notifyListeners();
      this.canvas?.renderAll();
    }

    public static getInstance(): LayerManager {
      if (!LayerManager.instance) {
        LayerManager.instance = new LayerManager();
      }
      return LayerManager.instance;
    }
  
    public setCanvas(canvas: Canvas) {
      this.canvas = canvas;
    }

    public getCanvas() {
        return this.canvas;
    }

    public setSkinBackground() {
      if (this.canvas) {
        const skinBackground = new Rect({
          width: 400,
          height: 300,
          stroke: '#838383',
          fill: '#ffffff',
          strokeWidth: 1,
          originX: 'center',
          originY: 'center',
          strokeDashArray: [5, 5],
          hasControls: false,
          hasBorders: false,
        });

        const backgroundText = new Text('Skin Background', {
          lockScalingX: true,
          lockScalingY: true,
          fontSize: 18,
          fontFamily: 'Arial',
          fill: '#838383',
          opacity: 1,
          originX: 'center',
          originY: 'center',
          hasControls: false,
          hasBorders: false,
        });

        const backgroundGroup = new Group([skinBackground, backgroundText], {
          left: 400,
          top: 200,        
          originX: 'left',
          originY: 'top',
          hasControls: false,
          hasBorders: false,
        });
        backgroundGroup.setCoords();
        // background group clipping so that it doesn't clip object when the objects are scaled
        
        backgroundGroup.set({
          visible: true,
        });
        this.skinBackground = backgroundGroup;

        this.canvas.sendObjectToBack(backgroundGroup);
        this.canvas.add(backgroundGroup);
        this.canvas.renderAll();
      }
    }

    public getSkinBackground() {
      return this.skinBackground;
    }

    private toolChangeListeners: (() => void)[] = [];

  setActiveTool(tool: string) {
    this.activeTool = tool;
    // Notify tool change listeners
    this.toolChangeListeners.forEach(listener => listener());
  }

  // Add methods to subscribe and unsubscribe to tool changes
  subscribeToToolChanges(listener: () => void) {
    this.toolChangeListeners.push(listener);
  }

  unsubscribeFromToolChanges(listener: () => void) {
    this.toolChangeListeners = this.toolChangeListeners.filter(l => l !== listener);
  }

  async addLayerWithMouse(x: number, y: number) {
    if(this.canvas) {
      const defaultName = this.generateLayerName(this.activeTool as LayerType);
      const name = window.prompt(`Enter name for the new ${this.activeTool} layer:`, defaultName);
      
      if (name === null) return; // User cancelled
      const finalName = name.trim() || defaultName;

      if (this.activeTool === 'text') {
        await this.addTextLayer("Hello There!", x, y, finalName);
        this.setActiveTool('select');
      }
      if (this.activeTool === 'image') {
        await this.addImageLayer(x, y, finalName);
        this.setActiveTool('select');
      }
      if (this.activeTool === 'rotator') {
        await this.addRotatorLayer(x, y, finalName);
        this.setActiveTool('select');
      }
      if (this.activeTool === 'bar') {
        await this.addBarLayer(x, y, finalName);
        this.setActiveTool('select');
      }
      if (this.activeTool === 'shape') {
        await this.addShapeLayer(x, y, finalName);
        this.setActiveTool('select');
      }
      if (this.activeTool === 'roundline') {
        await this.addRoundlineLayer(x, y, finalName);
        this.setActiveTool('select');
      }
    }
  }

  // Add a new layer to the stack
  addLayer(type: LayerType, fabricObject: FabricObject, imageSrc: string = "", UIElements: FabricObject = new Group(), properties: LayerProperties[] = [], skipUndoRegister: boolean = false, providedName?: string) {
    if (this.canvas) {
      const newLayer: LayerConfig = {
        id: this.generateUniqueId(),
        type,
        fabricObject,
        visible: true,
        locked: false,
        name: providedName || this.generateLayerName(type),
        measure: "",
        fontName: "null",
        imageSrc: imageSrc,
        UIElements: UIElements,
        properties: properties,
      };

      // Set measure
      if (type === LayerType.TEXT) {
        newLayer.measure = "custom-text";
      }
      if (type === LayerType.ROTATOR) {
        newLayer.measure = "rotator-time-second";
      }

      // Add to canvas and layers array
      this.canvas.add(fabricObject);
      this.canvas.add(UIElements);
      this.layers.push(newLayer);
      this.notifyListeners();

      // Register with Undo/Redo system (only if not skipping)
      if (!skipUndoRegister) {
        const command = new AddLayerCommand(type, newLayer.id);
        UndoRedoManager.getInstance().execute(command);
      }

      // Select the newly added layer
      this.selectLayer(newLayer.id);

    //   return newLayer;
    }
    // return null; // Return null if canvas is not set
  }

  // Add text layer
  async addTextLayer(text: string = 'Hello There!', x: number, y: number, name?: string) {
    await SingleFontLoad('Abtera Bold');
    
    if (this.canvas) {
        const textObject = new IText(text, {
        left: x,
        top: y,
        fill: 'black',
        fontFamily: 'Abtera Bold',
        textAlign: 'justify-left',
        fontSize: 24,
        hasControls: false,
        });

        this.addLayer(LayerType.TEXT, textObject, "", new Group(), [], false, name);
    } else {
        return null;
    }
  }

  public updateFontForSelectedLayer(font: string) {
    if (this.canvas) {
      console.log("update font");
      const activeObject = this.canvas.getActiveObject();
      if (activeObject) {
        const activeLayer = this.getLayerByFabricObject(activeObject);
        if (activeLayer) {
          activeLayer.fontName = font; // Update the font
        }
        activeObject.set('fontFamily', font); // Update the font
        this.canvas.renderAll(); // Re-render the canvas to reflect changes
      }
    }
  }

  public async updateImageForSelectedLayer(imageSource: string) {
    // const { setSelectedLayerId, setSelectedLayer } = useLayerContext();
    const sourcePath = await join(imageSource as string);
    const assetUrl = convertFileSrc(sourcePath);

    if (this.canvas) {
      console.log("update image");
      const activeObject = this.canvas.getActiveObject();
      if (activeObject) {
        const activeLayer = this.getLayerByFabricObject(activeObject);
        // Update the image source
        const fabricImage = activeObject as FabricImage;
        await fabricImage.setSrc(assetUrl);
        if (activeLayer) {
          activeLayer.imageSrc = imageSource; // Update the image source
          const offsetX = activeLayer.properties.find(prop => prop.property === 'offsetX');
          const offsetY = activeLayer.properties.find(prop => prop.property === 'offsetY');
          if (offsetX) {
            offsetX.value = '0';
          }
          if (offsetY) {
            offsetY.value = '0';
          }
          // setSelectedLayerId(activeLayer.id);
          // setSelectedLayer(activeLayer);
        }
        // update properties Sidebar
        // this.updatePropertiesSidebar(activeLayer);

        
        // offsetX: layer.properties.find(prop => prop.property === 'offsetX')?.value.toString() || '0',

        activeLayer?.UIElements.set({
          visible: true,
          left: activeLayer.fabricObject.left,
          top: activeLayer.fabricObject.top
        });
        activeLayer?.fabricObject.setCoords();
        this.canvas.renderAll(); // Re-render the canvas to reflect changes
        
      }
    }
  }

  public getLayerByFabricObject(fabricObject: FabricObject) {
    return this.layers.find(layer => layer.fabricObject === fabricObject);
  }

  public updateMeasureForSelectedLayer(measure: string) {

    if (this.canvas) {
      console.log("update measure", measure);
      const activeObject = this.canvas.getActiveObject();
      if (activeObject) {
        const actLayer = this.getLayerByFabricObject(activeObject);
        if (actLayer) {
          actLayer.measure = measure; // Update the measure in the layerConfig
          // Time ========================================================================
          if (measure === "time-hour-minute-24") {
            activeObject.set('text', "15:15");
          }
          if (measure === "time-hour-minute-12") {
            activeObject.set('text', "03:15 PM");
          }
          if (measure === "time-hour-24") {
            activeObject.set('text', "15");
          }
          if (measure === "time-hour-12") {
            activeObject.set('text', "03");
          }
          if (measure === "time-minute") {
            activeObject.set('text', "30");
          }
          if (measure === "time-second") {
            activeObject.set('text', "45");
          }
          if (measure === "time-am-pm") {
            activeObject.set('text', "PM");
          }
          // Date ========================================================================
          if (measure === "date-yyyy-mm-dd") {
            activeObject.set('text', "2025-01-01");
          }
          if (measure === "date-mm-dd-yy") {
            activeObject.set('text', "01/01/25");
          }
          if (measure === "custom-text") {
            activeObject.set('text', "Custom Text");
          }
          if (measure === "date-month-number") {
            activeObject.set('text', "01");
          }
          if (measure === "date-month-full") {
            activeObject.set('text', "January");
          }
          if (measure === "date-month-short") {
            activeObject.set('text', "Jan");
          }
          if (measure === "date-day-number") {
            activeObject.set('text', "01");
          }
          if (measure === "date-day-full") {
            activeObject.set('text', "Monday");
          }
          if (measure === "date-day-short") {
            activeObject.set('text', "Mon");
          }
          if (measure === "date-year-short") {
            activeObject.set('text', "25");
          }
          if (measure === "date-year-full") {
            activeObject.set('text', "2025");
          }
          // CPU =============================================================================
          if (measure === "cpu-average") {
            activeObject.set('text', "69%");
          }
          if (measure === "cpu-core-1") {
            activeObject.set('text', "10%");
          }
          if (measure === "cpu-core-2") {
            activeObject.set('text', "20%");
          }
          if (measure === "cpu-core-3") {
            activeObject.set('text', "30%");
          }
          if (measure === "cpu-core-4") {
            activeObject.set('text', "40%");
          }
          if (measure === "cpu-core-5") {
            activeObject.set('text', "50%");
          }
          if (measure === "cpu-core-6") {
            activeObject.set('text', "60%");
          }
          if (measure === "cpu-core-7") {
            activeObject.set('text', "70%");
          }
          if (measure === "cpu-core-8") {
            activeObject.set('text', "80%");
          }
          // DISK ==============================================================================
          if (measure === "disk-c-label") {
            activeObject.set('text', "Windows");
          }
          if (measure === "disk-c-total-space") {
            activeObject.set('text', "123456789 B");
          }
          if (measure === "disk-c-free-space") {
            activeObject.set('text', "123456789 B");
          }
          if (measure === "disk-c-used-space") {
            activeObject.set('text', "123456789 B");
          }
          // RAM =============================================================================

          this.canvas.renderAll(); // Re-render the canvas to reflect changes
        }
      }
      // if (activeObject) {
      //   activeObject.set('fontFamily', measure); // Update the font
      //   this.canvas.renderAll(); // Re-render the canvas to reflect changes
      // }
    }
  }

  async addImageLayer(x: number, y: number, name?: string) {
    if (this.canvas) {
        const resPath = await resourceDir();
        const sourcePath = await join(resPath, '_up_/public/images/image-placeholder.png');
        
        if (sourcePath) {
            const assetUrl = convertFileSrc(sourcePath);
            try {
                const img: FabricImage = await FabricImage.fromURL(assetUrl, { crossOrigin: 'anonymous' });
                img.set({
                    left: x,
                    top: y,
                    outerHeight: img.height,
                    outerWidth: img.width,
                    scaleX: 1,
                    scaleY: 1,
                    originX: 'center',
                    originY: 'center',
                    hasControls: true,
                });
                const layerProperties: LayerProperties[] = [
                    { property: 'W', value: img.width.toString() },
                    { property: 'H', value: img.height.toString() },
                    { property: 'PreserveAspectRatio', value: '1' }
                ];
                this.addLayer(LayerType.IMAGE, img, sourcePath, new Group(), layerProperties, false, name);
            } catch (error) {
                console.error("Error loading image:", error);
            }
        }
    } else {
        return null;
    }
  }

  async addRotatorLayer(x: number, y: number, name?: string) {
    if (this.canvas) {
      const resPath = await resourceDir();
      const source = await join(resPath, '_up_/public/images/Needle.png');
      const backgroundSourcePath = await join(resPath, '_up_/public/images/RotatorBackground2.png');
      const assetUrl = convertFileSrc(source);
      const backgroundAssetUrl = convertFileSrc(backgroundSourcePath);
      console.log(assetUrl);
      
      // Use fromURL correctly with await
      try {
        const backgroundImg: FabricImage = await FabricImage.fromURL(backgroundAssetUrl, { crossOrigin: 'anonymous' });
                backgroundImg.set({
                    left: x,
                    top: y,
                    outerHeight: backgroundImg.height,
                    outerWidth: backgroundImg.width,
                    scaleX: 1,
                    scaleY: 1,
                    originX: 'center',
                    originY: 'center',
                    hasControls: true,
                });
                this.addLayer(LayerType.IMAGE, backgroundImg, backgroundSourcePath);
          const img: FabricImage = await FabricImage.fromURL(assetUrl, { crossOrigin: 'anonymous' });
          img.set({
              left: x,
              top: y,
              outerHeight: img.height,
              outerWidth: img.width,
              originX: 'center',
              originY: 'center',
              centeredScaling: true,
              centeredRotation: true,
              angle: 0,
              scaleX: 1,
              scaleY: 1,
              hasControls: true,
          });
          const rangeIndicator = new Circle({
            radius: 40,
            originX: 'center',
            originY: 'center',
            centeredScaling: true,
            centeredRotation: true,
            left: x,
            top: y,
            angle: -90,
            startAngle: 0,
            endAngle: 90,
            stroke: '#0F0',
            opacity: 0.5,
            strokeWidth: 25,
            fill: ''
          });
          const indLine = new Line([x, y, x + 50, y], {
            stroke: '#000',
            strokeWidth: 2,
            opacity: 0,
            hasControls: true,

          });
          const pivotPoint = new Circle({
            radius: 5,
            originX: 'center',
            originY: 'center',
            centeredScaling: true,
            centeredRotation: true,
            fill: '#FF0000',
            opacity: 0.5,
            left: x,
            top: y,
            hasControls: true,
        });
          const UIElements = new Group([pivotPoint, rangeIndicator, indLine], {
            visible: true,
            hasControls: true,
            interactive: false,
            selectable: false,
            perPixelTargetFind: true,
            originX: 'center',
            originY: 'center',
            centeredScaling: true,
            centeredRotation: true,
          });
          
          // set the UIElements visible

          // add layerProperties
          const layerProperties: LayerProperties[] = [
            {
              property: "offsetX",
              value: '0'
            },
            {
              property: "offsetY",
              value: '0'
            },
            {
              property: "startAngle",
              value: "0"
            },
            {
              property: "rotationAngle",
              value: "90"
            }
          ];
          this.addLayer(LayerType.ROTATOR, img, source, UIElements, layerProperties, false, name);
      } catch (error) {
          console.error("Error loading image:", error);
      }
        
    } else {
        return null;
    }
  }

  async addBarLayer(x: number, y: number, name?: string) {
    if (this.canvas) {
      try {
        const background = new Rect({
          left: x,
          top: y,
          width: 200,
          height: 50,
          fill: '#000000',
          hasControls: true,
        });
        const foreground = new Rect({
          left: x,
          top: y,
          width: 150,
          height: 50,
          fill: '#FFA500',
          hasControls: true,
        });
        const bar = new Group([background, foreground], {
          centeredScaling: true,
          centeredRotation: true,
          hasControls: true,
          perPixelTargetFind: true,
        });
        const layerProperties: LayerProperties[] = [
          { property: "W", value: "200" },
          { property: "H", value: "50" },
          { property: "BarOrientation", value: "Horizontal" }
        ];
        this.addLayer(LayerType.BAR, bar, "", new Group(), layerProperties, false, name);
      } catch (error) {
        console.error("Error loading image:", error);
      }
    }
  }

  subscribeToLayerChanges(listener: () => void) {
    this.listeners.push(listener);
  }

  unsubscribeFromLayerChanges(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // Notify subscribers of layer changes
  private notifyLayerChange() {
    this.listeners.forEach(listener => listener());
}

  // Add shape layer
  addShapeLayer(x: number, y: number, name?: string, type: 'rect' | 'circle' | 'triangle' = 'rect', options: Partial<FabricObjectProps> = {}) {
    if (this.canvas) {
        let shapeObject: FabricObject;

        switch(type) {
        case 'rect':
            shapeObject = new Rect({
            width: 100,
            height: 100,
            fill: 'rgba(100, 100, 255, 0.3)',
            left: x,
            top: y,
            ...options
            });
            break;
        case 'circle':
            shapeObject = new Circle({
            radius: 50,
            fill: 'rgba(100, 255, 100, 0.3)',
            left: x,
            top: y,
            ...options
            });
            break;
        case 'triangle':
            shapeObject = new Triangle({
            width: 100,
            height: 100,
            fill: 'rgba(255, 100, 100, 0.3)',
            left: x,
            top: y,
            ...options
            });
            break;
        }

        let shapeStr = '';
        if (type === 'rect') shapeStr = 'Rectangle 0,0,100,100,0';
        else if (type === 'circle') shapeStr = 'Ellipse 50,50,50,50';
        else shapeStr = 'Rectangle 0,0,100,100'; // Default

        const layerProperties: LayerProperties[] = [
            { property: 'Shape', value: shapeStr },
            { property: 'FillColor', value: '100,100,255,150' },
            { property: 'StrokeWidth', value: '0' }
        ];

        this.addLayer(LayerType.SHAPE, shapeObject, "", new Group(), layerProperties, false, name);
    }
  }

  // Add roundline layer
  addRoundlineLayer(x: number, y: number, name?: string, options: { w?: number; h?: number; lineColor?: string; solidColor?: string } = {}) {
    if (this.canvas) {
      const { w = 100, h = 100, lineColor = '255,255,255,255', solidColor = '50,50,50,180' } = options;
      const radius = Math.min(w, h) / 2;
      const lineLength = radius * 0.8;
      const lineStart = radius * 0.3;
      const lineWidth = 4;
      const startAngle = 0;

      // Draw track (background circle)
      const trackCircle = new Circle({
        left: x + w / 2,
        top: y + h / 2,
        radius: lineStart + (lineLength - lineStart) / 2,
        fill: 'transparent',
        stroke: this.parseRainmeterColor(solidColor),
        strokeWidth: lineWidth,
        selectable: false,
        evented: false,
      });

      // Draw line (indicator)
      const endX = x + w / 2 + Math.cos(startAngle) * lineLength;
      const endY = y + h / 2 + Math.sin(startAngle) * lineLength;
      const indicatorLine = new Line([x + w / 2, y + h / 2, endX, endY], {
        stroke: this.parseRainmeterColor(lineColor),
        strokeWidth: lineWidth,
        selectable: false,
        evented: false,
      });

      const roundlineGroup = new Group([trackCircle, indicatorLine], {
        left: x,
        top: y,
        hasControls: false,
      });

      this.addLayer(LayerType.ROUNDLINE, roundlineGroup, "", new Group(), [], false, name);
    }
  }

  // Add image layer
//   addImageLayer(imageSource: string): Promise<LayerConfig> {
//     return new Promise((resolve, reject) => {
//       fabric.Image.fromURL(imageSource, (img) => {
//         img.set({
//           left: 100,
//           top: 100,
//           scaleX: 0.5,
//           scaleY: 0.5
//         });

//         const layer = this.addLayer(LayerType.IMAGE, img);
//         resolve(layer);
//       }, (error) => {
//         console.error('Error loading image:', error);
//         reject(error);
//       });
//     });
//   }


  // syncLayerFromFabricScale
  public syncLayerFromFabricScale(layerId: string): void {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer || !this.canvas) return;

    const obj = layer.fabricObject;
    const scaleX = obj.scaleX || 1;
    const scaleY = obj.scaleY || 1;

    // Se a escala for 1, não precisa fazer nada
    if (scaleX === 1 && scaleY === 1) return;

    const updateProperty = (key: string, value: string) => {
      const idx = layer.properties.findIndex(p => p.property.toLowerCase() === key.toLowerCase());
      if (idx !== -1) layer.properties[idx].value = value;
      else layer.properties.push({ property: key, value });
    };

    switch (layer.type) {
      case LayerType.IMAGE:
      case LayerType.BAR:
      case LayerType.ROTATOR:
      case LayerType.ROUNDLINE: {
        const newW = (obj.width * scaleX).toFixed(0);
        const newH = (obj.height * scaleY).toFixed(0);
        updateProperty('W', newW);
        updateProperty('H', newH);
        
        // Se for grupo, pode precisar ajustar sub-objetos (opcional, para visual)
        if (obj instanceof Group) {
            obj.set({ width: parseFloat(newW), height: parseFloat(newH) });
        }
        break;
      }
      case LayerType.TEXT: {
        const textObj = obj as IText;
        const newFontSize = (textObj.fontSize * scaleX).toFixed(0);
        updateProperty('FontSize', newFontSize);
        textObj.set('fontSize', parseFloat(newFontSize));
        break;
      }
      case LayerType.SHAPE: {
        const shapeStrProp = layer.properties.find(p => p.property.toLowerCase() === 'shape');
        if (shapeStrProp) {
          let shapeStr = shapeStrProp.value;
          // Parse: Rectangle X,Y,W,H,R | ...
          const parts = shapeStr.split('|');
          let mainPart = parts[0].trim();
          const mainWords = mainPart.split(' ');
          const type = mainWords[0];
          const coords = mainWords[1].split(',').map(c => c.trim());

          if (type.toLowerCase() === 'rectangle') {
            coords[2] = (parseFloat(coords[2]) * scaleX).toFixed(0); // W
            coords[3] = (parseFloat(coords[3]) * scaleY).toFixed(0); // H
          } else if (type.toLowerCase() === 'ellipse') {
            coords[2] = (parseFloat(coords[2]) * scaleX).toFixed(0); // RX
            coords[3] = (parseFloat(coords[3]) * scaleY).toFixed(0); // RY
          } else if (type.toLowerCase() === 'line') {
            coords[2] = (parseFloat(coords[2]) * scaleX).toFixed(0); // EndX
            coords[3] = (parseFloat(coords[3]) * scaleY).toFixed(0); // EndY
          }
          
          mainPart = `${type} ${coords.join(',')}`;
          parts[0] = mainPart;
          shapeStrProp.value = parts.join(' | ');
        }
        break;
      }
    }

    // Reset scales to 1.0 and update fabric object dimensions
    obj.set({
      scaleX: 1,
      scaleY: 1
    });
    obj.setCoords();
    this.canvas.renderAll();
    this.notifyLayerChange();
  }

  // Remove a layer by ID
  removeLayer(layerId: string): void {
    if (this.canvas) {
        const layerIndex = this.layers.findIndex(layer => layer.id === layerId);
    
        if (layerIndex !== -1) {
        const layer = this.layers[layerIndex];
        
        // Remove from canvas
        this.canvas.remove(layer.fabricObject);
        this.canvas.remove(layer.UIElements);
        
        // Remove from layers array
        this.layers.splice(layerIndex, 1);
        
        // Render canvas
        this.canvas.renderAll();
        }
    }
  }

  public getSelectedLayerId(): string | null {
    const activeObject = this.canvas?.getActiveObject();
    const layer = this.layers.find(layer => layer.fabricObject === activeObject);
    return layer?.id ?? null;
  }

  // Method to move a layer in the layers array
  public moveLayer(layerId: string, direction: 'up' | 'down') {
    const layerIndex = this.layers.findIndex(layer => layer.id === layerId);
    if (layerIndex === -1) return; // Layer not found

    if (direction === 'up' && layerIndex > 0) {
        // Move layer up
        const newOrder = arrayMove(this.layers, layerIndex, layerIndex - 1);
        this.layers = newOrder;
    } else if (direction === 'down' && layerIndex < this.layers.length - 1) {
        // Move layer down
        const newOrder = arrayMove(this.layers, layerIndex, layerIndex + 1);
        this.layers = newOrder;
    }

    console.log("tt");
    this.updateCanvasLayerOrder();
    // Notify any subscribers that layers have changed
    this.notifyLayerChange();
}

  // Select a layer by ID
  public selectLayer(layerId: string): void {
    if (this.canvas) {
      console.log(layerId);
        const layer = this.layers.find(l => l.id === layerId);
    
        if (layer) {
        // Deselect all objects
        this.canvas.discardActiveObject();
        
        // Select the specific object
        this.canvas.setActiveObject(layer.fabricObject);
        
        this.canvas.renderAll();
        }
    }
  }

  // Accepts reordered layers array and updates the internal layers order
  public reorderLayers(newOrder: string[]): void {
    this.layers = newOrder.map(id => this.layers.find(layer => layer.id === id)!);
    this.notifyLayerChange(); // Notify subscribers about the updated order
  }

  // Toggle layer visibility
  toggleLayerVisibility(layerId: string): void {
    if (this.canvas) {
        const layer = this.layers.find(l => l.id === layerId);
    
        if (layer) {
        layer.visible = !layer.visible;
        layer.fabricObject.set('visible', layer.visible);
        this.canvas.renderAll();
        }
    }
  }

  // Lock/unlock layer
  toggleLayerLock(layerId: string): void {
    if (this.canvas) {
        const layer = this.layers.find(l => l.id === layerId);
    
        if (layer) {
        layer.locked = !layer.locked;
        layer.fabricObject.set('selectable', !layer.locked);
        this.canvas.renderAll();
        }
    }
  }

  public updateCanvasLayerOrder(): void {
    console.log("updating canvas");
    const selected = this.canvas?.getActiveObject();
    if (this.canvas) {
      // Remove all objects
      this.canvas.getObjects().forEach(obj => {
        if(this.canvas) {
            this.canvas.remove(obj)
        }
    });
      
      // Re-add in the correct order
      this.layers.forEach(layer => {
        if (this.canvas) {
          this.canvas.add(layer.fabricObject)
        }
    });

    if (this.skinBackground) {
      this.canvas.add(this.skinBackground);
      this.canvas.sendObjectToBack(this.skinBackground);
  }

    if(selected) {
      this.canvas.setActiveObject(selected);
    }
      this.canvas.renderAll();
    } else {
      console.warn('Canvas is not set. Unable to update layer order.');
    }
  }
  

  // Generate unique ID for layers
  private generateUniqueId(): string {
    return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate default layer name
  private generateLayerName(type: LayerType): string {
    this.layerCounts[type] += 1;
    const typeLabels = {
      [LayerType.TEXT]: 'Text',
      [LayerType.SHAPE]: 'Shape',
      [LayerType.IMAGE]: 'Image',
      [LayerType.ROTATOR]: 'Rotator',
      [LayerType.BAR]: 'Bar',
      [LayerType.ROUNDLINE]: 'Roundline',
    };
    
    return `${typeLabels[type]}${this.layerCounts[type]}`;
  }

  public async loadFromIni(content: string, resourcesDir: string = ''): Promise<SkinMetadata> {
    if (!this.canvas) {
      console.warn('Canvas not available, loading INI without canvas rendering');
    }

    try {
      this.clearLayers();
      const sections = IniParser.parse(content);
      const metadata = RainmeterUtils.parseMetadata(sections);
      const rawVars = RainmeterUtils.parseVariables(sections);
      // Ensure #Scale# is always resolvable for canvas rendering, default to 1.0
      if (!rawVars['scale']) rawVars['scale'] = '1.0';
      
      const variables = RainmeterUtils.resolveVariableReferences(rawVars);
      let prevObject: FabricObject | null = null;

      for (const section of sections) {
        // Create a normalized version of params for case-insensitive lookup
        const normalizedParams: Record<string, string> = {};
        Object.entries(section.params).forEach(([k, v]) => {
          normalizedParams[k.toLowerCase()] = v;
        });

        if (!normalizedParams.meter) continue;

        try {
          const type = normalizedParams.meter.toLowerCase();
          const resolvedProps = RainmeterUtils.resolveVariables(normalizedParams, variables, resourcesDir);
          const x = this.parseCoordinate(resolvedProps.x || '0', prevObject, false);
          const y = this.parseCoordinate(resolvedProps.y || '0', prevObject, true);
          let fabricObj: FabricObject | null = null;

          if (type === 'image') {
            let imgSrc = resolvedProps.imagename || '';
            const rawImgName = normalizedParams.imagename || '';
            
            // Check session cache if it's a managed path (#@#Images/N.png)
            if (rawImgName.startsWith('#@#Images/')) {
              const match = rawImgName.match(/#@#Images\/(\d+)\.png/);
              if (match) {
                const index = parseInt(match[1]);
                if (this.sessionImages[index]) {
                  imgSrc = this.sessionImages[index];
                }
              }
            }

            const assetUrl = imgSrc ? convertFileSrc(imgSrc) : '';
            try {
              const img: FabricImage = await FabricImage.fromURL(assetUrl, { crossOrigin: 'anonymous' });
              img.set({
                left: x,
                top: y,
                scaleX: resolvedProps.w ? parseFloat(resolvedProps.w) / img.width : 1,
                scaleY: resolvedProps.h ? parseFloat(resolvedProps.h) / img.height : 1,
                hasControls: true,
              });
            fabricObj = img;
            const props = Object.entries(resolvedProps).map(([property, value]) => ({ property, value }));
                this.addLayer(LayerType.IMAGE, fabricObj, imgSrc, new Group(), props, true, section.name);
              } catch (e) {
                console.error("Error loading image:", e);
              }
            } else if (type === 'roundline') {
            const w = parseFloat(resolvedProps.w || '100');
            const h = parseFloat(resolvedProps.h || '100');
            const radius = Math.min(w, h) / 2;
            const lineLength = parseFloat(resolvedProps.linelength || String(radius * 0.8));
            const lineStart = parseFloat(resolvedProps.linestart || String(radius * 0.3));
            const lineWidth = parseFloat(resolvedProps.linewidth || '4');
            const startAngle = parseFloat(resolvedProps.startangle || '0') * (Math.PI / 180);
            const objects: FabricObject[] = [];
            if (resolvedProps.solidcolor) {
              objects.push(new Circle({
                left: w / 2,
                top: h / 2,
                radius: lineStart + (lineLength - lineStart) / 2,
                fill: 'transparent',
                stroke: this.parseRainmeterColor(resolvedProps.solidcolor),
                strokeWidth: lineWidth,
                selectable: false,
                evented: false,
              }));
            }
            const endX = w / 2 + Math.cos(startAngle) * lineLength;
            const endY = h / 2 + Math.sin(startAngle) * lineLength;
            objects.push(new Line([w / 2, h / 2, endX, endY], {
              stroke: this.parseRainmeterColor(resolvedProps.linecolor || '255,255,255,255'),
              strokeWidth: lineWidth,
              selectable: false,
              evented: false,
            }));
            const roundlineGroup = new Group(objects, { left: x, top: y, hasControls: true });
            fabricObj = roundlineGroup;
            const props = Object.entries(resolvedProps).map(([property, value]) => ({ property, value }));
            this.addLayer(LayerType.ROUNDLINE, fabricObj, "", new Group(), props, true, section.name);
          } else if (type === 'shape') {
            const w = parseFloat(resolvedProps.w || '100');
            const h = parseFloat(resolvedProps.h || '100');
            const shapeDef = resolvedProps.shape || '';
            let shapeObj: FabricObject;
            if (shapeDef.toLowerCase().includes('rectangle')) {
              const rectMatch = shapeDef.match(/Rectangle\s+([\d,.]+)/i);
              if (rectMatch) {
                const coords = rectMatch[1].split(',').map(Number);
                const [rx, ry, rw, rh, rCorner = 0] = coords;
                shapeObj = new Rect({
                  left: x + (rx || 0),
                  top: y + (ry || 0),
                  width: rw || w,
                  height: rh || h,
                  rx: rCorner,
                  ry: rCorner,
                  fill: this.parseShapeFill(shapeDef),
                  stroke: this.parseShapeStroke(shapeDef),
                  strokeWidth: this.parseShapeStrokeWidth(shapeDef),
                  hasControls: true,
                });
              } else {
                shapeObj = new Rect({ left: x, top: y, width: w, height: h, fill: 'rgba(100, 100, 255, 0.2)', hasControls: true });
              }
            } else if (shapeDef.toLowerCase().includes('ellipse')) {
              const ellipseMatch = shapeDef.match(/Ellipse\s+([\d,.]+)/i);
              if (ellipseMatch) {
                const coords = ellipseMatch[1].split(',').map(Number);
                const [cx, cy, rx, ry] = coords;
                shapeObj = new Ellipse({
                  left: x + (cx || 0) - (rx || w / 2),
                  top: y + (cy || 0) - (ry || h / 2),
                  rx: rx || w / 2,
                  ry: ry || h / 2,
                  fill: this.parseShapeFill(shapeDef),
                  stroke: this.parseShapeStroke(shapeDef),
                  strokeWidth: this.parseShapeStrokeWidth(shapeDef),
                  hasControls: true,
                });
              } else {
                shapeObj = new Ellipse({ left: x, top: y, rx: w / 2, ry: h / 2, fill: 'rgba(100, 255, 100, 0.2)', hasControls: true });
              }
            } else {
              shapeObj = new Rect({ left: x, top: y, width: w, height: h, fill: 'rgba(255, 165, 0, 0.2)', hasControls: true });
            }
            fabricObj = shapeObj;
            const props = Object.entries(resolvedProps).map(([property, value]) => ({ property, value }));
            this.addLayer(LayerType.SHAPE, fabricObj, "", new Group(), props, true, section.name);
          } else if (type === 'bar') {
            const w = parseFloat(resolvedProps.w || '100');
            const h = parseFloat(resolvedProps.h || '20');
            const background = new Rect({
              left: 0,
              top: 0,
              width: w,
              height: h,
              fill: this.parseRainmeterColor(resolvedProps.solidcolor || '50, 50, 50, 180'),
              hasControls: true,
            });
            const foreground = new Rect({
              left: 0,
              top: 0,
              width: w * 0.75, // Representation of 75% fill
              height: h,
              fill: this.parseRainmeterColor(resolvedProps.barcolor || '0, 120, 255, 255'),
              hasControls: true,
            });
            const barGroup = new Group([background, foreground], {
              left: x,
              top: y,
              hasControls: true,
              perPixelTargetFind: true
            });
            fabricObj = barGroup;
            const props = Object.entries(resolvedProps).map(([property, value]) => ({ property, value }));
            this.addLayer(LayerType.BAR, fabricObj, "", new Group(), props, true, section.name);
          } else if (type === 'rotator') {
            let imgSrc = resolvedProps.imagename || '';
            const rawImgName = normalizedParams.imagename || '';
            
            // Check session cache if it's a managed path (#@#Images/N.png)
            if (rawImgName.startsWith('#@#Images/')) {
              const match = rawImgName.match(/#@#Images\/(\d+)\.png/);
              if (match) {
                const index = parseInt(match[1]);
                if (this.sessionImages[index]) {
                  imgSrc = this.sessionImages[index];
                }
              }
            }

            const assetUrl = imgSrc ? convertFileSrc(imgSrc) : '';
            try {
              const img: FabricImage = await FabricImage.fromURL(assetUrl, { crossOrigin: 'anonymous' });
              img.set({ left: x, top: y, originX: 'center', originY: 'center', hasControls: true });
              fabricObj = img;
              const props = Object.entries(resolvedProps).map(([property, value]) => ({ property, value }));
              this.addLayer(LayerType.ROTATOR, fabricObj, imgSrc, new Group(), props, true, section.name);
            } catch (e) {
              console.error("Error loading rotator image:", e);
            }
          } else if (type === 'string') {
            fabricObj = new IText(resolvedProps.text || section.name, {
              left: x,
              top: y,
              fontSize: parseFloat(resolvedProps.fontsize || '12') * 1.33,
              fontFamily: resolvedProps.fontface || 'Arial',
              fill: this.parseRainmeterColor(resolvedProps.fontcolor || '0,0,0,255'),
              hasControls: true,
            });
            const props = Object.entries(resolvedProps).map(([property, value]) => ({ property, value }));
            this.addLayer(LayerType.TEXT, fabricObj, "", new Group(), props, true, section.name);
          }

          if (fabricObj) {
            prevObject = fabricObj;
          }
        } catch (sectionError) {
          console.warn(`Error loading section ${section.name}:`, sectionError);
        }
      }

      this.canvas?.renderAll();
      return metadata;
    } catch (error) {
      console.error('Fatal error in loadFromIni:', error);
      throw error;
    }
  }

  private parseCoordinate(value: string, prevObject: FabricObject | null, isY: boolean): number {
    // Handle Rainmeter math patterns like (100 * #Scale#) or (50 * #Scale#)
    const cleanValue = value.replace(/\(|\)|#Scale#|[*]|\s/g, '');
    
    let numeric = cleanValue.replace(/[rR%]/g, '');
    let val = parseFloat(numeric) || 0;

    if (value.endsWith('%')) {
      // Handle percentage if needed, for now assume 1920x1080 if background not set
      const ref = isY ? (this.skinBackground?.height || 1080) : (this.skinBackground?.width || 1920);
      return (val / 100) * ref;
    }

    if (prevObject) {
      if (value.endsWith('r')) {
        return (isY ? prevObject.top : prevObject.left) + val;
      } else if (value.endsWith('R')) {
        const dim = isY ? prevObject.height * prevObject.scaleY : prevObject.width * prevObject.scaleX;
        return (isY ? prevObject.top : prevObject.left) + dim + val;
      }
    }

    const offset = isY ? (this.skinBackground?.top || 200) : (this.skinBackground?.left || 400);
    return val + offset;
  }

  private parseRainmeterColor(colorStr: string): string {
    return fromRainmeterColor(colorStr);
  }

  // Helper functions for parsing Shape meter properties
  private parseShapeFill(shapeDef: string): string {
    const fillMatch = shapeDef.match(/Fill\s+Color\s+([\d,]+)/i);
    if (fillMatch) {
      return this.parseRainmeterColor(fillMatch[1]);
    }
    const fillGradMatch = shapeDef.match(/Fill\s+LinearGradient\s+(\w+)/i);
    if (fillGradMatch) {
      return 'rgba(100, 100, 255, 0.3)'; // Simplified gradient representation
    }
    return 'rgba(150, 150, 150, 0.2)';
  }

  private parseShapeStroke(shapeDef: string): string | undefined {
    const strokeMatch = shapeDef.match(/Stroke\s+Color\s+([\d,]+)/i);
    if (strokeMatch) {
      return this.parseRainmeterColor(strokeMatch[1]);
    }
    return undefined;
  }

  private parseShapeStrokeWidth(shapeDef: string): number {
    const widthMatch = shapeDef.match(/StrokeWidth\s+([\d.]+)/i);
    if (widthMatch) {
      return parseFloat(widthMatch[1]);
    }
    return 0;
  }

  // Get all layers
  getLayers(): LayerConfig[] {
    return [...this.layers];
  }

  public setSessionImages(images: string[]): void {
    this.sessionImages = images;
  }
}

export const layerManager = LayerManager.getInstance();