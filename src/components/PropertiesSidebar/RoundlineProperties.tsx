import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { layerManager } from '@/services/LayerManager';
import { useLayerContext } from '@/context/LayerContext';
import { SidebarSeparator } from '../ui/sidebar';
import { Circle as CircleIcon } from 'lucide-react';
import CommonProperties from './CommonProperties';
import CollapsibleSidebarGroup from './CollapsibleSidebarGroup';
import { fromRainmeterColor, rainmeterToHex } from '@/lib/colorUtils';
import { Line, Circle, Group } from 'fabric';

const RoundlineLayerProperties: React.FC = () => {
    const { selectedLayer } = useLayerContext();
    const selectedLayerId = selectedLayer?.id;

    const [roundlineProperties, setRoundlineProperties] = useState({
        startAngle: '0',
        rotationAngle: '360',
        lineStart: '20',
        lineLength: '40',
        lineWidth: '4',
        lineColor: '255,255,255,255',
        solidColor: '50,50,50,180',
        measure: '',
        opacity: '1',
    });

    useEffect(() => {
        if (!selectedLayerId) return;

        const layer = layerManager.getLayers().find(l => l.id === selectedLayerId);
        if (!layer) return;

        // Load properties from layer
        const props: Record<string, string> = {};
        layer.properties?.forEach(p => {
            props[p.property.toLowerCase()] = p.value;
        });

        setRoundlineProperties(prev => ({
            ...prev,
            startAngle: props['startangle'] || '0',
            rotationAngle: props['rotationangle'] || '360',
            lineStart: props['linestart'] || '20',
            lineLength: props['linelength'] || '40',
            lineWidth: props['linewidth'] || '4',
            lineColor: props['linecolor'] || '255,255,255,255',
            solidColor: props['solidcolor'] || '50,50,50,180',
            measure: layer.measure || '',
            opacity: layer.fabricObject?.opacity?.toString() || '1',
        }));
    }, [selectedLayerId]);

    const updateProperty = (property: string, value: string) => {
        setRoundlineProperties(prev => ({ ...prev, [property]: value }));
        const layer = layerManager.getLayers().find(l => l.id === selectedLayerId);
        if (layer) {
            if (property === 'opacity') {
                layer.fabricObject.set({ opacity: Number(value) });
            } else if (property === 'measure') {
                layer.measure = value;
            } else {
                // Update properties array
                const propKey = property.charAt(0).toUpperCase() + property.slice(1);
                if (!layer.properties) layer.properties = [];
                const idx = layer.properties.findIndex(p => p.property.toLowerCase() === property.toLowerCase());
                if (idx !== -1) layer.properties[idx].value = value;
                else layer.properties.push({ property: propKey, value });
            }

            // Update Fabric object visually
            const group = layer.fabricObject as Group;
            const objects = group.getObjects ? group.getObjects() : (group as any)._objects;
            
            if (objects && objects.length >= 2) {
                const bg = objects[0] as Circle;
                const line = objects[1] as Line;

                if (property === 'lineColor') {
                    line.set({ stroke: fromRainmeterColor(value) });
                } else if (property === 'solidColor') {
                    bg.set({ stroke: fromRainmeterColor(value) });
                } else if (property === 'lineWidth') {
                    const sw = parseFloat(value) || 4;
                    bg.set({ strokeWidth: sw });
                    line.set({ strokeWidth: sw });
                }
            }

            layerManager.getCanvas()?.renderAll();
        }
    };

    const handleColorChange = (property: string, hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const currentVal = (roundlineProperties as any)[property] || '255,255,255,255';
        const alpha = currentVal.split(',')[3] || '255';
        const newVal = `${r},${g},${b},${alpha}`;
        updateProperty(property, newVal);
    };

    return (
        <div className="flex flex-col gap-0">
            <CommonProperties />

            <CollapsibleSidebarGroup 
                label="Roundline Properties" 
                icon={<CircleIcon className="h-4 w-4" />}
            >
                <div className="space-y-4 px-3 py-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Start Angle</Label>
                            <Input
                                value={roundlineProperties.startAngle}
                                onChange={(e) => updateProperty('startAngle', e.target.value)}
                                className="h-8 bg-background/50 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Rot Angle</Label>
                            <Input
                                value={roundlineProperties.rotationAngle}
                                onChange={(e) => updateProperty('rotationAngle', e.target.value)}
                                className="h-8 bg-background/50 text-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Line Start</Label>
                            <Input
                                value={roundlineProperties.lineStart}
                                onChange={(e) => updateProperty('lineStart', e.target.value)}
                                className="h-8 bg-background/50 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Line Length</Label>
                            <Input
                                value={roundlineProperties.lineLength}
                                onChange={(e) => updateProperty('lineLength', e.target.value)}
                                className="h-8 bg-background/50 text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Measure</Label>
                        <Input
                            value={roundlineProperties.measure}
                            onChange={(e) => updateProperty('measure', e.target.value)}
                            className="h-8 bg-background/50 text-xs"
                            placeholder="Measure Name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Colors (R,G,B,A)</Label>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label className="text-[9px] w-12 text-muted-foreground">Line:</Label>
                                <div className="flex-1 flex items-center rounded-md border border-input px-2 h-8 bg-background/50">
                                    <input
                                        type="color"
                                        className="w-4 h-4 p-0 border-none bg-transparent focus-visible:ring-0"
                                        value={rgbaToHex(roundlineProperties.lineColor)}
                                        onChange={(e) => handleColorChange('lineColor', e.target.value)}
                                    />
                                    <Input
                                        value={roundlineProperties.lineColor}
                                        onChange={(e) => updateProperty('lineColor', e.target.value)}
                                        className="h-7 flex-1 border-none bg-transparent text-[10px] font-mono p-0 ml-2"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-[9px] w-12 text-muted-foreground">Solid:</Label>
                                <div className="flex-1 flex items-center rounded-md border border-input px-2 h-8 bg-background/50">
                                    <input
                                        type="color"
                                        className="w-4 h-4 p-0 border-none bg-transparent focus-visible:ring-0"
                                        value={rgbaToHex(roundlineProperties.solidColor)}
                                        onChange={(e) => handleColorChange('solidColor', e.target.value)}
                                    />
                                    <Input
                                        value={roundlineProperties.solidColor}
                                        onChange={(e) => updateProperty('solidColor', e.target.value)}
                                        className="h-7 flex-1 border-none bg-transparent text-[10px] font-mono p-0 ml-2"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleSidebarGroup>
        </div>
    );
};

const rgbaToHex = (rgba: string) => {
    return rainmeterToHex(rgba);
};

export default RoundlineLayerProperties;
