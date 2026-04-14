/**
 * Commands for Undo/Redo operations in Rainmeter Editor
 * 
 * Similar to commands.py in the Python version
 */

import { FabricObject } from 'fabric';
import { Command } from './UndoRedoManager';
import { layerManager } from './LayerManager';

// ==========================================
// Layer Commands
// ==========================================

export class AddLayerCommand implements Command {
  public name: string;
  private layerId: string;
  
  constructor(layerType: string, layerId: string) {
    this.name = `Add ${layerType} layer`;
    this.layerId = layerId;
  }

  execute(): void {
    const layer = layerManager.layers.find((l: any) => l.id === this.layerId);
    if (layer) {
      layer.visible = true;
      layer.fabricObject.set('visible', true);
      layerManager.getCanvas()?.renderAll();
    }
  }

  redo(): void {
    this.execute();
  }

  undo(): void {
    const layer = layerManager.layers.find((l: any) => l.id === this.layerId);
    if (layer) {
      layer.visible = false;
      layer.fabricObject.set('visible', false);
      layerManager.getCanvas()?.renderAll();
    }
  }
}

export class DeleteLayerCommand implements Command {
  public name: string;
  private layerId: string;
  private layerData: any;
  private canvasObjects: FabricObject[] = [];
  private layerIndex: number = -1;
  
  constructor(layerId: string) {
    this.name = `Delete layer`;
    this.layerId = layerId;
  }

  execute(): void {
    const layer = layerManager.layers.find((l: any) => l.id === this.layerId);
    
    if (layer) {
      this.layerData = { ...layer };
      this.layerIndex = layerManager.layers.indexOf(layer);
      this.canvasObjects = [layer.fabricObject, layer.UIElements].filter(Boolean);
      
      const canvas = layerManager.getCanvas();
      if (canvas) {
        this.canvasObjects.forEach(obj => canvas.remove(obj));
        canvas.renderAll();
      }
      
      layerManager.layers = layerManager.layers.filter((l: any) => l.id !== this.layerId);
    }
  }

  undo(): void {
    if (this.layerData) {
      const canvas = layerManager.getCanvas();
      layerManager.layers.splice(this.layerIndex, 0, this.layerData);
      if (canvas) {
        this.canvasObjects.forEach(obj => canvas.add(obj));
        canvas.renderAll();
      }
    }
  }

  redo(): void {
    this.execute();
  }
}

export class MoveLayerCommand implements Command {
  public name: string;
  private layerId: string;
  private oldX: number;
  private oldY: number;
  private newX: number;
  private newY: number;
  
  constructor(layerId: string, oldX: number, oldY: number, newX: number, newY: number) {
    this.name = `Move layer`;
    this.layerId = layerId;
    this.oldX = oldX;
    this.oldY = oldY;
    this.newX = newX;
    this.newY = newY;
  }

  execute(): void {
    this.applyPosition(this.newX, this.newY);
  }

  undo(): void {
    this.applyPosition(this.oldX, this.oldY);
  }

  redo(): void {
    this.applyPosition(this.newX, this.newY);
  }

  private applyPosition(x: number, y: number): void {
    const layer = layerManager.layers.find((l: any) => l.id === this.layerId);
    if (layer) {
      layer.fabricObject.set({ left: x, top: y });
      layer.fabricObject.setCoords();
      layer.UIElements?.set({ left: x, top: y });
      layer.UIElements?.setCoords();
      layerManager.getCanvas()?.renderAll();
    }
  }
}

export class ResizeLayerCommand implements Command {
  public name: string;
  private layerId: string;
  private oldScaleX: number;
  private oldScaleY: number;
  private newScaleX: number;
  private newScaleY: number;
  
  constructor(layerId: string, oldScaleX: number, oldScaleY: number, newScaleX: number, newScaleY: number) {
    this.name = `Resize layer`;
    this.layerId = layerId;
    this.oldScaleX = oldScaleX;
    this.oldScaleY = oldScaleY;
    this.newScaleX = newScaleX;
    this.newScaleY = newScaleY;
  }

  execute(): void {
    this.applyScale(this.newScaleX, this.newScaleY);
  }

  undo(): void {
    this.applyScale(this.oldScaleX, this.oldScaleY);
  }

  redo(): void {
    this.applyScale(this.newScaleX, this.newScaleY);
  }

  private applyScale(scaleX: number, scaleY: number): void {
    const layer = layerManager.layers.find((l: any) => l.id === this.layerId);
    if (layer) {
      layer.fabricObject.set({ scaleX, scaleY });
      layer.fabricObject.setCoords();
      layerManager.getCanvas()?.renderAll();
    }
  }
}

export class RotateLayerCommand implements Command {
  public name: string;
  private layerId: string;
  private oldAngle: number;
  private newAngle: number;
  
  constructor(layerId: string, oldAngle: number, newAngle: number) {
    this.name = `Rotate layer`;
    this.layerId = layerId;
    this.oldAngle = oldAngle;
    this.newAngle = newAngle;
  }

