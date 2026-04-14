import { Canvas, FabricText, Line, Point, ActiveSelection } from 'fabric';
import { MacroCommand, MoveLayerCommand } from './commands';
import UndoRedoManager from './UndoRedoManager';
import { layerManager } from './LayerManager';

interface GridConfig {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

class CanvasManager {
  private static instance: CanvasManager | null = null;
  public canvas: Canvas | null = null;
  private gridConfig: GridConfig = {
    showGrid: false,
    snapToGrid: false,
    gridSize: 10,
  };
  private gridLines: Line[] = [];

  private constructor() {}

  public static getInstance(): CanvasManager {
    if (!CanvasManager.instance) {
      CanvasManager.instance = new CanvasManager();
    }
    return CanvasManager.instance;
  }

  public setCanvas(canvas: Canvas) {
    this.canvas = canvas;
  }

  public getCanvas() {
    return this.canvas;
  }

  public addText(text: string, x: number, y: number) {
    if (this.canvas) {
      const newText = new FabricText(text, {
        left: x,
        top: y,
      });
      this.canvas.add(newText);
      this.canvas.renderAll();
    }
  }

  // Grid management
  public getGridConfig(): GridConfig {
    return this.gridConfig;
  }

  public setGridConfig(config: Partial<GridConfig>) {
    this.gridConfig = { ...this.gridConfig, ...config };
    
    if (this.canvas) {
      if (config.showGrid !== undefined) {
        if (config.showGrid) {
          this.drawGrid();
        } else {
          this.clearGrid();
        }
      }
      
      if (config.gridSize !== undefined && this.gridConfig.showGrid) {
        this.clearGrid();
        this.drawGrid();
      }
      
      this.canvas.renderAll();
    }
  }

  public snapToGrid(value: number): number {
    if (!this.gridConfig.snapToGrid) return value;
    const gridSize = this.gridConfig.gridSize;
    return Math.round(value / gridSize) * gridSize;
  }

  // Zoom management
  public setZoom(zoom: number) {
    if (!this.canvas) return;
    
    const clampedZoom = Math.min(5, Math.max(0.1, zoom));
    this.canvas.setZoom(clampedZoom);
    
    // Redraw grid with new zoom
    if (this.gridConfig.showGrid) {
      this.clearGrid();
      this.drawGrid();
    }
    
    this.canvas.renderAll();
  }

  public getZoom(): number {
    return this.canvas?.getZoom() || 1;
  }

  public zoomToPoint(point: { x: number; y: number }, zoomFactor: number) {
    if (!this.canvas) return;
    
    const currentZoom = this.canvas.getZoom();
    const newZoom = Math.min(5, Math.max(0.1, currentZoom * zoomFactor));
    
    this.canvas.zoomToPoint(new Point(point.x, point.y), newZoom);
    
    // Redraw grid with new zoom
    if (this.gridConfig.showGrid) {
      this.clearGrid();
      this.drawGrid();
    }
    
    this.canvas.renderAll();
  }

  public resetZoom() {
    if (!this.canvas) return;
    this.canvas.setZoom(1);
    this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    
    if (this.gridConfig.showGrid) {
      this.clearGrid();
      this.drawGrid();
    }
    
    this.canvas.renderAll();
  }

  public refreshGrid() {
    if (this.gridConfig.showGrid) {
      this.drawGrid();
    } else {
      this.clearGrid();
    }
  }

