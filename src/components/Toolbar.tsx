import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { layerManager } from '@/services/LayerManager';
import { canvasManager } from '@/services/CanvasManager';
import { 
  CircleGauge, Image, Minus, MousePointer, Type, PenTool, Circle, 
  Grid3X3, Magnet, ZoomIn, ZoomOut,
  AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Label } from './ui/label';

const Toolbar: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(10);
  const [zoom, setZoom] = useState(100);
  const [canAlign, setCanAlign] = useState(false);

  useEffect(() => {
    // Update the selected tool when it changes
    const handleToolChange = () => {
      setSelectedTool(layerManager.activeTool);
    };

    // Subscribe to tool changes
    layerManager.subscribeToToolChanges(handleToolChange);

    // Clean up the subscription when the component unmounts
    return () => {
      layerManager.unsubscribeFromToolChanges(handleToolChange);
    };
  }, []);

  useEffect(() => {
    // Sync with canvas manager grid config
    const config = canvasManager.getGridConfig();
    setShowGrid(config.showGrid);
    setSnapToGrid(config.snapToGrid);
    setGridSize(config.gridSize);
    setZoom(Math.round(canvasManager.getZoom() * 100));
  }, []);

  // Update zoom state when canvas zoom changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentZoom = Math.round(canvasManager.getZoom() * 100);
      if (currentZoom !== zoom) {
        setZoom(currentZoom);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [zoom]);

  // Handle selection changes for alignment tools
  useEffect(() => {
    const canvas = canvasManager.getCanvas();
    if (!canvas) return;

    const updateSelectionState = () => {
      const activeObject = canvas.getActiveObject();
      const isMulti = !!activeObject && (
        activeObject.type === 'activeSelection' || 
        activeObject.type === 'activeselection' ||
        activeObject.type === 'group'
      );
      setCanAlign(isMulti);
    };

    canvas.on('selection:created', updateSelectionState);
    canvas.on('selection:updated', updateSelectionState);
    canvas.on('selection:cleared', updateSelectionState);

    return () => {
      canvas.off('selection:created', updateSelectionState);
      canvas.off('selection:updated', updateSelectionState);
      canvas.off('selection:cleared', updateSelectionState);
    };
  }, []);

  const handleSelectTool = () => {
    layerManager.setActiveTool('select');
  };

  const handleAddText = () => {
    layerManager.setActiveTool('text');
  };

  const handleAddImage = () => {
    layerManager.setActiveTool('image');
  };

  const handleAddRotator = () => {
    layerManager.setActiveTool('rotator');
  };

  const handleAddBar = () => {
    layerManager.setActiveTool('bar');
  };

  const handleAddShape = () => {
    layerManager.setActiveTool('shape');
  };

  const handleAddRoundline = () => {
    layerManager.setActiveTool('roundline');
  };

  const toggleGrid = () => {
    const newState = !showGrid;
    setShowGrid(newState);
    canvasManager.setGridConfig({ showGrid: newState });
  };

  const toggleSnapToGrid = () => {
    const newState = !snapToGrid;
    setSnapToGrid(newState);
    canvasManager.setGridConfig({ snapToGrid: newState });
  };

  const handleGridSizeChange = (value: string) => {
    const newSize = parseInt(value);
    if (newSize > 0 && newSize <= 100) {
      setGridSize(newSize);
      canvasManager.setGridConfig({ gridSize: newSize });
    }
  };

  const zoomIn = () => {
    const newZoom = Math.min(500, zoom + 25);
    canvasManager.setZoom(newZoom / 100);
    setZoom(newZoom);
  };

  const zoomOut = () => {
    const newZoom = Math.max(10, zoom - 25);
    canvasManager.setZoom(newZoom / 100);
    setZoom(newZoom);
  };

  const resetZoom = () => {
    canvasManager.resetZoom();
    setZoom(100);
  };

  const isSelected = (tool: string) => selectedTool === tool;

  return (
    <TooltipProvider>
      <div className="flex items-center justify-center fixed bottom-0 left-1/2 transform -translate-x-1/2 mb-4">
        <div className="h-14 w-fit bg-sidebar-accent border rounded-xl shadow-none flex items-center justify-between px-3">

          <div className="flex items-center justify-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isSelected('select') ? 'default' : 'ghost'}
                  size="icon"
                  onClick={handleSelectTool}
                >
                  <MousePointer />
                  <span className="sr-only">Select</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Select Tool</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddText}
                  variant={isSelected('text') ? 'default' : 'ghost'}
                  size="icon"
                >
                  <Type />
                  <span className="sr-only">Text</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Text Tool</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddImage}
                  variant={isSelected('image') ? 'default' : 'ghost'}
                  size="icon"
                >
                  <Image />
                  <span className="sr-only">Image</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Image Tool</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddShape}
                  variant={isSelected('shape') ? 'default' : 'ghost'}
                  size="icon"
                >
                  <PenTool />
                  <span className="sr-only">Shape</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Shape Tool</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddRoundline}
                  variant={isSelected('roundline') ? 'default' : 'ghost'}
                  size="icon"
                >
                  <Circle />
                  <span className="sr-only">Roundline</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Roundline Tool</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddRotator}
                  variant={isSelected('rotator') ? 'default' : 'ghost'}
                  size="icon"
                >
                  <CircleGauge />
                  <span className="sr-only">Rotator</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Rotator Tool</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddBar}
                  variant={isSelected('bar') ? 'default' : 'ghost'}
                  size="icon"
                >
                  <Minus />
                  <span className="sr-only">Bar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Bar Tool</p>
              </TooltipContent>
            </Tooltip>

            <div className="h-8 w-[1px] bg-sidebar-border mx-1" />

            {/* Alignment Tools */}
            <div className="flex items-center gap-0.5 px-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canAlign}
                    onClick={() => canvasManager.alignSelected('left')}
                    className="h-9 w-9"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Left</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canAlign}
                    onClick={() => canvasManager.alignSelected('center')}
                    className="h-9 w-9"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Center (Horizontal)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canAlign}
                    onClick={() => canvasManager.alignSelected('right')}
                    className="h-9 w-9"
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Right</TooltipContent>
              </Tooltip>

              <div className="w-[1px] h-4 bg-sidebar-border mx-1 opacity-50" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canAlign}
                    onClick={() => canvasManager.alignSelected('top')}
                    className="h-9 w-9"
                  >
                    <AlignStartVertical className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Top</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canAlign}
                    onClick={() => canvasManager.alignSelected('middle')}
                    className="h-9 w-9"
                  >
                    <AlignCenterVertical className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Middle (Vertical)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canAlign}
                    onClick={() => canvasManager.alignSelected('bottom')}
                    className="h-9 w-9"
                  >
                    <AlignEndVertical className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Bottom</TooltipContent>
              </Tooltip>
            </div>

            <div className="h-8 w-[1px] bg-sidebar-border mx-1" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={zoomOut}
                    disabled={zoom <= 10}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom Out</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetZoom}
                    className="min-w-[60px] text-xs font-mono"
                  >
                    {zoom}%
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset Zoom (100%)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={zoomIn}
                    disabled={zoom >= 500}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom In</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="h-8 w-[1px] bg-sidebar-border mx-1" />

            {/* Grid Controls */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={showGrid ? 'default' : 'ghost'}
                  size="icon"
                >
                  <Grid3X3 />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem onClick={toggleGrid} className="gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  <span>Show Grid</span>
                  <span className="ml-auto">{showGrid ? '✓' : ''}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleSnapToGrid} className="gap-2">
                  <Magnet className="h-4 w-4" />
                  <span>Snap to Grid</span>
                  <span className="ml-auto">{snapToGrid ? '✓' : ''}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-2">
                  <Label className="text-xs mb-2 block">Grid Size</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={gridSize}
                    onChange={(e) => handleGridSizeChange(e.target.value)}
                    className="h-8"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Toolbar;