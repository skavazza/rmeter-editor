import React, { useEffect, useState } from 'react';
import { useLayerContext } from '@/context/LayerContext';
import { layerManager } from '@/services/LayerManager';
import PropertyInput from '../customUI/PropertyInput';
import { SidebarGroup, SidebarGroupLabel, SidebarSeparator } from '../ui/sidebar';
import { LayoutGrid, Eye, EyeOff, Zap, Layers } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

import CollapsibleSidebarGroup from './CollapsibleSidebarGroup';

const CommonProperties: React.FC = () => {
    const { selectedLayer } = useLayerContext();
    const selectedLayerId = selectedLayer?.id;
    const [props, setProps] = useState({
        x: '0',
        y: '0',
        w: '0',
        h: '0',
        meterStyle: '',
        group: '',
        hidden: false,
        antiAlias: true,
    });

    useEffect(() => {
        if (!selectedLayerId) return;
        const layer = layerManager.getLayers().find(l => l.id === selectedLayerId);
        if (!layer) return;

        const obj = layer.fabricObject;
        const rainmeterProps: Record<string, string> = {};
        layer.properties?.forEach(p => rainmeterProps[p.property.toLowerCase()] = p.value);

        setProps({
            x: Math.round(obj.left || 0).toString(),
            y: Math.round(obj.top || 0).toString(),
            w: Math.round((obj.width || 0) * (obj.scaleX || 1)).toString(),
            h: Math.round((obj.height || 0) * (obj.scaleY || 1)).toString(),
            meterStyle: rainmeterProps['meterstyle'] || '',
            group: rainmeterProps['group'] || '',
            hidden: rainmeterProps['hidden'] === '1' || !layer.visible,
            antiAlias: rainmeterProps['antialias'] !== '0',
        });

        const canvas = layerManager.getCanvas();
        const updateFromCanvas = () => {
            setProps(prev => ({
                ...prev,
                x: Math.round(obj.left || 0).toString(),
                y: Math.round(obj.top || 0).toString(),
                w: Math.round((obj.width || 0) * (obj.scaleX || 1)).toString(),
                h: Math.round((obj.height || 0) * (obj.scaleY || 1)).toString(),
            }));
        };

        if (canvas) {
            canvas.on('object:moving', updateFromCanvas);
            canvas.on('object:scaling', updateFromCanvas);
        }

        return () => {
            if (canvas) {
                canvas.off('object:moving', updateFromCanvas);
                canvas.off('object:scaling', updateFromCanvas);
            }
        };
    }, [selectedLayerId]);

    const updateCommonProperty = (key: string, value: string | boolean) => {
        if (!selectedLayerId) return;
        const layer = layerManager.getLayers().find(l => l.id === selectedLayerId);
        if (!layer) return;

        const obj = layer.fabricObject;
        const canvas = layerManager.getCanvas();

        if (key === 'x') obj.set({ left: Number(value) });
        if (key === 'y') obj.set({ top: Number(value) });
        if (key === 'w') obj.set({ scaleX: Number(value) / (obj.width || 1) });
        if (key === 'h') obj.set({ scaleY: Number(value) / (obj.height || 1) });

        // Update layer properties array
        let rainmeterValue = value.toString();
        if (typeof value === 'boolean') {
            if (key === 'hidden') rainmeterValue = value ? '1' : '0';
            if (key === 'antiAlias') rainmeterValue = value ? '1' : '0';
        }

        let propKey = key.charAt(0).toUpperCase() + key.slice(1);
        if (key === 'meterStyle') propKey = 'MeterStyle';
        if (key === 'antiAlias') propKey = 'AntiAlias';
        
        if (!layer.properties) layer.properties = [];
        const propIndex = layer.properties.findIndex(p => p.property.toLowerCase() === propKey.toLowerCase());
        if (propIndex !== -1) {
            layer.properties[propIndex].value = rainmeterValue;
        } else {
            layer.properties.push({ property: propKey, value: rainmeterValue });
        }

        if (key === 'hidden') {
            layer.visible = !value;
            obj.set({ visible: !value });
        }

        setProps(prev => ({ ...prev, [key]: value }));
        obj.setCoords();
        canvas?.renderAll();
    };

    return (
        <>
            <CollapsibleSidebarGroup 
                label="Transform & General" 
                icon={<LayoutGrid className="h-4 w-4" />}
            >
                <div className="grid grid-cols-2 gap-2 px-3 py-2">
                    <PropertyInput id="common-x" label="X" value={props.x} onChange={v => updateCommonProperty('x', v)} />
                    <PropertyInput id="common-y" label="Y" value={props.y} onChange={v => updateCommonProperty('y', v)} />
                    <PropertyInput id="common-w" label="W" value={props.w} onChange={v => updateCommonProperty('w', v)} />
                    <PropertyInput id="common-h" label="H" value={props.h} onChange={v => updateCommonProperty('h', v)} />
                </div>
                <div className="flex flex-col gap-2 px-3 py-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="common-meterstyle" className="text-[10px] uppercase font-bold text-muted-foreground ml-1">MeterStyle</Label>
                        <div className="flex items-center space-x-2 border rounded-md px-2 h-8 bg-background/50">
                            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                            <input 
                                id="common-meterstyle"
                                className="flex-1 bg-transparent border-none text-xs focus:outline-none"
                                value={props.meterStyle}
                                onChange={e => updateCommonProperty('meterStyle', e.target.value)}
                                placeholder="Style1 | Style2"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="common-group" className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Group</Label>
                        <div className="flex items-center space-x-2 border rounded-md px-2 h-8 bg-background/50">
                            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                            <input 
                                id="common-group"
                                className="flex-1 bg-transparent border-none text-xs focus:outline-none"
                                value={props.group}
                                onChange={e => updateCommonProperty('group', e.target.value)}
                                placeholder="Group Name"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="common-hidden" checked={props.hidden} onCheckedChange={v => updateCommonProperty('hidden', !!v)} />
                        <Label htmlFor="common-hidden" className="text-xs flex items-center gap-1 cursor-pointer">
                            {props.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            Hidden
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="common-antialias" checked={props.antiAlias} onCheckedChange={v => updateCommonProperty('antiAlias', !!v)} />
                        <Label htmlFor="common-antialias" className="text-xs cursor-pointer">AntiAlias</Label>
                    </div>
                </div>
            </CollapsibleSidebarGroup>
            <SidebarSeparator />
        </>
    );
};

export default CommonProperties;