  private drawGrid() {
    if (!this.canvas) return;
    
    this.clearGrid();
    
    const gridSize = this.gridConfig.gridSize;
    const width = this.canvas.getWidth();
    const height = this.canvas.getHeight();
    
    // Get viewport transform and zoom
    const vpt = this.canvas.viewportTransform;
    if (!vpt) return;
    
    const zoom = this.canvas.getZoom();

    // Calculate the visible canvas area (in canvas coordinates)
    const minX = -vpt[4] / zoom;
    const minY = -vpt[5] / zoom;
    const maxX = (width - vpt[4]) / zoom;
    const maxY = (height - vpt[5]) / zoom;
    
    const gridColor = '#404040';
    const gridOpacity = 0.2;
    const majorGridColor = '#606060';
    const majorGridOpacity = 0.4;
    const lineWidth = 1;

    // Align start points to the grid
    const startX = Math.floor(minX / gridSize) * gridSize;
    const startY = Math.floor(minY / gridSize) * gridSize;

    // Draw vertical lines
    for (let x = startX; x <= maxX; x += gridSize) {
      // Use canvas coordinates for the major check to ensure it stays consistent
      const isMajor = Math.round(x) % (gridSize * 5) === 0;
      const line = new Line([x, minY, x, maxY], {
        stroke: isMajor ? majorGridColor : gridColor,
        strokeWidth: lineWidth / zoom, // Keep lines thin regardless of zoom
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        opacity: isMajor ? majorGridOpacity : gridOpacity,
      });
      this.gridLines.push(line);
      this.canvas.add(line);
      this.canvas.sendObjectToBack(line);
    }

    // Draw horizontal lines
    for (let y = startY; y <= maxY; y += gridSize) {
      const isMajor = Math.round(y) % (gridSize * 5) === 0;
      const line = new Line([minX, y, maxX, y], {
        stroke: isMajor ? majorGridColor : gridColor,
        strokeWidth: lineWidth / zoom,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        opacity: isMajor ? majorGridOpacity : gridOpacity,
      });
      this.gridLines.push(line);
      this.canvas.add(line);
      this.canvas.sendObjectToBack(line);
    }
  }

  private clearGrid() {
    if (!this.canvas) return;
    
    this.gridLines.forEach(line => {
      this.canvas?.remove(line);
    });
    this.gridLines = [];
  }

  /**
   * Aligns selected objects on the canvas
   */
  public alignSelected(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    if (!this.canvas) return;
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) return;
    
    // 1. Capture the bounding rect of the original selection (absolute canvas space)
    const selectionBounds = activeObject.getBoundingRect(true);
    
    // 2. Get the objects and clone the array
    const objects = [...activeObject.getObjects()];
    if (objects.length < 2 && activeObject.type !== 'group') return;

    // 3. IMPORTANT: Discard the selection so objects now use absolute canvas coordinates
    this.canvas.discardActiveObject();
    
    const commands: any[] = [];
    
    // 4. Calculate moves in absolute space
    objects.forEach((obj: any) => {
      const layer = layerManager.getLayerByFabricObject(obj);
      if (!layer) return;
      
      const objBounds = obj.getBoundingRect(true); 
      let newLeft = obj.left;
      let newTop = obj.top;
      
      switch (mode) {
        case 'left':
          newLeft = selectionBounds.left;
          break;
        case 'center':
          newLeft = selectionBounds.left + (selectionBounds.width / 2) - (objBounds.width / 2);
          break;
        case 'right':
          newLeft = selectionBounds.left + selectionBounds.width - objBounds.width;
          break;
        case 'top':
          newTop = selectionBounds.top;
          break;
        case 'middle':
          newTop = selectionBounds.top + (selectionBounds.height / 2) - (objBounds.height / 2);
          break;
        case 'bottom':
          newTop = selectionBounds.top + selectionBounds.height - objBounds.height;
          break;
      }
      
      console.log(`Calc Item ${layer.name}: Current(${obj.left},${obj.top}) -> New(${newLeft},${newTop})`);

      if (Math.abs(newLeft - obj.left) > 0.1 || Math.abs(newTop - obj.top) > 0.1) {
        commands.push(new MoveLayerCommand(layer.id, obj.left, obj.top, newLeft, newTop));
      }
    });
    
    // 5. Execute commands via worker (macro)
    if (commands.length > 0) {
      const macro = new MacroCommand(`Align ${mode}`, commands);
      UndoRedoManager.getInstance().execute(macro);
    }
    
    // 6. Restore the selection
    if (objects.length > 1) {
      const selection = new ActiveSelection(objects, { canvas: this.canvas });
      this.canvas.setActiveObject(selection);
    } else if (objects.length === 1) {
      this.canvas.setActiveObject(objects[0]);
    }
    
    this.canvas.requestRenderAll();
  }
}

export const canvasManager = CanvasManager.getInstance();
