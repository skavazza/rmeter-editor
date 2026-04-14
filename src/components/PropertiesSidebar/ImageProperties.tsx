import { useEffect, useState } from "react";
import PropertyInput from "../customUI/PropertyInput";
import { SidebarGroup, SidebarGroupLabel, SidebarSeparator } from "../ui/sidebar";
import { Axis3D, ImageIcon } from "lucide-react";
import { layerManager } from "@/services/LayerManager";
import { useLayerContext } from "@/context/LayerContext";
import { FabricImage } from "fabric";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "../ui/button";
import CommonProperties from "./CommonProperties";
import CollapsibleSidebarGroup from "./CollapsibleSidebarGroup";
import { Label } from "../ui/label";

const ImageLayerProperties: React.FC = () => {

    const canvas = layerManager.getCanvas();
    const { selectedLayer } = useLayerContext();
    const selectedLayerId = selectedLayer?.id;

    const [imageLayerProperties, setImageLayerProperties] = useState({
        rotation: '',
    })

    useEffect(() => {
        const layer = layerManager.getLayers().find(layer => layer.id === selectedLayerId);
        const updateLayerProperties = () => {
            if (layer && layer.type === 'image') {
                const imageLayer = layer.fabricObject as FabricImage;
                setImageLayerProperties({
                    rotation: Math.round(imageLayer.angle || 0).toString(),
                })
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

    const handleInputChange = (field: keyof typeof imageLayerProperties, value: string) => {
        if (selectedLayerId) {
            const layer = layerManager.getLayers().find(layer => layer.id === selectedLayerId);
            if (layer && layer.type === 'image') {
                const imageLayer = layer.fabricObject as FabricImage;
                if (field === 'rotation') {
                    imageLayer.set({ angle: Number(value) });
                } 

                setImageLayerProperties(prev => ({ ...prev, [field]: value }));

                imageLayer.setCoords();
                canvas?.renderAll();
            }
        }

    }

    const handleImageSourceUpdate = async () => {
        const selectedFile = await open({
            title: 'Select an Image',
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

    return (
        <div className="flex flex-col gap-0">
            <CommonProperties />
            
            <CollapsibleSidebarGroup 
                label="Image Properties" 
                icon={<ImageIcon className="h-4 w-4" />}
            >
                <div className="space-y-4 px-3 py-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Image Source</Label>
                        <Button 
                            variant="outline" 
                            onClick={handleImageSourceUpdate}
                            className="w-full h-8 shadow-none text-xs bg-background/50"
                        >
                            Change Image
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Rotation</Label>
                        <div className="flex items-center gap-2">
                            <PropertyInput 
                                id='image-rotation' 
                                label='Rotation'
                                icon={Axis3D}
                                value={imageLayerProperties.rotation} 
                                onChange={value => handleInputChange('rotation', value)}
                                className="flex-1"
                            />
                            <span className="text-[10px] text-muted-foreground font-mono">DEG</span>
                        </div>
                    </div>
                </div>
            </CollapsibleSidebarGroup>
        </div>
    );
}

export default ImageLayerProperties;
