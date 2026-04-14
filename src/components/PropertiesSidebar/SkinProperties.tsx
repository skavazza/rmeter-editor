import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { layerManager } from '@/services/LayerManager';
import { Group, Rect } from 'fabric';
import { SidebarGroup, SidebarGroupLabel, SidebarSeparator } from '../ui/sidebar';
import PropertyInput from '../customUI/PropertyInput';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';

import CollapsibleSidebarGroup from './CollapsibleSidebarGroup';
import { LayoutGrid, Palette, Info, Tag } from 'lucide-react';
import { useSkinMetadata } from '@/context/SkinMetadataContext';
import UndoRedoManager from '@/services/UndoRedoManager';

const SkinProperties: React.FC = () => {
    const { metadata, updateMetadata } = useSkinMetadata();
    const canvas = layerManager.getCanvas();
    
    const [skinProperties, setSkinProperties] = useState({
        x: '',
        y: '',
        height: '',
        width: '',
        backgroundColor: '#FFFFFF',
    });

    useEffect(() => {
        const skinBackground = layerManager.getSkinBackground() as Group;
        if (!skinBackground) return;
        const objects = skinBackground.getObjects ? skinBackground.getObjects() : (skinBackground as any)._objects;
        if (!objects || objects.length === 0) return;
        const backgroundRect = objects[0] as Rect;
        const updateLayerProperties = () => {
            setSkinProperties({
                x: skinBackground.left.toString(),
                y: skinBackground.top.toString(),
                height: backgroundRect.height.toString(),
                width: backgroundRect.width.toString(),
                backgroundColor: backgroundRect.fill?.toString() || '#FFFFFF',
            })
        };
        updateLayerProperties();
        if (canvas) {
            canvas.on('object:modified', updateLayerProperties);
            canvas.on('object:moving', updateLayerProperties);
        }
        return () => {
            if (canvas) {
                canvas.off('object:modified', updateLayerProperties);
                canvas.off('object:moving', updateLayerProperties);
            }
        }
    }, [canvas]);

    const handleInputChange = (field: keyof typeof skinProperties, value: string) => {
        const skinBackground = layerManager.getSkinBackground() as Group;
        if (!skinBackground) return;
        const objects = skinBackground.getObjects ? skinBackground.getObjects() : (skinBackground as any)._objects;
        if (!objects || objects.length === 0) return;
        const backgroundRect = objects[0] as Rect;
        
        if (field === 'x') skinBackground.left = Number(value);
        if (field === 'y') skinBackground.top = Number(value);
        
        const numValue = Math.max(1, Number(value));
        if (field === 'width') {
            backgroundRect.set({ width: numValue, left: 0, top: 0 });
            skinBackground.set({ width: numValue }); 
        } 
        if (field === 'height') {
            backgroundRect.set({ height: numValue, left: 0, top: 0 });
            skinBackground.set({ height: numValue });
        }
        if (field === 'backgroundColor') {
            backgroundRect.set({ fill: value });
        }
    
        setSkinProperties(prev => ({ ...prev, [field]: value }));
        backgroundRect.setCoords();
        skinBackground.setCoords();
        canvas?.renderAll();
        
        // Notify listeners to sync code editor
        UndoRedoManager.getInstance().execute({
            name: 'Update Skin Properties',
            execute: () => {},
            undo: () => {},
            redo: () => {}
        });
    };

    const handleMetadataChange = (updates: any) => {
        updateMetadata(updates);
        // Force sync code editor
        UndoRedoManager.getInstance().execute({
            name: 'Update Metadata',
            execute: () => {},
            undo: () => {},
            redo: () => {}
        });
    };

    return (
        <div className="flex flex-col gap-0">
            <CollapsibleSidebarGroup 
                label="Skin Metadata" 
                icon={<Tag className="h-4 w-4" />}
            >
                <div className="space-y-3 px-3 py-2">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Skin Name</Label>
                        <Input 
                            value={metadata.name} 
                            onChange={e => handleMetadataChange({ name: e.target.value })}
                            className="h-8 bg-background/50 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Author</Label>
                        <Input 
                            value={metadata.author} 
                            onChange={e => handleMetadataChange({ author: e.target.value })}
                            className="h-8 bg-background/50 text-xs"
                        />
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                        <Checkbox 
                            id="skin-scroll-resize" 
                            checked={metadata.allowScrollResize} 
                            onCheckedChange={v => handleMetadataChange({ allowScrollResize: !!v })} 
                        />
                        <Label htmlFor="skin-scroll-resize" className="text-xs cursor-pointer">Allow Scroll Resize</Label>
                    </div>
                </div>
            </CollapsibleSidebarGroup>

            <SidebarSeparator />

            <CollapsibleSidebarGroup 
                label="Transform" 
                icon={<LayoutGrid className="h-4 w-4" />}
            >
                <div className="grid grid-cols-2 gap-2 px-3 py-2">
                    <PropertyInput 
                        id='skin-x' 
                        label='X' 
                        value={skinProperties.x} 
                        onChange={value => handleInputChange('x', value)}   
                    />
                    <PropertyInput 
                        id='skin-y' 
                        label='Y' 
                        value={skinProperties.y} 
                        onChange={value => handleInputChange('y', value)}
                    />
                    <PropertyInput 
                        id='skin-width' 
                        label='W' 
                        value={skinProperties.width} 
                        onChange={value => handleInputChange('width', value)}
                    />
                    <PropertyInput 
                        id='skin-height' 
                        label='H' 
                        value={skinProperties.height} 
                        onChange={value => handleInputChange('height', value)}
                    />
                </div>
            </CollapsibleSidebarGroup>

            <SidebarSeparator />

            <CollapsibleSidebarGroup 
                label="Editor Reference" 
                icon={<Palette className="h-4 w-4" />}
            >
                <div className='px-3 py-2 space-y-2'>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Background Color</Label>
                    <div className="flex items-center rounded-md border border-input px-2 h-8 bg-background/50">
                        <Input
                            id="skin-background-color"
                            type="color"
                            className="w-4 h-4 p-0 border-none bg-transparent focus-visible:ring-0"
                            value={skinProperties.backgroundColor}
                            onChange={e => handleInputChange('backgroundColor', e.target.value)}
                        />
                        <span className="text-xs ml-2 font-mono uppercase">{skinProperties.backgroundColor}</span>
                    </div>
                </div>
            </CollapsibleSidebarGroup>

            <SidebarSeparator />

            <CollapsibleSidebarGroup 
                label="Information" 
                icon={<Info className="h-4 w-4" />}
            >
                <div className="px-3 py-2">
                    <Card className='shadow-none border-none bg-muted/30 p-3'>
                        <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                            The background color in the editor is a reference for development. 
                            It helps visualize the skin against your desktop, but will be transparent in the final Rainmeter skin.
                        </p>
                    </Card>
                </div>
            </CollapsibleSidebarGroup>
        </div>
    );
};

export default SkinProperties;
