// ExportToINI.ts
import { copyFile } from '@tauri-apps/plugin-fs';
import { layerManager } from './LayerManager';
import { Circle, Ellipse, Group, IText, Line, Rect, TFiller } from 'fabric';
import { open} from '@tauri-apps/plugin-dialog';
import { mkdir, writeFile, exists } from '@tauri-apps/plugin-fs'; 
import { resourceDir } from '@tauri-apps/api/path';
import { localFontManager } from './LocalFontManager';
import { toRainmeterColor } from '@/lib/colorUtils';

// Types for Rainmeter Skin Components
export interface RainmeterMetadata {
    name: string;
    author: string;
    version: string;
    description: string;
    allowScrollResize: boolean;
    rawMetadata?: Record<string, string>;
    rawRainmeter?: Record<string, string>;
    rawVariables?: Record<string, string>;
}

interface RainmeterSkinProperties {
  allowScrollResize: boolean
}

interface RainmeterVariable {
  key: string;
  value: string;
}

interface RainmeterMeasure {
  type: 'Time' | 'Calc' | 'String' | 'Plugin' | 'CPU' | 'FreeDiskSpace';
  name: string;
  options: Record<string, string>;
}

interface RainmeterMeter {
  type: 'String' | 'Image' | 'Shape' | 'Rotator' | 'Bar' | 'Button' | 'Audio' | 'WebParser' | 'Measure' | 'Meter';
  name: string;
  measureName?: string;
  measureName2?: string;
  measureName3?: string;
  measureName4?: string;
  measureName5?: string;
  measureName6?: string;
  measureName7?: string;
  measureName8?: string;
  options: Record<string, string | TFiller>;
}

interface RainmeterSkinLayer {
  measure?: RainmeterMeasure;
  meter?: RainmeterMeter;
}

class RainmeterSkinExporter {
  private baseTemplate: string;
  private layers: RainmeterSkinLayer[] = [];
  private metadata: RainmeterMetadata;
  private skinWidth: number = 0;
  private skinHeight: number = 0;
  public properties: RainmeterSkinProperties = { allowScrollResize: false };
  private variables: RainmeterVariable[] = [];

  constructor(metadata: RainmeterMetadata, skinWidth: number, skinHeight: number) {
    this.metadata = metadata;
    this.skinWidth = skinWidth;
    this.skinHeight = skinHeight;
    this.baseTemplate = this.createBaseTemplate();
  }

  private createBaseTemplate(): string {
    let metadataContent = '[Metadata]\n';
    if (this.metadata.rawMetadata && Object.keys(this.metadata.rawMetadata).length > 0) {
      Object.entries(this.metadata.rawMetadata).forEach(([key, value]) => {
        metadataContent += `${key}=${value}\n`;
      });
    } else {
      metadataContent += `Name=${this.metadata.name}\n`;
      metadataContent += `Author=${this.metadata.author}\n`;
      metadataContent += `Version=${this.metadata.version}\n`;
      metadataContent += `Description=${this.metadata.description}\n`;
    }

    let rainmeterContent = '\n[Rainmeter]\n';
    if (this.metadata.rawRainmeter && Object.keys(this.metadata.rawRainmeter).length > 0) {
      Object.entries(this.metadata.rawRainmeter).forEach(([key, value]) => {
        // Update SkinWidth/Height if not provided in raw or if we want to override
        rainmeterContent += `${key}=${value}\n`;
      });
    } else {
      rainmeterContent += `Update=1000\n`;
      rainmeterContent += `BackgroundMode=2\n`;
      rainmeterContent += `SolidColor=0,0,0,1\n`;
      if (this.properties.allowScrollResize) {
        rainmeterContent += `SkinWidth=(${this.skinWidth.toString()} * #Scale#)\n`;
        rainmeterContent += `SkinHeight=(${this.skinHeight.toString()} * #Scale#)\n`;
      }
      rainmeterContent += `AccurateText=1\n`;
    }

    return metadataContent + rainmeterContent;
  }


  addVariable(key: string, value: string): this {
    this.variables.push({ key, value });
    return this;
  }

  addLayer(layer: RainmeterSkinLayer): this {
    this.layers.push(layer);
    return this;
  }

