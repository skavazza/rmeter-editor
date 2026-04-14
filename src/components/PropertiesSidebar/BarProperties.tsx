import { useLayerContext } from "@/context/LayerContext";
import { layerManager } from "@/services/LayerManager";
import { Group, Rect } from "fabric";
import { useEffect, useState } from "react";
import PropertyInput from "../customUI/PropertyInput";
import { Blend, Activity } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import CommonProperties from "./CommonProperties";
import CollapsibleSidebarGroup from "./CollapsibleSidebarGroup";

const BarLayerProperties: React.FC = () => {

    const canvas = layerManager.getCanvas();
    const { selectedLayer } = useLayerContext();
    const selectedLayerId = selectedLayer?.id;

    const [barLayerProperties, setBarLayerProperties] = useState({
        backgroundFill: '',
        backgroundOpacity: '',
        foregroundFill: '',
        foregroundOpacity: '',
        measure: 'bar-cpu',
    });

    useEffect(() => {
        const layer = layerManager.getLayers().find(layer => layer.id === selectedLayerId);
        const updateLayerProperties = () => {
            if (layer && layer.type === 'bar') {
                if (layer.measure === '') {
                    layer.measure = 'bar-cpu';
                }
                const measure = layer.measure || 'bar-cpu';
                const barGroup = layer.fabricObject as Group;
                const objects = barGroup.getObjects ? barGroup.getObjects() : (barGroup as any)._objects;
                
                if (!objects || objects.length < 2) {
                    console.warn('Bar layer fabric group doesn\'t have the expected internal objects yet');
                    return;
                }

                const background = objects[0] as Rect;
                const foreground = objects[1] as Rect;

                setBarLayerProperties({
                    backgroundFill: background.fill?.toString() || '#000000',
                    backgroundOpacity: background.opacity?.toString() || '1',
                    foregroundFill: foreground.fill?.toString() || '#000000',
                    foregroundOpacity: foreground.opacity?.toString() || '1',
                    measure: measure,
                });
            }
        }
        updateLayerProperties();

        if (canvas) {
            canvas.on('selection:created', updateLayerProperties);
            canvas.on('selection:updated', updateLayerProperties);
            canvas.on('object:modified', updateLayerProperties);
            canvas.on('object:added', updateLayerProperties);
        }

        return () => {
            if (canvas) {
                canvas.off('selection:created', updateLayerProperties);
                canvas.off('selection:updated', updateLayerProperties);
                canvas.off('object:modified', updateLayerProperties);
                canvas.off('object:added', updateLayerProperties);
            }
        }
    }, [selectedLayerId]);

    const handleInputChange = (field: keyof typeof barLayerProperties, value: string) => {
        if (selectedLayerId) {
            const layer = layerManager.getLayers().find(layer => layer.id === selectedLayerId);
            if (layer && layer.type === 'bar') {
                const bar = layer.fabricObject as Group;
                const objects = bar.getObjects ? bar.getObjects() : (bar as any)._objects;
                
                if (!objects || objects.length < 2) return;

                const background = objects[0] as Rect;
                const foreground = objects[1] as Rect;

                if (field === 'backgroundFill') {
                    background.set({ fill: value });
                }
                if (field === 'backgroundOpacity') {
                    background.set({ opacity: Number(value) });
                }
                if (field === 'foregroundFill') {
                    foreground.set({ fill: value });
                }
                if (field === 'foregroundOpacity') {
                    foreground.set({ opacity: Number(value) });
                }
                if (field === 'measure') {
                    layerManager.updateMeasureForSelectedLayer(value);
                }

                setBarLayerProperties(prev => ({ ...prev, [field]: value }));

                bar.setCoords();
                canvas?.renderAll();
            }
        }
    }

    return(
        <div className="flex flex-col gap-0">
            <CommonProperties />
            
            <CollapsibleSidebarGroup 
                label="Bar Properties" 
                icon={<Activity className="h-4 w-4" />}
            >
                <div className="space-y-4 px-3 py-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Foreground</Label>
                        <div className='flex gap-2'>
                            <div className="flex-1 flex items-center rounded-md border border-input px-2 h-8 bg-background/50">
                                <Input
                                    id="bar-foreground-color"
                                    type="color"
                                    className="w-4 h-4 p-0 border-none bg-transparent focus-visible:ring-0"
                                    value={barLayerProperties.foregroundFill}
                                    onChange={e => handleInputChange('foregroundFill', e.target.value)}
                                />
                                <span className="text-xs ml-2 font-mono">{barLayerProperties.foregroundFill.toUpperCase()}</span>
                            </div>
                            <div className="relative flex items-center w-24">
                                <PropertyInput 
                                    id='bar-foreground-opacity' 
                                    label='Opacity'
                                    icon={Blend} 
                                    value={(Math.round(Number(barLayerProperties.foregroundOpacity) * 100)).toString()}
                                    onChange={value => handleInputChange('foregroundOpacity', (Number(value) / 100).toString())}
                                    className="w-full"
                                />
                                <span className="absolute right-2 text-[10px] text-muted-foreground">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Background</Label>
                        <div className='flex gap-2'>
                            <div className="flex-1 flex items-center rounded-md border border-input px-2 h-8 bg-background/50">
                                <Input
                                    id="bar-background-color"
                                    type="color"
                                    className="w-4 h-4 p-0 border-none bg-transparent focus-visible:ring-0"
                                    value={barLayerProperties.backgroundFill}
                                    onChange={e => handleInputChange('backgroundFill', e.target.value)}
                                />
                                <span className="text-xs ml-2 font-mono">{barLayerProperties.backgroundFill.toUpperCase()}</span>
                            </div>
                            <div className="relative flex items-center w-24">
                                <PropertyInput 
                                    id='bar-background-opacity' 
                                    label='Opacity'
                                    icon={Blend} 
                                    value={(Math.round(Number(barLayerProperties.backgroundOpacity) * 100)).toString()}
                                    onChange={value => handleInputChange('backgroundOpacity', (Number(value) / 100).toString())}
                                    className="w-full"
                                />
                                <span className="absolute right-2 text-[10px] text-muted-foreground">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Measure</Label>
                        <Select
                            value={barLayerProperties.measure}
                            onValueChange={handleInputChange.bind(null, 'measure') as any}
                        >
                            <SelectTrigger id="bar-measure-select" className='h-8 shadow-none bg-background/50'>
                                <SelectValue placeholder="Select Bar Measure" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bar-cpu">CPU</SelectItem>
                                <SelectItem value="bar-disk">Disk</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CollapsibleSidebarGroup>
        </div>
    )
}

export default BarLayerProperties;
