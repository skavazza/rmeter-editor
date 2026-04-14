import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { layerManager } from '@/services/LayerManager';
import { localFontManager } from '@/services/LocalFontManager';
import { useLayerContext } from '@/context/LayerContext';
import { IText } from 'fabric';
import { SingleFontLoad } from '@/services/singleFontLoad';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SidebarSeparator } from '../ui/sidebar';
import PropertyInput from '../customUI/PropertyInput';
import { Axis3D, Blend, Type } from 'lucide-react';
import { Button } from '../ui/button';
import { open } from '@tauri-apps/plugin-dialog';
import { basename, join, resourceDir } from '@tauri-apps/api/path';
import { copyFile } from '@tauri-apps/plugin-fs';
import CommonProperties from './CommonProperties';
import CollapsibleSidebarGroup from './CollapsibleSidebarGroup';

const TextLayerProperties: React.FC = () => {

    const canvas = layerManager.getCanvas();
    const { selectedLayer } = useLayerContext();
    const selectedLayerId = selectedLayer?.id;

    const [measureType, setMeasureType] = useState<string>('custom-text');
    const [category, setCategory] = useState<string>('');

    const [textLayerProperties, setTextLayerProperties] = useState({
        rotation: '',
        color: '#000000',
        font: 'Arial',
        measure: 'custom-text',
        fontSize: '12',
        opacity: '1', 
    });
    const [systemFonts, setSystemFonts] = useState<string[]>([]);

    const getMeasureTypeAndCategory = (measure: string) => {
        if (measure === 'custom-text') {
          return { type: 'custom-text', category: '' };
        }
    
        if (measure.startsWith('time-')) {
          return { type: 'time-date', category: 'time' };
        }
    
        if (measure.startsWith('date-')) {
          return { type: 'time-date', category: 'date' };
        }
    
        if (measure.startsWith('cpu-')) {
          return { type: 'cpu', category: measure };
        }
    
        if (measure.startsWith('disk-')) {
          return { type: 'disk', category: measure };
        }
    
        return { type: 'custom-text', category: '' };
    };

    const loadFonts = async () => {
        try {
            const fonts = await localFontManager.scanLocalFonts();
            const validFonts = fonts
                .filter(font => font && font.name)
                .map(font => font.name);
            setSystemFonts(validFonts);
        } catch (error) {
            console.error('Error loading fonts:', error);
        }
    };

    useEffect(() => {
        loadFonts();
    }, []);

    useEffect(() => {
        const layer = layerManager.getLayers().find(layer => layer.id === selectedLayerId);
        const updateLayerProperties = () => {
            if (layer && layer.type === 'text') {
                const { type, category: newCategory } = getMeasureTypeAndCategory(layer.measure || 'custom-text');
                const textLayer = layer.fabricObject as IText;
                setTextLayerProperties({
                    rotation: Math.round(textLayer.angle || 0).toString(),
                    color: (textLayer.fill as string === 'black') ? '#000000' : textLayer.fill as string || '#000000',
                    font: textLayer.fontFamily,
                    fontSize: textLayer.fontSize.toString(),
                    opacity: textLayer.opacity.toString(),
                    measure: layer.measure || 'custom-text',
                });
                setMeasureType(type);
                setCategory(newCategory);
            }
        }
        updateLayerProperties();

        if (canvas) {
            canvas.on('selection:created', updateLayerProperties);
            canvas.on('selection:updated', updateLayerProperties);
            canvas.on('object:modified', updateLayerProperties);
            canvas.on('object:added', updateLayerProperties);
            canvas.on('object:moving', updateLayerProperties);
        }

        return () => {
            if (canvas) {
                canvas.off('selection:created', updateLayerProperties);
                canvas.off('selection:updated', updateLayerProperties);
                canvas.off('object:modified', updateLayerProperties);
                canvas.off('object:added', updateLayerProperties);
                canvas.off('object:moving', updateLayerProperties);
            }
        }
        
    }, [selectedLayerId]);

    const handleInputChange = async (field: keyof typeof textLayerProperties, value: string) => {
        setTextLayerProperties(prev => ({ ...prev, [field]: value }));
        if (selectedLayerId) {
            const layer = layerManager.getLayers().find(layer => layer.id === selectedLayerId);
            if (layer && layer.type === 'text') {
                const textLayer = layer.fabricObject as IText;
                if (field === 'rotation') {
                    textLayer.set({ angle: Number(value) });
                }
                if (field === 'color') {
                    textLayer.set({ fill: value });
                }
                if (field === 'font') {
                    await SingleFontLoad(value);
                    layerManager.updateFontForSelectedLayer(value);
                }
                if (field === 'fontSize') {
                    textLayer.set({ fontSize: Number(value) });
                }
                if (field === 'opacity') {
                    textLayer.set({ opacity: Number(value) });
                }
                if (field === 'measure') {
                    layerManager.updateMeasureForSelectedLayer(value);
                }
                textLayer.setCoords();
                canvas?.renderAll();
            }
        }
    };

    const handleMeasureTypeChange = (value: string) => {
        setMeasureType(value);
        if (value === 'time-date') {
            setCategory('time');
            handleInputChange('measure', 'time-hour-minute-24');
        } else if (value === 'cpu') {
            setCategory('cpu');
            handleInputChange('measure', 'cpu-average');
        } else if (value === 'disk') {
            setCategory('disk');
            handleInputChange('measure', 'disk-c-label');
        } else {
            setCategory('');
            handleInputChange('measure', 'custom-text');
        }
    }

    const handleCategorychange = (value: string) => {
        setCategory(value);
        if (value === 'time') {
            handleInputChange('measure', 'time-hour-minute-24');
        } else if (value === 'date') {
            handleInputChange('measure', 'date-yyyy-mm-dd');
        }
    }

    const handleFontUpload = async () => {
        try {
            const selectedFile = await open({
                multiple: true,
                directory: false,
                filters: [
                    { name: 'Fonts', extensions: ['ttf', 'otf'] }
                ]
            });

            if (!selectedFile) return;

            const fontPath = await resourceDir() + `/_up_/public/fonts/`;
            const files = Array.isArray(selectedFile) ? selectedFile : [selectedFile];
            
            const fontUploadPromises = files.map(async (path: string) => {
                try {
                    const fontName = await basename(path);
                    if (!fontName) return;
                    const newPath = await join(fontPath, fontName);
                    await copyFile(path, newPath);
                } catch (error) {
                    console.error(`Error processing font ${path}:`, error);
                }
            });

            await Promise.all(fontUploadPromises);
            await loadFonts();
            setSystemFonts(prev => [...prev]);
        } catch (error) {
            console.error('Error in handleFontUpload:', error);
        }
    };

    return (
        <div className="flex flex-col gap-0">
            <CommonProperties />
            
            <CollapsibleSidebarGroup 
                label="Typography" 
                icon={<Type className="h-4 w-4" />}
            >
                <div className="space-y-4 px-3 py-2">
                    <div className="flex flex-col gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleFontUpload}
                            className="h-8 text-[10px] uppercase font-bold bg-background/50"
                        >
                            Add Your Font File(s)
                        </Button>
                        
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Font Family</Label>
                            <Select
                                value={textLayerProperties.font}
                                onValueChange={handleInputChange.bind(null, 'font') as any}
                            >
                                <SelectTrigger className='h-8 shadow-none bg-background/50 text-xs'>
                                    <SelectValue placeholder="Select Font" />
                                </SelectTrigger>
                                <SelectContent>
                                    {systemFonts.map(font => (
                                        <SelectItem key={font} value={font}>{font}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Font Size</Label>
                                <PropertyInput 
                                    id='text-font-size' 
                                    label='Size' 
                                    icon={Type}
                                    value={textLayerProperties.fontSize} 
                                    onChange={value => handleInputChange('fontSize', value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Rotation</Label>
                                <PropertyInput 
                                    id='text-rotation' 
                                    label='Rotation'
                                    icon={Axis3D}
                                    value={textLayerProperties.rotation} 
                                    onChange={value => handleInputChange('rotation', value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleSidebarGroup>

            <SidebarSeparator />

            <CollapsibleSidebarGroup 
                label="Color & Style" 
                icon={<Blend className="h-4 w-4" />}
            >
                <div className="space-y-4 px-3 py-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Color</Label>
                        <div className='flex gap-2'>
                            <div className="flex-1 flex items-center rounded-md border border-input px-2 h-8 bg-background/50">
                                <Input
                                    id="text-color"
                                    type="color"
                                    className="w-4 h-4 p-0 border-none bg-transparent focus-visible:ring-0"
                                    value={textLayerProperties.color}
                                    onChange={e => handleInputChange('color', e.target.value)}
                                />
                                <span className="text-xs ml-2 font-mono">{textLayerProperties.color.toUpperCase()}</span>
                            </div>
                            <div className="relative flex items-center w-24">
                                <PropertyInput 
                                    id='text-opacity' 
                                    label='Opacity'
                                    icon={Blend} 
                                    value={(Math.round(Number(textLayerProperties.opacity) * 100)).toString()}
                                    onChange={value => handleInputChange('opacity', (Number(value) / 100).toString())}
                                    className="w-full"
                                />
                                <span className="absolute right-2 text-[10px] text-muted-foreground">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleSidebarGroup>

            <SidebarSeparator />

            <CollapsibleSidebarGroup label="Measure Configuration">
                <div className="space-y-3 px-3 py-2">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Measure Type</Label>
                        <Select
                            value={measureType}
                            onValueChange={handleMeasureTypeChange}
                        >
                            <SelectTrigger className='h-8 shadow-none bg-background/50 text-xs'>
                                <SelectValue placeholder="Custom Text" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='custom-text'>Custom Text</SelectItem>
                                <SelectItem value='time-date'>Time/Date</SelectItem>
                                <SelectItem value="cpu">CPU</SelectItem>
                                <SelectItem value="disk">Disk</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {measureType === 'time-date' && (
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Category</Label>
                            <Select value={category} onValueChange={handleCategorychange}>
                                <SelectTrigger className='h-8 shadow-none bg-background/50 text-xs'>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='time'>Time</SelectItem>
                                    <SelectItem value='date'>Date</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {measureType !== 'custom-text' && (
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Specific Measure</Label>
                            <Select
                                value={textLayerProperties.measure}
                                onValueChange={handleInputChange.bind(null, 'measure') as any}
                            >
                                <SelectTrigger className='h-8 shadow-none bg-background/50 text-xs'>
                                    <SelectValue placeholder="Select Measure" />
                                </SelectTrigger>
                                <SelectContent>
                                    {measureType === 'time-date' && category === 'time' && (
                                        <>
                                            <SelectItem value="time-hour-minute-24">15:15 (24 hr)</SelectItem>
                                            <SelectItem value="time-hour-minute-12">03:15 PM (12 hr)</SelectItem>
                                            <SelectItem value="time-hour-24">15 (Hour 24 hr)</SelectItem>
                                            <SelectItem value="time-hour-12">03 (Hour 12 hr)</SelectItem>
                                            <SelectItem value="time-minute">30 (Minute)</SelectItem>
                                            <SelectItem value="time-second">45 (Second)</SelectItem>
                                            <SelectItem value="time-am-pm">AM / PM</SelectItem>
                                        </>
                                    )}
                                    {measureType === 'time-date' && category === 'date' && (
                                        <>
                                            <SelectItem value="date-yyyy-mm-dd">2025-01-01</SelectItem>
                                            <SelectItem value="date-mm-dd-yy">01/01/25</SelectItem>
                                            <SelectItem value="date-month-number">01 (Month #)</SelectItem>
                                            <SelectItem value="date-month-full">January</SelectItem>
                                            <SelectItem value="date-month-short">Jan</SelectItem>
                                            <SelectItem value="date-day-number">01 (Day #)</SelectItem>
                                            <SelectItem value="date-day-full">Monday</SelectItem>
                                            <SelectItem value="date-day-short">Mon</SelectItem>
                                            <SelectItem value="date-year-short">25</SelectItem>
                                            <SelectItem value="date-year-full">2025</SelectItem>
                                        </>
                                    )}
                                    {measureType === 'cpu' && (
                                        <>
                                            <SelectItem value="cpu-average">Average Usage</SelectItem>
                                            <SelectItem value="cpu-core-1">Core 1</SelectItem>
                                            <SelectItem value="cpu-core-2">Core 2</SelectItem>
                                            <SelectItem value="cpu-core-3">Core 3</SelectItem>
                                            <SelectItem value="cpu-core-4">Core 4</SelectItem>
                                        </>
                                    )}
                                    {measureType === 'disk' && (
                                        <>
                                            <SelectItem value="disk-c-label">Disk C Label</SelectItem>
                                            <SelectItem value="disk-c-total-space">Total Space</SelectItem>
                                            <SelectItem value="disk-c-free-space">Free Space</SelectItem>
                                            <SelectItem value="disk-c-used-space">Used Space</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </CollapsibleSidebarGroup>
        </div>
    );
};

export default TextLayerProperties;
