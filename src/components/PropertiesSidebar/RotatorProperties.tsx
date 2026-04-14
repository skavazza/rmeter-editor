import { useLayerContext } from "@/context/LayerContext";
import { layerManager } from "@/services/LayerManager";
import { Circle, FabricImage, Group } from "fabric";
import { useEffect, useState } from "react";
import PropertyInput from "../customUI/PropertyInput";
import { CircleArrowOutUpRight, RotateCw, UnfoldHorizontal, UnfoldVertical, Compass } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { open } from "@tauri-apps/plugin-dialog";
import { Label } from "../ui/label";
import CommonProperties from "./CommonProperties";
import CollapsibleSidebarGroup from "./CollapsibleSidebarGroup";

const RotatorLayerProperties: React.FC = () => {

    const canvas = layerManager.getCanvas();
    const { selectedLayer } = useLayerContext();
    const selectedLayerId = selectedLayer?.id;

    const [measureType, setMeasureType] = useState<string>('custom-text');
    const [category, setCategory] = useState<string>('');

    const [rotatorLayerProperties, setRotatorLayerProperties] = useState({
        offsetX: '',
        offsetY: '',
        rotation: '',
        startAngle: '',
        rotationAngle: '',
        source: '',
        measure: 'rotator-time-second',
    });

    const getMeasureTypeAndCategory = (measure: string) => {
        if (measure.startsWith('rotator-time-')) {
          return { type: 'time', category: '' };
        }
        if (measure.startsWith('rotator-cpu-')) {
          return { type: 'cpu', category: '' };
        }
        if (measure.startsWith('rotator-disk-')) {
          return { type: 'disk', category: '' };
        }
        return { type: 'time', category: '' };
    };

    useEffect(() => {
        const layer = layerManager.getLayers().find(layer => layer.id === selectedLayerId);
        const updateLayerProperties = () => {
            if (layer && layer.type === 'rotator') {
                const rotatorLayer = layer.fabricObject as FabricImage;
                const measure = layer.measure || 'rotator-time-second';
                const { type, category: newCategory } = getMeasureTypeAndCategory(measure);

                setRotatorLayerProperties({
                    offsetX: layer.properties.find(prop => prop.property === 'offsetX')?.value.toString() || '0',
                    offsetY: layer.properties.find(prop => prop.property === 'offsetY')?.value.toString() || '0',
                    startAngle: layer.properties.find(prop => prop.property === 'startAngle')?.value.toString() || '0',
                    rotationAngle: layer.properties.find(prop => prop.property === 'rotationAngle')?.value.toString() || '90',
                    rotation: rotatorLayer.angle?.toString() || '0',
                    source: layer.imageSrc || '',
                    measure: measure,
                })

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

    }, [selectedLayerId])

    const handleInputChange = (field: keyof typeof rotatorLayerProperties, value: string) => {
        if (selectedLayerId) {
            const layer = layerManager.getLayers().find(layer => layer.id === selectedLayerId);
            if (layer && layer.type === 'rotator') {
                const rotatorLayer = layer.fabricObject as FabricImage;
                
                if (field === 'offsetX' || field === 'offsetY') {
                    const numValue = Number(value);
                    const propKey = field === 'offsetX' ? 'OffsetX' : 'OffsetY';
                    const prop = layer.properties.find(prop => prop.property.toLowerCase() === field.toLowerCase());
                    if (prop) {
                        prop.value = numValue.toString();
                    } else {
                        layer.properties.push({ property: propKey, value: numValue.toString() });
                    }
                    // update fabricobject.UIElements
                    if (field === 'offsetX') {
                        layer.UIElements.set('left', rotatorLayer.left + numValue);
                    } else if (field === 'offsetY') {
                        layer.UIElements.set('top', rotatorLayer.top + numValue);
                    }
                }

                if (field === 'startAngle' || field === 'rotationAngle') {
                    const numValue = Number(value);
                    const propKey = field === 'startAngle' ? 'StartAngle' : 'RotationAngle';
                    const prop = layer.properties.find(prop => prop.property.toLowerCase() === field.toLowerCase());
                    if (prop) {
                        prop.value = numValue.toString();
                    } else {
                        layer.properties.push({ property: propKey, value: numValue.toString() });
                    }

                    const UIGroup = layer.UIElements as Group;
                    const uiObjects = UIGroup.getObjects ? UIGroup.getObjects() : (UIGroup as any)._objects;
                    
                    if (!uiObjects || uiObjects.length < 2) return;
                    const rangeIndicator = uiObjects[1] as Circle

                    if (field === 'startAngle') {
                        rangeIndicator.set('angle', numValue - 90);
                        rotatorLayer.set('angle', numValue);
                    } else if (field === 'rotationAngle') {
                        rangeIndicator.set('endAngle', numValue);
                    }
                }
                if (field === 'source') {
                    layerManager.updateImageForSelectedLayer(value);
                }
                if (field === 'measure') {
                    layerManager.updateMeasureForSelectedLayer(value);
                }

                setRotatorLayerProperties(prev => ({ ...prev, [field]: value }));

                rotatorLayer.setCoords();
                canvas?.renderAll();
            }
        }
    }

    const handleImageSourceUpdate = async () => {
        const selectedFile = await open({
            title: 'Select Rotator Image',
            filters: [
                {
                    name: 'Images',
                    extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif'],
                },
            ],
        });
        if (!selectedFile || typeof selectedFile !== 'string') return;
        layerManager.updateImageForSelectedLayer(selectedFile);
    }

    const handleMeasureTypeChange = (value: string) => {
        setMeasureType(value);
        if (value === 'time') {
            handleInputChange('measure', 'rotator-time-second');
        } else if (value === 'cpu') {
            handleInputChange('measure', 'rotator-cpu-average');
        } else if (value === 'disk') {
            handleInputChange('measure', 'rotator-disk-c-usage');
        }
    }

    return(
        <div className="flex flex-col gap-0">
            <CommonProperties />
            
            <CollapsibleSidebarGroup 
                label="Rotator Properties" 
                icon={<Compass className="h-4 w-4" />}
            >
                <div className="space-y-4 px-3 py-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Rotator Image</Label>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleImageSourceUpdate}
                            className="w-full h-8 shadow-none text-xs bg-background/50"
                        >
                            Change Image
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 font-mono">Pivot Offset</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <PropertyInput 
                                id='rotator-offset-x' 
                                label='OX' 
                                icon={UnfoldHorizontal}
                                value={rotatorLayerProperties.offsetX} 
                                onChange={value => handleInputChange('offsetX', value)}
                                className="w-full"
                            />
                            <PropertyInput 
                                id='rotator-offset-y' 
                                label='OY' 
                                icon={UnfoldVertical}
                                value={rotatorLayerProperties.offsetY} 
                                onChange={value => handleInputChange('offsetY', value)}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 font-mono">Angles (DEG)</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <PropertyInput 
                                id='rotator-start-angle' 
                                label='Start' 
                                icon={CircleArrowOutUpRight}
                                value={rotatorLayerProperties.startAngle} 
                                onChange={value => handleInputChange('startAngle', value)}
                                className="w-full"
                            />
                            <PropertyInput 
                                id='rotator-rotation-angle' 
                                label='Rot'
                                icon={RotateCw} 
                                value={rotatorLayerProperties.rotationAngle} 
                                onChange={value => handleInputChange('rotationAngle', value)}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Measure</Label>
                        <div className="flex flex-col gap-2">
                            <Select value={measureType} onValueChange={handleMeasureTypeChange}>
                                <SelectTrigger className='h-8 shadow-none bg-background/50 text-xs'>
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='time'>Time</SelectItem>
                                    <SelectItem value="cpu">CPU</SelectItem>
                                    <SelectItem value="disk">Disk</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={rotatorLayerProperties.measure}
                                onValueChange={handleInputChange.bind(null, 'measure') as any}
                            >
                                <SelectTrigger className='h-8 shadow-none bg-background/50 text-xs'>
                                    <SelectValue placeholder="Select Measure" />
                                </SelectTrigger>
                                <SelectContent>
                                    {measureType === 'time' && (
                                        <>
                                            <SelectItem value="rotator-time-second">Seconds</SelectItem>
                                            <SelectItem value="rotator-time-minute">Minutes</SelectItem>
                                            <SelectItem value="rotator-time-hour">Hours</SelectItem>
                                        </>
                                    )}
                                    {measureType === 'cpu' && (
                                        <>
                                            <SelectItem value="rotator-cpu-average">Average CPU</SelectItem>
                                            <SelectItem value="rotator-cpu-core-1">Core 1</SelectItem>
                                            <SelectItem value="rotator-cpu-core-2">Core 2</SelectItem>
                                        </>
                                    )}
                                    {measureType === 'disk' && (
                                        <SelectItem value="rotator-disk-c-usage">Disk C Usage</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CollapsibleSidebarGroup>
        </div>
    )
}

export default RotatorLayerProperties;
