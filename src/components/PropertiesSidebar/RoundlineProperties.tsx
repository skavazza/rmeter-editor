import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { layerManager } from '@/services/LayerManager';
import { useLayerContext } from '@/context/LayerContext';
import { SidebarSeparator } from '../ui/sidebar';
import { Circle } from 'lucide-react';
import CommonProperties from './CommonProperties';
import CollapsibleSidebarGroup from './CollapsibleSidebarGroup';

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
            layerManager.getCanvas()?.renderAll();
        }
    };

    return (
        <div className="flex flex-col gap-0">
            <CommonProperties />

            <CollapsibleSidebarGroup 
                label="Roundline Properties" 
                icon={<Circle className="h-4 w-4" />}
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
                                <Input
                                    value={roundlineProperties.lineColor}
                                    onChange={(e) => updateProperty('lineColor', e.target.value)}
                                    className="h-7 flex-1 bg-background/50 text-[10px] font-mono"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-[9px] w-12 text-muted-foreground">Solid:</Label>
                                <Input
                                    value={roundlineProperties.solidColor}
                                    onChange={(e) => updateProperty('solidColor', e.target.value)}
                                    className="h-7 flex-1 bg-background/50 text-[10px] font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleSidebarGroup>
        </div>
    );
};

export default RoundlineLayerProperties;