  export(): string {
    let exportContent = this.baseTemplate;

    if (this.properties.allowScrollResize) {
      exportContent += 'MouseScrollUpAction=[!SetVariable Scale "(#Scale#+#ScrollMouseIncrement#)"][!WriteKeyValue Variables Scale "(#Scale#+#ScrollMouseIncrement#)"][!Refresh] \n';
      exportContent += 'MouseScrollDownAction=[!SetVariable Scale "(#Scale#-#ScrollMouseIncrement# < 0.2 ? 0.2 : #Scale#-#ScrollMouseIncrement#)"][!WriteKeyValue Variables Scale "(#Scale#-#ScrollMouseIncrement# < 0.2 ? 0.2 : #Scale#-#ScrollMouseIncrement#)"][!Refresh]\n';
      exportContent += '\n';
    } else {
      exportContent += '\n';
    }
    // Add Variables section
    const allVariables = new Map<string, string>();
    
    // Add raw variables first
    if (this.metadata.rawVariables) {
      Object.entries(this.metadata.rawVariables).forEach(([k, v]) => allVariables.set(k, v));
    }
    
    // Add injected variables (might override raw if name matches)
    this.variables.forEach(v => allVariables.set(v.key, v.value));

    if (allVariables.size > 0) {
      exportContent += '\n[Variables]\n';
      allVariables.forEach((value, key) => {
        exportContent += `${key}=${value}\n`;
      });
      exportContent += '\n';
    }

    // Add Measures
    this.layers
      .filter(layer => layer.measure)
      .forEach((layer) => {
        const measure = layer.measure!;
        exportContent += `[${measure.name}]\n`;
        exportContent += `Measure=${measure.type}\n`;
        
        Object.entries(measure.options).forEach(([key, value]) => {
          exportContent += `${key}=${value}\n`;
        });
        
        exportContent += '\n';
      });

    // Add Meters
    this.layers
      .filter(layer => layer.meter)
      .forEach((layer) => {
        const meter = layer.meter!;
        exportContent += `[${meter.name}]\n`;
        exportContent += `Meter=${meter.type}\n`;
        
        if (meter.measureName) {
          exportContent += `MeasureName=${meter.measureName}\n`;
        }
        if (meter.measureName2) {
          exportContent += `MeasureName2=${meter.measureName2}\n`;
        }
        if (meter.measureName3) {
          exportContent += `MeasureName3=${meter.measureName3}\n`;
        }
        if (meter.measureName4) {
          exportContent += `MeasureName4=${meter.measureName4}\n`;
        }
        if (meter.measureName5) {
          exportContent += `MeasureName5=${meter.measureName5}\n`;
        }
        if (meter.measureName6) {
          exportContent += `MeasureName6=${meter.measureName6}\n`;
        }
        if (meter.measureName7) {
          exportContent += `MeasureName7=${meter.measureName7}\n`;
        }
        if (meter.measureName8) {
          exportContent += `MeasureName8=${meter.measureName8}\n`;
        }

        Object.entries(meter.options).forEach(([key, value]) => {
          exportContent += `${key}=${value}\n`;
        });
        
        exportContent += '\n';
      });

    return exportContent;
  }
}

async function fontExistsInPublic(fontName: string): Promise<boolean> {
  const fontPath = await resourceDir() + `/_up_/public/fonts/${fontName}`;
  return await exists(fontPath);
}

function getRotatedBounds(width: number, height: number, angleInDegrees: number) {
  const angle = Math.abs(angleInDegrees * Math.PI / 180);
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));
  const boundWidth = width * absCos + height * absSin;
  const boundHeight = width * absSin + height * absCos;
  
  return {
    width: boundWidth,
    height: boundHeight,
    scale: Math.min(width / boundWidth, height / boundHeight)
  };
}