  execute(): void {
    this.applyAngle(this.newAngle);
  }

  undo(): void {
    this.applyAngle(this.oldAngle);
  }

  redo(): void {
    this.applyAngle(this.newAngle);
  }

  private applyAngle(angle: number): void {
    const layer = layerManager.layers.find((l: any) => l.id === this.layerId);
    if (layer) {
      layer.fabricObject.set({ angle });
      layer.fabricObject.setCoords();
      layerManager.getCanvas()?.renderAll();
    }
  }
}

export class ToggleVisibilityCommand implements Command {
  public name: string;
  private layerId: string;
  private oldVisibility: boolean;
  private newVisibility: boolean;
  
  constructor(layerId: string, oldVisibility: boolean, newVisibility: boolean) {
    this.name = `Toggle visibility`;
    this.layerId = layerId;
    this.oldVisibility = oldVisibility;
    this.newVisibility = newVisibility;
  }

  execute(): void {
    this.applyVisibility(this.newVisibility);
  }

  undo(): void {
    this.applyVisibility(this.oldVisibility);
  }

  redo(): void {
    this.applyVisibility(this.newVisibility);
  }

  private applyVisibility(visible: boolean): void {
    const layer = layerManager.layers.find((l: any) => l.id === this.layerId);
    if (layer) {
      layer.visible = visible;
      layer.fabricObject.set('visible', visible);
      layerManager.getCanvas()?.renderAll();
    }
  }
}

export class RenameLayerCommand implements Command {
  public name: string;
  private layerId: string;
  private oldName: string;
  private newName: string;
  
  constructor(layerId: string, oldName: string, newName: string) {
    this.name = `Rename layer`;
    this.layerId = layerId;
    this.oldName = oldName;
    this.newName = newName;
  }

  execute(): void {
    this.applyName(this.newName);
  }

  undo(): void {
    this.applyName(this.oldName);
  }

  redo(): void {
    this.applyName(this.newName);
  }

  private applyName(name: string): void {
    const layer = layerManager.layers.find((l: any) => l.id === this.layerId);
    if (layer) {
      layer.name = name;
    }
  }
}

export class ReorderLayersCommand implements Command {
  public name: string;
  private oldOrder: string[];
  private newOrder: string[];
  
  constructor(oldOrder: string[], newOrder: string[]) {
    this.name = `Reorder layers`;
    this.oldOrder = oldOrder;
    this.newOrder = newOrder;
  }

  execute(): void {
    this.applyOrder(this.newOrder);
  }

  undo(): void {
    this.applyOrder(this.oldOrder);
  }

  redo(): void {
    this.applyOrder(this.newOrder);
  }

  private applyOrder(order: string[]): void {
    layerManager.reorderLayers(order);
    layerManager.updateCanvasLayerOrder();
  }
}

// ==========================================
// Property Commands
// ==========================================

export class ChangePropertyCommand implements Command {
  public name: string;
  private layerId: string;
  private property: string;
  private oldValue: string;
  private newValue: string;
  
  constructor(layerId: string, property: string, oldValue: string, newValue: string) {
    this.name = `Change ${property}`;
    this.layerId = layerId;
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }

  execute(): void {
    this.applyValue(this.newValue);
  }

  undo(): void {
    this.applyValue(this.oldValue);
  }

  redo(): void {
    this.applyValue(this.newValue);
  }

  private applyValue(value: string): void {
    const layer = layerManager.layers.find((l: any) => l.id === this.layerId);
    
    if (layer) {
      const prop = layer.properties.find((p: any) => p.property === this.property);
      if (prop) {
        prop.value = value;
      }
      
      const fabricObj = layer.fabricObject;
      
      switch (this.property.toLowerCase()) {
        case 'fill':
          fabricObj.set('fill', value);
          break;
        case 'text':
          if (fabricObj.type === 'i-text' || fabricObj.type === 'text') {
            fabricObj.set('text', value);
          }
          break;
        case 'fontsize':
          fabricObj.set('fontSize', parseFloat(value));
          break;
        case 'opacity':
          fabricObj.set('opacity', parseFloat(value));
          break;
        case 'left':
        case 'x':
          fabricObj.set('left', parseFloat(value));
          break;
        case 'top':
        case 'y':
          fabricObj.set('top', parseFloat(value));
          break;
      }
      
      layerManager.getCanvas()?.renderAll();
    }
  }
}
// ==========================================
// Meta Commands
// ==========================================

/**
 * A command that groups multiple commands together to be executed and undone as a single unit.
 */
export class MacroCommand implements Command {
  public name: string;
  private commands: Command[];

  constructor(name: string, commands: Command[]) {
    this.name = name;
    this.commands = commands;
  }

  execute(): void {
    this.commands.forEach(cmd => cmd.execute());
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  redo(): void {
    this.commands.forEach(cmd => cmd.redo());
  }
}
