import React, { useEffect, useRef, useState } from 'react';
import { Canvas, FabricObject, Group, Line } from 'fabric';
import * as fabric from 'fabric';
import { canvasManager } from '../services/CanvasManager';
import { layerManager } from '@/services/LayerManager';
import { useLayerContext } from '@/context/LayerContext';
import { useTheme } from './theme-provider';
import UndoRedoManager from '@/services/UndoRedoManager';
import { MoveLayerCommand, ResizeLayerCommand, RotateLayerCommand } from '@/services/commands';

const CanvasRenderer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { setSelectedLayer } = useLayerContext();
  const { theme } = useTheme();
  const canvasInstanceRef = useRef<Canvas | null>(null);
  const moveStartPositionsRef = useRef<Map<string, { left: number; top: number }>>(new Map());
  const resizeStartScalesRef = useRef<Map<string, { scaleX: number; scaleY: number }>>(new Map());
  const rotationStartAngleRef = useRef<Map<string, number>>(new Map());
  const originLinesRef = useRef<{ xAxis: Line; yAxis: Line } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth - 500, height: window.innerHeight - 7 });

  // Utility functions for color conversion
  function hslToHex(h: number, s: number, l: number): string {
    h = Number(h);
    s = Number(s);
    l = Number(l);
    if (isNaN(h) || isNaN(s) || isNaN(l)) {
      console.warn('Invalid HSL values:', { h, s, l });
      return '#000000';
    }
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c/2;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    const toHex = (n: number): string => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  function getCSSVariableValue(variableName: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim();
  }
  function cssVariableToHex(variableName: string): string {
    const hslValue = getCSSVariableValue(variableName);
    const hslMatch = hslValue.match(/(\d+(\.\d+)?)/g);
    if (!hslMatch || hslMatch.length < 3) {
      console.warn('Invalid HSL format:', hslValue);
      return '#000000';
    }
    const [h, s, l] = hslMatch.map(Number);
    return hslToHex(h, s, l);
  }

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = new Canvas(canvasRef.current, {
        preserveObjectStacking: true,
        height: canvasSize.height,
        width: canvasSize.width,
        backgroundColor: cssVariableToHex('--card'),
      });

      // Apply viewport transform so that (0,0) is at the center of the canvas
      const centerX = canvasSize.width / 2;
      const centerY = canvasSize.height / 2;
      canvas.viewportTransform = [1, 0, 0, 1, centerX, centerY];

      canvasInstanceRef.current = canvas;
      canvasManager.setCanvas(canvas);
      layerManager.setCanvas(canvas);

      // Create origin lines (X and Y axes)
      const xAxis = new Line([-canvasSize.width, 0, canvasSize.width, 0], {
        stroke: theme === 'dark' ? 'rgba(255, 100, 100, 0.3)' : 'rgba(255, 0, 0, 0.3)',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });

      const yAxis = new Line([0, -canvasSize.height, 0, canvasSize.height], {
        stroke: theme === 'dark' ? 'rgba(100, 255, 100, 0.3)' : 'rgba(0, 255, 0, 0.3)',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });

      canvas.add(xAxis);
      canvas.add(yAxis);
      canvas.sendObjectToBack(yAxis);
      canvas.sendObjectToBack(xAxis);
      originLinesRef.current = { xAxis, yAxis };

      canvas.renderAll();
      layerManager.setSkinBackground();

      const handleSelectionEvent = (event: any) => {
        if (!event.selected) return;
        if (event.selected.length > 1) {
          const obj = canvas.getActiveObject();
          if (obj) {
            obj.hasControls = false;
          }
          return;
        }
        
        const selectedObject = event.selected[0];
        const layer = layerManager.getLayerByFabricObject(selectedObject);
        
        if (layer?.UIElements) {
          // setSelectedLayerId(layer.id);
          setSelectedLayer(layer);
          layer.UIElements.set({
            visible:true,
          })
          const UIGroup = layer.UIElements as Group;
          // UIGroup.bringObjectToFront(UIGroup);
          canvas.bringObjectToFront(UIGroup);
          // set other layers' UIElements invisible
          layerManager.getLayers().filter(l => l.id !== layer.id).forEach(l => {
            l.UIElements.set({
              visible: false,
            });
          });
        } else {
          console.warn("No corresponding layer found for the selected object.");
        }
      };

      const handleMouseDown = (event: any) => {
        const pointer = canvas.getPointer(event.e);
        
        if (layerManager.activeTool === 'select') {
          const target = canvas.findTarget(event.e);
          if (target) {
            const layer = layerManager.getLayers().find(layer => layer.fabricObject === target);
            if (layer) {
              // setSelectedLayerId(layer.id);
              setSelectedLayer(layer);
            }
          } else {
            canvas.discardActiveObject();
            // setSelectedLayerId(null);
            setSelectedLayer(null);
          }
        } else {
          layerManager.addLayerWithMouse(pointer.x, pointer.y);
        }
      };

      const handleObjectMoving = (event: any) => {
        var x = event.e.movementX;
        var y = event.e.movementY;
        const movingObject = event.target;
        console.log('Object moving:', movingObject);
        
        // Apply snap to grid if enabled
        const gridConfig = canvasManager.getGridConfig();
        const movingObjects = movingObject.getObjects ? movingObject.getObjects() : (movingObject as any)._objects;
        
        if (gridConfig.snapToGrid && movingObjects) {
          movingObjects.forEach((obj: FabricObject) => {
            const layer = layerManager.getLayerByFabricObject(obj);
            if (layer?.UIElements) {
              const snappedLeft = canvasManager.snapToGrid(obj.left || 0);
              const snappedTop = canvasManager.snapToGrid(obj.top || 0);
              
              layer.UIElements.set({
                left: layer.UIElements.left + (snappedLeft - obj.left),
                top: layer.UIElements.top + (snappedTop - obj.top)
              });
              
              obj.set({ left: snappedLeft, top: snappedTop });
              layer.UIElements.setCoords();
              canvas.renderAll();
            }
          });
        }
        else if (gridConfig.snapToGrid) {
          const layer = layerManager.getLayerByFabricObject(movingObject);

          if (layer?.UIElements) {
            const snappedLeft = canvasManager.snapToGrid(movingObject.left || 0);
            const snappedTop = canvasManager.snapToGrid(movingObject.top || 0);
            
            layer.UIElements.set({
              left: layer.UIElements.left + (snappedLeft - movingObject.left),
              top: layer.UIElements.top + (snappedTop - movingObject.top)
            });
            
            movingObject.set({ left: snappedLeft, top: snappedTop });
            layer.UIElements.setCoords();
            canvas.renderAll();
          }
        }
        else {
          // No snap, just normal move
          const movingObjects = movingObject.getObjects ? movingObject.getObjects() : (movingObject as any)._objects;
          if (movingObjects) {
            console.log('Multiple objects moving');
            movingObjects.forEach((obj: FabricObject) => {
              const layer = layerManager.getLayerByFabricObject(obj);
              if (layer?.UIElements) {
                layer.UIElements.set({
                  left: layer.UIElements.left + x,
                  top: layer.UIElements.top + y
                });
                layer.UIElements.setCoords();
                canvas.renderAll();
              }
            });
          }
          else {
            const layer = layerManager.getLayerByFabricObject(movingObject);

            if (layer?.UIElements) {
              // Update UIElements position to match the fabric object
              layer.UIElements.set({
                left: layer.UIElements.left + x,
                top: layer.UIElements.top + y
              });
              layer.UIElements.setCoords();
              canvas.renderAll();
            }
          }
        }
      };

      const handleObjectMovingStart = (event: any) => {
        const movingObject = event.target;
        const layer = layerManager.getLayerByFabricObject(movingObject);
        if (layer) {
          moveStartPositionsRef.current.set(layer.id, {
            left: movingObject.left || 0,
            top: movingObject.top || 0,
          });
        }
      };

      const handleObjectMovingEnd = (event: any) => {
        const movingObject = event.target;
        const layer = layerManager.getLayerByFabricObject(movingObject);
        if (layer) {
          const startPos = moveStartPositionsRef.current.get(layer.id);
          if (startPos) {
            const endPos = {
              left: movingObject.left || 0,
              top: movingObject.top || 0,
            };
            
            // Only create command if position actually changed
            if (startPos.left !== endPos.left || startPos.top !== endPos.top) {
              const command = new MoveLayerCommand(
                layer.id,
                startPos.left,
                startPos.top,
                endPos.left,
                endPos.top
              );
              UndoRedoManager.getInstance().execute(command);
            }
            moveStartPositionsRef.current.delete(layer.id);
          }
        }
      };

      const handleObjectScalingStart = (event: any) => {
        const target = event.target;
        const layer = layerManager.getLayerByFabricObject(target);
        if (layer) {
          resizeStartScalesRef.current.set(layer.id, {
            scaleX: target.scaleX || 1,
            scaleY: target.scaleY || 1,
          });
        }
      };

      const handleObjectScalingEnd = (event: any) => {
        const target = event.target;
        const layer = layerManager.getLayerByFabricObject(target);
        if (layer) {
          const startScale = resizeStartScalesRef.current.get(layer.id);
          if (startScale) {
            const endScale = {
              scaleX: target.scaleX || 1,
              scaleY: target.scaleY || 1,
            };
            
            // Only create command if scale actually changed
            if (startScale.scaleX !== endScale.scaleX || startScale.scaleY !== endScale.scaleY) {
              const command = new ResizeLayerCommand(
                layer.id,
                startScale.scaleX,
                startScale.scaleY,
                endScale.scaleX,
                endScale.scaleY
              );
              UndoRedoManager.getInstance().execute(command);
            }
            resizeStartScalesRef.current.delete(layer.id);
          }
        }
      };

      const handleObjectRotatingStart = (event: any) => {
        const target = event.target;
        const layer = layerManager.getLayerByFabricObject(target);
        if (layer) {
          rotationStartAngleRef.current.set(layer.id, target.angle || 0);
        }
      };

      const handleObjectRotatingEnd = (event: any) => {
        const target = event.target;
        const layer = layerManager.getLayerByFabricObject(target);
        if (layer) {
          const startAngle = rotationStartAngleRef.current.get(layer.id);
          if (startAngle !== undefined) {
            const endAngle = target.angle || 0;
            
            // Only create command if angle actually changed
            if (startAngle !== endAngle) {
              const command = new RotateLayerCommand(layer.id, startAngle, endAngle);
              UndoRedoManager.getInstance().execute(command);
            }
            rotationStartAngleRef.current.delete(layer.id);
          }
        }
      };

      const handleResize = () => {
        // Only resize if the canvas element is visible and has dimensions
        const canvasEl = canvas.getElement();
        if (!canvasEl || canvasEl.offsetParent === null) return;
        
        const newWidth = window.innerWidth - 500;
        const newHeight = window.innerHeight - 7;
        
        // Avoid unnecessary resize if dimensions haven't actually changed
        const currentWidth = canvas.getWidth();
        const currentHeight = canvas.getHeight();
        if (Math.abs(currentWidth - newWidth) < 5 && Math.abs(currentHeight - newHeight) < 5) return;
        
        canvas.setWidth(newWidth);
        canvas.setHeight(newHeight);
        setCanvasSize({ width: newWidth, height: newHeight });

        // Recenter the viewport
        canvas.viewportTransform = [1, 0, 0, 1, newWidth / 2, newHeight / 2];

        // Update origin lines length
        if (originLinesRef.current) {
          originLinesRef.current.xAxis.set({ x1: -newWidth, x2: newWidth });
          originLinesRef.current.yAxis.set({ y1: -newHeight, y2: newHeight });
        }

        canvas.renderAll();
      };
    
      // Zoom with mouse wheel
      const handleMouseWheel = (opt: any) => {
        const event = opt.e;
        const delta = event.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        
        if (zoom > 5) zoom = 5;
        if (zoom < 0.1) zoom = 0.1;
        
        canvas.zoomToPoint(new fabric.Point(event.offsetX, event.offsetY), zoom);
        
        // Update grid if visible
        canvasManager.refreshGrid();
        
        opt.e.preventDefault();
        opt.e.stopPropagation();
      };

      window.addEventListener('resize', handleResize);
      canvas.on('selection:created', handleSelectionEvent);
      canvas.on('selection:updated', handleSelectionEvent);
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('object:moving', handleObjectMoving);
      canvas.on('object:moving', handleObjectMovingStart);
      canvas.on('object:moving', handleObjectMovingEnd);
      canvas.on('object:scaling', handleObjectScalingStart);
      canvas.on('object:scaling', handleObjectScalingEnd);
      canvas.on('object:rotating', handleObjectRotatingStart);
      canvas.on('object:rotating', handleObjectRotatingEnd);
      canvas.on('mouse:wheel', handleMouseWheel);

      // Keyboard shortcuts for Undo/Redo
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'z') {
          e.preventDefault();
          UndoRedoManager.getInstance().undo();
        } else if (e.ctrlKey && e.key === 'y') {
          e.preventDefault();
          UndoRedoManager.getInstance().redo();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        canvas.off('selection:created', handleSelectionEvent);
        canvas.off('selection:updated', handleSelectionEvent);
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('object:moving', handleObjectMoving);
        canvas.off('object:moving', handleObjectMovingStart);
        canvas.off('object:moving', handleObjectMovingEnd);
        canvas.off('object:scaling', handleObjectScalingStart);
        canvas.off('object:scaling', handleObjectScalingEnd);
        canvas.off('object:rotating', handleObjectRotatingStart);
        canvas.off('object:rotating', handleObjectRotatingEnd);
        canvas.off('mouse:wheel', handleMouseWheel);
        canvas.dispose();
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        canvasInstanceRef.current = null;
      };
    }
  }, []);

  // Update canvas background color and origin lines when theme changes
  useEffect(() => {
    const canvas = canvasInstanceRef.current;
    if (canvas) {
      canvas.set({ backgroundColor: cssVariableToHex('--card') });
      
      // Update origin line colors based on theme
      if (originLinesRef.current) {
        originLinesRef.current.xAxis.set({
          stroke: theme === 'dark' ? 'rgba(255, 100, 100, 0.3)' : 'rgba(255, 0, 0, 0.3)',
        });
        originLinesRef.current.yAxis.set({
          stroke: theme === 'dark' ? 'rgba(100, 255, 100, 0.3)' : 'rgba(0, 255, 0, 0.3)',
        });
      }
      
      canvas.renderAll();
    }
  }, [theme]);

  return (
    <div className="flex items-center justify-center bg-card h-full overflow-auto">
      <div className="max-h-full max-w-full" style={{ maxHeight: 'calc(100vh - 7px)',maxWidth: 'calc(100vw - 500px)' }}>
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default CanvasRenderer;