export const generateIniContent = async (
  metadata: RainmeterMetadata, 
  allowScrollResize: boolean,
  tracking: { fonts: Set<string>, images: string[] } = { fonts: new Set(), images: [] }
): Promise<string> => {
  const scaleCorrection = 1.33;
  const layers = layerManager.getLayers();
  const skinBackground = layerManager.getSkinBackground();

  const exporter = new RainmeterSkinExporter(metadata, skinBackground?.width || 0, skinBackground?.height || 0);
  exporter.properties.allowScrollResize = allowScrollResize;
  
  const systemFonts = localFontManager.getCachedFonts();
  const minX = skinBackground?.left ?? 400;
  const minY = skinBackground?.top ?? 200;

  if (allowScrollResize) {
    exporter.addVariable('Scale', '1.0');
    exporter.addVariable('ScrollMouseIncrement', '0.05');
  }

  const formatCoord = (val: number) => {
    return allowScrollResize ? `(${val.toFixed(0)} * #Scale#)` : val.toFixed(0);
  };

  const formatFontSize = (val: number) => {
    const size = (val / scaleCorrection).toFixed(1);
    return allowScrollResize ? `(${size} * #Scale#)` : size;
  };

  const addStringMeterLayerOneMeasure = (exporter: RainmeterSkinExporter, layer: any, text: IText, fontFace: string, stringStyle: string, adjustedX: number, adjustedY: number, strCont: string) => {
    exporter.addLayer({
      meter: {
        type: 'String',
        name: layer.name,
        measureName: 'Measure' + layer.name,
        options: {
          FontFace: fontFace,
          FontSize: formatFontSize(text.fontSize),
          FontColor: layer.fabricObject.fill ? hexToRgb(layer.fabricObject.fill, layer.fabricObject.opacity) : '0,0,0,255',
          StringStyle: stringStyle,
          X: formatCoord(adjustedX),
          Y: formatCoord(adjustedY),
          Angle: (layer.fabricObject.angle * (Math.PI / 180)).toString(),
          AntiAlias: "1",
          Text: strCont,
        }
      }
    });
  };

  const addRotatorMeterLayerOneMeasure = (exporter: RainmeterSkinExporter, layer: any, adjustedX: number, adjustedY: number, width: number, height: number, ImageName: string, OffsetX: number, OffsetY: number, startAngle: number, rotationAngle: number, valueRemainder?: number) => {
    const options: any = {
        ImageName: ImageName,
        W: formatCoord(width),
        H: formatCoord(height),
        X: formatCoord(adjustedX),
        Y: formatCoord(adjustedY),
        StartAngle: ((startAngle) * (Math.PI / 180)).toString(),
        RotationAngle: ((rotationAngle) * (Math.PI / 180)).toString(),
        OffsetX: formatCoord(OffsetX + (width / 2)),
        OffsetY: formatCoord(OffsetY + (height / 2))
    };
    if (valueRemainder !== undefined) options.ValueRemainder = valueRemainder.toString();

    exporter.addLayer({
        meter: { type: 'Rotator', name: layer.name, measureName: 'Measure' + layer.name, options: options }
    });
  }

  const addBarMeterLayerOneMeasure = (exporter: RainmeterSkinExporter, layer: any, adjustedX: number, adjustedY: number, width: number, height: number) => {
    const barGroup = layer.fabricObject as Group;
    const objects = barGroup.getObjects ? barGroup.getObjects() : (barGroup as any)._objects;
    if (!objects || objects.length < 2) return;
    
    const background = objects[0] as Rect;
    const foreground = objects[1] as Rect;
    exporter.addLayer({
      meter: {
        type: 'Bar',
        name: layer.name,
        measureName: 'Measure' + layer.name,
        options: {
          X: formatCoord(adjustedX),
          Y: formatCoord(adjustedY),
          W: formatCoord(barGroup.width * barGroup.scaleX),
          H: formatCoord(barGroup.height * barGroup.scaleY),
          BarOrientation: 'Horizontal',
          BarColor: background.fill ? hexToRgb(background.fill, background.opacity) : '0,0,0,255',
          SolidColor: foreground.fill ? hexToRgb(foreground.fill, foreground.opacity) : '0,0,0,255',
        }
      }
    });
  }

  layers.forEach(layer => {
    const adjustedX = (layer.fabricObject.left - minX);
    const adjustedY = (layer.fabricObject.top - minY);
    if (layer.type === 'text') {
      const text = layer.fabricObject as IText;
      const font = systemFonts.find(font => font.name === text.fontFamily);
      let stringStyle = "normal";
      let fontFace = text.fontFamily;
      if(text.fontFamily.includes(" Bold")) { stringStyle = "bold"; fontFace = text.fontFamily.replace(" Bold", ""); }
      if(text.fontFamily.includes(" Italic")) { stringStyle = "italic"; fontFace = text.fontFamily.replace(" Italic", ""); }
      if(text.fontFamily.includes(" Regular")) { stringStyle = "normal"; fontFace = text.fontFamily.replace(" Regular", ""); }

      if (layer.measure === "custom-text") {
        exporter.addLayer({
          meter: {
            type: 'String',
            name: layer.name,
            options: {
              FontFace: fontFace,
              FontSize: formatFontSize(text.fontSize),
              FontColor: layer.fabricObject.fill ? hexToRgb(layer.fabricObject.fill, layer.fabricObject.opacity) : '0,0,0',
              StringStyle: stringStyle,
              X: formatCoord(adjustedX),
              Y: formatCoord(adjustedY),
              Angle: (layer.fabricObject.angle * (Math.PI / 180)).toString(),
              AntiAlias: "1",
              Text: text.text,
            }
          }
        });
        if (font) tracking.fonts.add(font.src);
      } else if (layer.measure?.startsWith("date-")) {
        let format = '%F';
        if (layer.measure === "date-mm-dd-yy") format = '%D';
        else if (layer.measure === "date-month-number") format = '%m';
        else if (layer.measure === "date-month-full") format = '%B';
        else if (layer.measure === "date-month-short") format = '%b';
        else if (layer.measure === "date-day-number") format = '%d';
        else if (layer.measure === "date-day-full") format = '%A';
        else if (layer.measure === "date-day-short") format = '%a';
        else if (layer.measure === "date-year-short") format = '%g';
        else if (layer.measure === "date-year-full") format = '%G';
        
        exporter.addLayer({ measure: { type: 'Time', name: 'Measure' + layer.name, options: { Format: format } } });
        addStringMeterLayerOneMeasure(exporter, layer, text, fontFace, stringStyle, adjustedX, adjustedY, '%1');
        if (font) tracking.fonts.add(font.src);
      } else if (layer.measure?.startsWith("time-")) {
        let format = '%H:%M';
        if (layer.measure === "time-hour-minute-12") format = '%I:%M %p';
        else if (layer.measure === "time-hour-24") format = '%H';
        else if (layer.measure === "time-hour-12") format = '%I';
        else if (layer.measure === "time-minute") format = '%M';
        else if (layer.measure === "time-second") format = '%S';
        else if (layer.measure === "time-am-pm") format = '%p';

        exporter.addLayer({ measure: { type: 'Time', name: 'Measure' + layer.name, options: { Format: format } } });
        addStringMeterLayerOneMeasure(exporter, layer, text, fontFace, stringStyle, adjustedX, adjustedY, '%1');
        if (font) tracking.fonts.add(font.src);
      } else if (layer.measure?.startsWith("cpu-")) {
        let options = {};
        if (layer.measure !== "cpu-average") options = { Processor: layer.measure.split('-')[2] };
        exporter.addLayer({ measure: { type: 'CPU', name: 'Measure' + layer.name, options } });
        addStringMeterLayerOneMeasure(exporter, layer, text, fontFace, stringStyle, adjustedX, adjustedY, '%1%');
        if (font) tracking.fonts.add(font.src);
      } else if (layer.measure?.startsWith("disk-")) {
        let options: any = { Drive: 'C:', UpdateDivider: '5' };
        if (layer.measure === "disk-c-label") options.Label = '1';
        else if (layer.measure === "disk-c-total-space") options.Total = '1';
        else if (layer.measure === "disk-c-used-space") options.InvertMeasure = '1';
        
        exporter.addLayer({ measure: { type: 'FreeDiskSpace', name: 'Measure' + layer.name, options } });
        const suffix = layer.measure === "disk-c-label" ? "" : " B";
        addStringMeterLayerOneMeasure(exporter, layer, text, fontFace, stringStyle, adjustedX, adjustedY, '%1' + suffix);
        if (font) tracking.fonts.add(font.src);
      }
    } else if (layer.type === 'image') {
      if (!tracking.images.includes(layer.imageSrc)) tracking.images.push(layer.imageSrc);
      const { width: correctedW, height: correctedH } = getRotatedBounds(layer.fabricObject.width * layer.fabricObject.scaleX, layer.fabricObject.height * layer.fabricObject.scaleY, layer.fabricObject.angle);
      exporter.addLayer({
        meter: {
          type: 'Image',
          name: layer.name,
          options: {
            ImageName: '#@#Images/' + tracking.images.findIndex(img => img === layer.imageSrc).toString() + '.png',
            W: formatCoord(correctedW),
            H: formatCoord(correctedH),
            X: formatCoord(adjustedX - (correctedW / 2)),
            Y: formatCoord(adjustedY - (correctedH / 2)),
            ImageRotate: (layer.fabricObject.angle).toString(),
          }
        }
      });
    } else if (layer.type === 'rotator') {
      if (!tracking.images.includes(layer.imageSrc)) tracking.images.push(layer.imageSrc);
      let rem = 0;
      let measureType: any = 'Time';
      let options: any = {};
      if (layer.measure === 'rotator-time-second') { rem = 60; }
      else if (layer.measure === 'rotator-time-minute') { rem = 3600; }
      else if (layer.measure === 'rotator-time-hour') { rem = 43200; }
      else if (layer.measure?.startsWith('rotator-cpu-')) {
        measureType = 'CPU';
        if (layer.measure !== 'rotator-cpu-average') options.Processor = layer.measure?.split('-')[3];
      } else if (layer.measure === 'rotator-disk-c-usage') {
        exporter.addLayer({ measure: { type: 'FreeDiskSpace', name: 'Measure' + layer.name + 'Total', options: { Drive: 'C:', Total: '1', UpdateDivider: '5' } } });
        exporter.addLayer({ measure: { type: 'FreeDiskSpace', name: 'Measure' + layer.name + 'Used', options: { Drive: 'C:', InvertMeasure: '1', UpdateDivider: '5' } } });
        measureType = 'Calc';
        options.Formula = "Measure" + layer.name + "Used / Measure" + layer.name + "Total";
        options.UpdateDivider = '5';
      }

      if (layer.measure && layer.measure !== 'rotator-disk-c-usage') exporter.addLayer({ measure: { type: measureType, name: 'Measure' + layer.name, options } });

      addRotatorMeterLayerOneMeasure(
        exporter, layer, adjustedX - layer.fabricObject.width / 2, adjustedY - layer.fabricObject.height / 2,
        layer.fabricObject.width * layer.fabricObject.scaleX, layer.fabricObject.height * layer.fabricObject.scaleY,
        '#@#Images/' + tracking.images.findIndex(img => img === layer.imageSrc).toString() + '.png',
        Number(layer.properties.find(prop => prop.property === 'offsetX')?.value),
        Number(layer.properties.find(prop => prop.property === 'offsetY')?.value),
        Number(layer.properties.find(prop => prop.property === 'startAngle')?.value),
        Number(layer.properties.find(prop => prop.property === 'rotationAngle')?.value),
        rem || undefined
      );
    } else if (layer.type === 'bar') {
      let options: any = {};
      if (layer.measure === "bar-disk") { options = { Drive: 'C:', InvertMeasure: '1', UpdateDivider: '5' }; }
      exporter.addLayer({ measure: { type: layer.measure === "bar-cpu" ? 'CPU' : 'FreeDiskSpace', name: 'Measure' + layer.name, options } });
      addBarMeterLayerOneMeasure(exporter, layer, adjustedX, adjustedY, layer.fabricObject.width, layer.fabricObject.height);
    } else if (layer.type === 'shape') {
      const obj = layer.fabricObject;
      let shapeStr = '';
      
      if (obj instanceof Rect) {
        shapeStr = `Rectangle 0,0,${(obj.width * obj.scaleX).toFixed(0)},${(obj.height * obj.scaleY).toFixed(0)},${obj.rx || 0}`;
      } else if (obj instanceof Ellipse) {
        shapeStr = `Ellipse ${(obj.rx * obj.scaleX).toFixed(0)},${(obj.ry * obj.scaleY).toFixed(0)},${(obj.rx * obj.scaleX).toFixed(0)},${(obj.ry * obj.scaleY).toFixed(0)}`;
      } else if (obj instanceof Circle) {
        const r = (obj as any).radius * obj.scaleX;
        shapeStr = `Ellipse ${r.toFixed(0)},${r.toFixed(0)},${r.toFixed(0)},${r.toFixed(0)}`;
      } else {
        // Fallback for other shapes (like Triangle)
        shapeStr = `Rectangle 0,0,${(obj.width * obj.scaleX).toFixed(0)},${(obj.height * obj.scaleY).toFixed(0)}`;
      }

      const fill = toRainmeterColor(obj.fill, obj.opacity);
      const stroke = toRainmeterColor(obj.stroke, obj.opacity);
      const strokeWidth = obj.strokeWidth || 0;

      exporter.addLayer({
        meter: {
          type: 'Shape',
          name: layer.name,
          options: {
            X: formatCoord(adjustedX),
            Y: formatCoord(adjustedY),
            Shape: `${shapeStr} | Fill Color ${fill} | Stroke Color ${stroke} | StrokeWidth ${strokeWidth}`
          }
        }
      });
    } else if (layer.type === 'roundline') {
      const group = layer.fabricObject as Group;
      const objects = group.getObjects ? group.getObjects() : (group as any)._objects;
      
      // Basic defaults for roundline
      const lineColor = objects[1] ? toRainmeterColor((objects[1] as any).stroke, (objects[1] as any).opacity) : '255,255,255,255';
      const solidColor = objects[0] ? toRainmeterColor((objects[0] as any).stroke, (objects[0] as any).opacity) : '50,50,50,180';
      const lineWidth = objects[1] ? (objects[1] as any).strokeWidth : '4';

      exporter.addLayer({ measure: { type: 'Time', name: 'Measure' + layer.name, options: { Format: '%S' } } });
      exporter.addLayer({
        meter: {
          type: 'Roundline',
          name: layer.name,
          measureName: 'Measure' + layer.name,
          options: {
            X: formatCoord(adjustedX),
            Y: formatCoord(adjustedY),
            W: formatCoord(group.width * group.scaleX),
            H: formatCoord(group.height * group.scaleY),
            LineColor: lineColor,
            SolidColor: solidColor,
            LineStart: (group.width * 0.15).toFixed(0),
            LineLength: (group.width * 0.4).toFixed(0),
            LineWidth: lineWidth,
            AntiAlias: '1',
            Solid: '1',
          }
        }
      });
    }
  });
  
  layerManager.setSessionImages(tracking.images);

  return exporter.export();
};


