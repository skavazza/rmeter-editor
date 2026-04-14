import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { layerManager } from '@/services/LayerManager';
import { useLayerContext } from '@/context/LayerContext';
import { SidebarSeparator } from '../ui/sidebar';
import { PenTool, Palette, Minus } from 'lucide-react';
import CommonProperties from './CommonProperties';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import CollapsibleSidebarGroup from './CollapsibleSidebarGroup';

type ShapeType = 'Rectangle' | 'Ellipse' | 'Line';

const ShapeLayerProperties: React.FC = () => {
    const { selectedLayer } = useLayerContext();
    const selectedLayerId = selectedLayer?.id;

    const [shapeType, setShapeType] = useState<ShapeType>('Rectangle');
    const [params, setParams] = useState<string[]>(['0', '0', '100', '50', '0']);
    const [fillColor, setFillColor] = useState('255,255,255,150');
    const [strokeColor, setStrokeColor] = useState('255,255,255,255');
    const [strokeWidth, setStrokeWidth] = useState('1');
    const [fullString, setFullString] = useState('');

    // Sincronizar do Layer para o Estado Local
    useEffect(() => {
        if (!selectedLayerId) return;
        const layer = layerManager.getLayers().find(l => l.id === selectedLayerId);
        if (!layer) return;

        const props: Record<string, string> = {};
        layer.properties?.forEach(p => props[p.property.toLowerCase()] = p.value);

        const shapeStr = props['shape'] || '';
        setFullString(shapeStr);
        parseShapeString(shapeStr);
        
        setFillColor(props['fillcolor'] || '255,255,255,150');
        setStrokeColor(props['strokecolor'] || '255,255,255,255');
        setStrokeWidth(props['strokewidth'] || '1');
    }, [selectedLayerId]);

    const parseShapeString = (s: string) => {
        if (!s) return;
        const parts = s.split('|').map(p => p.trim());
        const mainPart = parts[0];
        const mainWords = mainPart.split(' ');
        const type = mainWords[0] as ShapeType;
        
        if (['Rectangle', 'Ellipse', 'Line'].includes(type)) {
            setShapeType(type);
            if (mainWords[1]) {
                setParams(mainWords[1].split(',').map(p => p.trim()));
            }
        }

        // Modificadores na string
        parts.slice(1).forEach(mod => {
            const lmod = mod.toLowerCase();
            if (lmod.startsWith('fill color')) setFillColor(mod.replace(/fill color/i, '').trim());
            if (lmod.startsWith('stroke color')) setStrokeColor(mod.replace(/stroke color/i, '').trim());
            if (lmod.startsWith('strokewidth')) setStrokeWidth(mod.replace(/strokewidth/i, '').trim());
        });
    };

    // Construir a string final baseada nos campos
    const constructString = (type: ShapeType, p: string[], fill: string, stroke: string, sw: string) => {
        let res = `${type} ${p.join(',')}`;
        if (fill) res += ` | Fill Color ${fill}`;
        if (stroke) res += ` | Stroke Color ${stroke}`;
        if (sw && sw !== '1') res += ` | StrokeWidth ${sw}`;
        return res;
    };

    const handleParamChange = (index: number, value: string) => {
        const newParams = [...params];
        newParams[index] = value;
        setParams(newParams);
        updateAll(shapeType, newParams, fillColor, strokeColor, strokeWidth);
    };

    const updateAll = (type: ShapeType, p: string[], fill: string, stroke: string, sw: string) => {
        const newStr = constructString(type, p, fill, stroke, sw);
        setFullString(newStr);
        
        const layer = layerManager.getLayers().find(l => l.id === selectedLayerId);
        if (layer) {
            const updates = [
                { property: 'Shape', value: newStr },
                { property: 'FillColor', value: fill },
                { property: 'StrokeColor', value: stroke },
                { property: 'StrokeWidth', value: sw }
            ];

            updates.forEach(upd => {
                const idx = layer.properties.findIndex(p => p.property.toLowerCase() === upd.property.toLowerCase());
                if (idx !== -1) layer.properties[idx].value = upd.value;
                else layer.properties.push(upd);
            });

            layerManager.getCanvas()?.renderAll();
        }
    };

    const renderParamInputs = () => {
        const specs = {
            Rectangle: ['X', 'Y', 'W', 'H', 'Radius'],
            Ellipse: ['CenterX', 'CenterY', 'RadiusX', 'RadiusY'],
            Line: ['StartX', 'StartY', 'EndX', 'EndY']
        };

        return (
            <div className="grid grid-cols-2 gap-2">
                {specs[shapeType].map((label, i) => (
                    <div key={label} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground ml-1">{label}</Label>
                        <Input 
                            value={params[i] || '0'} 
                            onChange={(e) => handleParamChange(i, e.target.value)}
                            className="h-7 text-xs bg-background/50"
                        />
                    </div>
                ))}
            </div>
        );
    };

    const rgbaToHex = (rgba: string) => {
        const parts = rgba.split(',').map(Number);
        const r = parts[0] || 0;
        const g = parts[1] || 0;
        const b = parts[2] || 0;
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const handleColorChange = (type: 'fill' | 'stroke', hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        if (type === 'fill') {
            const alpha = fillColor.split(',')[3] || '255';
            const newVal = `${r},${g},${b},${alpha}`;
            setFillColor(newVal);
            updateAll(shapeType, params, newVal, strokeColor, strokeWidth);
        } else {
            const alpha = strokeColor.split(',')[3] || '255';
            const newVal = `${r},${g},${b},${alpha}`;
            setStrokeColor(newVal);
            updateAll(shapeType, params, fillColor, newVal, strokeWidth);
        }
    };

    return (
        <div className="flex flex-col gap-0">
            <CommonProperties />

            <CollapsibleSidebarGroup 
                label="Shape Editor" 
                icon={<PenTool className="h-4 w-4" />}
            >
                <div className="space-y-4 px-3 py-2">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Type</Label>
                        <Select value={shapeType} onValueChange={(v: ShapeType) => {
                            setShapeType(v);
                            const newP = v === 'Rectangle' ? ['0','0','100','50','0'] : (v === 'Ellipse' ? ['50','50','40','40'] : ['0','0','100','100']);
                            setParams(newP);
                            updateAll(v, newP, fillColor, strokeColor, strokeWidth);
                        }}>
                            <SelectTrigger className="h-8 text-xs bg-background/50 shadow-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Rectangle">Rectangle</SelectItem>
                                <SelectItem value="Ellipse">Ellipse</SelectItem>
                                <SelectItem value="Line">Line</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {renderParamInputs()}

                    <SidebarSeparator className="my-2" />

                    <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Styling</Label>
                        
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Palette className="h-3 w-3 text-muted-foreground" />
                                <Label className="text-[11px] flex-1">Fill Color</Label>
                                <div className="flex items-center gap-1 bg-background/50 border rounded-md px-1 h-7">
                                    <input 
                                        type="color" 
                                        value={rgbaToHex(fillColor)}
                                        onChange={(e) => handleColorChange('fill', e.target.value)}
                                        className="w-4 h-4 border-none bg-transparent"
                                    />
                                    <Input 
                                        value={fillColor} 
                                        onChange={(e) => {
                                            setFillColor(e.target.value);
                                            updateAll(shapeType, params, e.target.value, strokeColor, strokeWidth);
                                        }}
                                        className="h-6 w-24 border-none bg-transparent text-[10px] font-mono p-0"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-muted-foreground rounded-sm" />
                                <Label className="text-[11px] flex-1">Stroke Color</Label>
                                <div className="flex items-center gap-1 bg-background/50 border rounded-md px-1 h-7">
                                    <input 
                                        type="color" 
                                        value={rgbaToHex(strokeColor)}
                                        onChange={(e) => handleColorChange('stroke', e.target.value)}
                                        className="w-4 h-4 border-none bg-transparent"
                                    />
                                    <Input 
                                        value={strokeColor} 
                                        onChange={(e) => {
                                            setStrokeColor(e.target.value);
                                            updateAll(shapeType, params, fillColor, e.target.value, strokeWidth);
                                        }}
                                        className="h-6 w-24 border-none bg-transparent text-[10px] font-mono p-0"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Minus className="h-3 w-3 text-muted-foreground" />
                                <Label className="text-[11px] flex-1">Stroke Width</Label>
                                <Input 
                                    type="number"
                                    value={strokeWidth}
                                    onChange={(e) => {
                                        setStrokeWidth(e.target.value);
                                        updateAll(shapeType, params, fillColor, strokeColor, e.target.value);
                                    }}
                                    className="h-7 w-12 bg-background/50 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Resulting String</Label>
                        <div className="bg-muted/30 p-2 rounded border text-[10px] font-mono break-all text-muted-foreground">
                            {fullString}
                        </div>
                    </div>
                </div>
            </CollapsibleSidebarGroup>
        </div>
    );
};

export default ShapeLayerProperties;