export const exportSkin = async (resourcePath: string, metadata: RainmeterMetadata, allowScrollResize: boolean): Promise<string> => {
  const tracking = { fonts: new Set<string>(), images: [] as string[] };
  const iniContent = await generateIniContent(metadata, allowScrollResize, tracking);

  // Copy fonts
  for (const font of tracking.fonts) {
    const fontExists = await fontExistsInPublic(font);
    if (fontExists) {
      const sourcePath = await resourceDir() + `/_up_/public/fonts/${font}`;
      const destinationPath = `${resourcePath}/Fonts/${font}`;
      await copyFile(sourcePath, destinationPath);
    }
  }

  // Copy images
  for (let i = 0; i < tracking.images.length; i++) {
    const sourcePath = tracking.images[i];
    const destinationPath = `${resourcePath}/Images/${i.toString() + '.png'}`;
    await copyFile(sourcePath, destinationPath);
  }

  return iniContent;
}

import { invoke } from '@tauri-apps/api/core';

export const handleCreateDirectory = async (metadata: RainmeterMetadata,  allowScrollResize: boolean): Promise<boolean> => {
  const selectedDirectory = await open({ title: 'Select a Directory', directory: true });
  if (!selectedDirectory) return false;

  let newDirectoryName = metadata.name || 'rmEditorSkin';
  const newDirectoryPath = `${selectedDirectory}/${newDirectoryName}`;
  const ResDirectoryPath = `${newDirectoryPath}/@Resources`;

  try {
    await mkdir(newDirectoryPath);
    await mkdir(ResDirectoryPath);
    await mkdir(`${ResDirectoryPath}/Fonts`);
    await mkdir(`${ResDirectoryPath}/Images`);

    const iniContent = await exportSkin(ResDirectoryPath, metadata, allowScrollResize);
    await writeFile(`${newDirectoryPath}/skin.ini`, new TextEncoder().encode(iniContent));

    try {
      await invoke('create_rmskin', { inputDir: newDirectoryPath, outputFile: `${selectedDirectory}/${newDirectoryName}` });
    } catch (err) {
      console.error('Error creating .rmskin package:', err);
    }
    return true;
  } catch (error) {
    console.error('Failed to create directory or file:', error);
    return false;
  }
};

function hexToRgb(hex: string | any, opacity: number): string {
  return toRainmeterColor(hex, opacity);
}
