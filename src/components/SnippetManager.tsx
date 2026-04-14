import React, { useState } from 'react';
import { useIniFile } from '@/context/IniFileContext';
import { ScrollArea } from './ui/scroll-area';
import { Search, FileCode, Plus } from 'lucide-react';
import { Input } from './ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

const SNIPPETS: Record<string, Record<string, string>> = {
  "Meters": {
    "Basic Text (String)": "[MeterText]\nMeter=String\nX=10\nY=10\nW=220\nH=32\nText=Hello World\nFontFace=#FontFace#\nFontSize=#FontSize#\nFontColor=#FontColor#\nAntiAlias=1\nDynamicVariables=1\nStringAlign=LeftCenter\nClipString=1",
    "Text with Measure + %": "[MeterCPU]\nMeter=String\nMeasureName=MeasureCPU\nX=0\nY=0\nW=180\nH=24\nText=CPU: %1%%\nFontColor=#FontColor#\nFontSize=#FontSize#\nFontFace=#FontFace#\nPercentual=1\nNumOfDecimals=1\nClipString=1\nAntiAlias=1\nDynamicVariables=1",
    "Text with Inline Setting": "[MeterInline]\nMeter=String\nX=10\nY=10\nW=260\nH=28\nText=Normal Highlight Normal\nFontColor=#FontColor#\nFontFace=#FontFace#\nFontSize=#FontSize#\nInlineSetting=Color | #AccentColor#\nInlinePattern=Highlight\nInlineSetting2=Bold\nInlinePattern2=Highlight\nAntiAlias=1\nDynamicVariables=1",
    "Clip Text + Auto-Wrap": "[MeterLongText]\nMeter=String\nX=10\nY=10\nW=300\nH=80\nText=Very long text that should wrap or truncate in a controlled manner.\nFontFace=#FontFace#\nFontSize=#FontSize#\nFontColor=#FontColor#\nClipString=2\nDynamicWindowSize=1\nAntiAlias=1",

    "Simple Image": "[MeterImage]\nMeter=Image\nImageName=#@#Icons\\app.png\nX=5\nY=5\nW=64\nH=64\nPreserveAspectRatio=1\nAntiAlias=1\nDynamicVariables=1",
    "Image with Mask": "[MeterMasked]\nMeter=Image\nImageName=#@#Images\\photo.jpg\nMaskImageName=#@#Images\\circle-mask.png\nX=0\nY=0\nW=100\nH=100\nPreserveAspectRatio=1\nAntiAlias=1\nDynamicVariables=1",

    "Simple Horizontal Bar": "[MeterBar]\nMeter=Bar\nMeasureName=MeasureRAM\nX=10\nY=10\nW=180\nH=12\nBarColor=#AccentColor#\nSolidColor=50,50,50,180\nBarOrientation=Horizontal\nAntiAlias=1\nDynamicVariables=1",

    "Basic Roundline": "[MeterRoundline]\nMeter=Roundline\nMeasureName=MeasureCPU\nX=10\nY=10\nW=120\nH=120\nStartAngle=0\nRotationAngle=360\nLineStart=20\nLineLength=40\nLineWidth=8\nLineColor=#AccentColor#\nSolid=1\nAntiAlias=1\nDynamicVariables=1",
    "Progress Roundline Gauge": "[MeterRoundGauge]\nMeter=Roundline\nMeasureName=MeasureRAM\nX=0\nY=0\nW=140\nH=140\nStartAngle=225\nRotationAngle=270\nLineStart=30\nLineLength=45\nLineWidth=10\nLineColor=#AccentColor#\nSolid=1\nAntiAlias=1\nDynamicVariables=1",
    "Segmented Roundline": "[MeterRoundSegments]\nMeter=Roundline\nMeasureName=MeasureDisk\nX=0\nY=0\nW=150\nH=150\nStartAngle=0\nRotationAngle=360\nLineStart=25\nLineLength=40\nLineWidth=6\nLineColor=255,170,0,255\nSolid=0\nAntiAlias=1\nDynamicVariables=1",
    "Roundline with Background": "[MeterRoundBg]\nMeter=Roundline\nX=0\nY=0\nW=140\nH=140\nStartAngle=225\nRotationAngle=270\nLineStart=28\nLineLength=44\nLineWidth=10\nLineColor=50,50,60,180\nSolid=1\nAntiAlias=1\n\n[MeterRoundValue]\nMeter=Roundline\nMeasureName=MeasureCPU\nX=r\nY=r\nW=140\nH=140\nStartAngle=225\nRotationAngle=270\nLineStart=28\nLineLength=44\nLineWidth=10\nLineColor=#AccentColor#\nSolid=1\nAntiAlias=1\nDynamicVariables=1",

    "Rounded Rectangle (Background)": "[MeterBG]\nMeter=Shape\nShape=Rectangle 0,0,300,80,15 | Fill Color #BGColor# | StrokeWidth 2 | Stroke Color 80,80,100,150\nX=0\nY=0\nW=300\nH=80\nAntiAlias=1\nDynamicVariables=1",
    "Circle (Icon/Button)": "[MeterCircle]\nMeter=Shape\nShape=Ellipse 50,50,40 | Fill Color 0,120,255,220 | StrokeWidth 3 | Stroke Color 255,255,255,180\nX=0\nY=0\nW=100\nH=100\nAntiAlias=1",
    "Circular Arc Gauge": "[MeterArcGauge]\nMeter=Shape\nX=0\nY=0\nW=120\nH=120\nShape=Arc 60,60,60,60,0,0,0,0,0,1 | StrokeWidth 12 | Stroke Color 60,60,60,255\nShape2=Arc 60,60,60,60,[&StartAngle],[&SweepAngle],0,0,0,1 | StrokeWidth 12 | Stroke Color #AccentColor#\nDynamicVariables=1",
    "Button with Gradient": "[MeterButton]\nMeter=Shape\nShape=Rectangle 0,0,140,40,12 | Fill LinearGradient Grad | StrokeWidth 1 | Stroke Color 100,100,255,180\nGrad=90 | 50,100,255,255;0.0 | 100,200,255,255;1.0\nAntiAlias=1"
  },
  "Measures": {
    "CPU Total Usage": "[MeasureCPU]\nMeasure=CPU\nProcessor=0\nMinValue=0\nMaxValue=100\nUpdateDivider=1",
    "RAM Used (%)": "[MeasureRAM]\nMeasure=PhysicalMemory\nMinValue=0\nMaxValue=100\nUpdateDivider=5",
    "Digital Clock": "[MeasureTime]\nMeasure=Time\nFormat=%H:%M:%S\nTimeZone=Local",
    "Full Date": "[MeasureDate]\nMeasure=Time\nFormat=%A, %d %B %Y",
    "Simple Calculation": "[MeasureCalc]\nMeasure=Calc\nFormula=Clamp([MeasureCPU] * 2, 0, 100)\nMinValue=0\nMaxValue=100\nDynamicVariables=1",
    "Free Disk Space C:": "[MeasureDisk]\nMeasure=FreeDiskSpace\nDrive=C:\\\nUnit=GB\nMinValue=0\nMaxValue=Total",
    "Network Download (NetIn)": "[MeasureNetIn]\nMeasure=NetIn\nInterface=Best\nCumulative=0",
    "Plugin Example (Lua)": "[MeasureLua]\nMeasure=Plugin\nPlugin=LuaScript\nScriptFile=#@#Scripts\\main.lua",
    "WebParser - Page Title": "[MeasureWebTitle]\nMeasure=WebParser\nURL=https://www.google.com\nRegExp=<title>(.*?)</title>",
    "Registry - Registry Value": "[MeasureRegistry]\nMeasure=Registry\nRegHKEY=HKEY_CURRENT_USER\nRegKey=\nRegPath=Software\\Rainmeter\nRegValue=AccentColor",
    "Process - CPU Usage": "[MeasureProcess]\nMeasure=Process\nProcessName=chrome.exe\nUpdateDivider=1\nSubstitute=\"-1\":\"not running\",\"1\":\"running\""
  },
  "Templates": {
    "Complete Basic Structure": "[Rainmeter]\nUpdate=1000\nAccurateText=1\nDynamicWindowSize=1\nBackgroundMode=2\nSolidColor=0,0,0,1\n\n[Variables]\nFontColor=255,255,255,220\nAccentColor=0,180,255,255\nBGColor=30,30,40,200\nFontFace=Segoe UI\nFontSize=13\n\n[@Include]\n@Include=#@#Variables.inc\n\n[MeterBackground]\nMeter=Shape\nShape=Rectangle 0,0,280,180,20 | Fill Color #BGColor#\nW=280\nH=180\nAntiAlias=1\nDynamicVariables=1",
    "Animated Roundline Gauge": "[Rainmeter]\nUpdate=1000\nAccurateText=1\nDynamicWindowSize=1\n\n[Variables]\nAccentColor=0,180,255,255\nTrackColor=45,45,55,180\nFontColor=235,235,245,255\nFontFace=Segoe UI\nFontSize=14\nGaugeSize=160\nRingStart=34\nRingLength=48\nRingWidth=10\n\n[MeasureCPU]\nMeasure=CPU\nProcessor=0\nMinValue=0\nMaxValue=100\nUpdateDivider=1\n\n[MeasureSweep]\nMeasure=Calc\nFormula=([MeasureCPU] * 2.7)\nMinValue=0\nMaxValue=270\nDynamicVariables=1\n\n[MeterTrack]\nMeter=Roundline\nX=0\nY=0\nW=#GaugeSize#\nH=#GaugeSize#\nStartAngle=225\nRotationAngle=270\nLineStart=#RingStart#\nLineLength=#RingLength#\nLineWidth=#RingWidth#\nLineColor=#TrackColor#\nSolid=1\nAntiAlias=1\nDynamicVariables=1\n\n[MeterValue]\nMeter=Roundline\nMeasureName=MeasureCPU\nX=r\nY=r\nW=#GaugeSize#\nH=#GaugeSize#\nStartAngle=225\nRotationAngle=270\nLineStart=#RingStart#\nLineLength=#RingLength#\nLineWidth=#RingWidth#\nLineColor=#AccentColor#\nSolid=1\nAntiAlias=1\nDynamicVariables=1\n\n[MeterLabel]\nMeter=String\nMeasureName=MeasureCPU\nX=(#GaugeSize#/2)\nY=(#GaugeSize#/2)\nStringAlign=CenterCenter\nText=%1%%\nFontFace=#FontFace#\nFontSize=#FontSize#\nFontColor=#FontColor#\nAntiAlias=1\nDynamicVariables=1",
    "Modern Dark Theme": "[Variables]\nFontColor=220,220,230,255\nAccent=100,180,255,255\nBG=25,25,35,220\nShadow=0,0,0,120\n\n[MeterShadow]\nMeter=Shape\nShape=Rectangle 5,5,270,170,18 | Fill Color #Shadow#\nBlur=1\nBlurRadius=8",
    "Container + Scroll": "[MeterContainer]\nMeter=Shape\nShape=Rectangle 0,0,250,400 | Fill Color 0,0,0,1\nW=250\nH=400\nAntiAlias=1\n\n[MeterContent]\nMeter=String\nContainer=MeterContainer\nY=r\nDynamicVariables=1"
  },
  "Actions & Interactivity": {
    "Simple Click (Open Website)": "LeftMouseUpAction=[\"https://www.google.com\"]",
    "Toggle Skin": "LeftMouseUpAction=[!ToggleConfig \"MySuite\\Clock\" \"Clock.ini\"]",
    "Hover Highlight": "MouseOverAction=[!SetOption MeterText FontColor \"255,220,100,255\"][!UpdateMeter MeterText][!Redraw]\nMouseLeaveAction=[!SetOption MeterText FontColor \"#FontColor#\"][!UpdateMeter MeterText][!Redraw]",
    "Scroll Adjust Variable": "MouseScrollUpAction=[!SetVariable Scale \"(#Scale# + 0.1)\"][!Update]\nMouseScrollDownAction=[!SetVariable Scale \"(#Scale# - 0.1)\"][!Update]",
    "Update Permanent Variable": "LeftMouseUpAction=[!WriteKeyValue Variables AccentColor \"255,100,100\" \"#@#Variables.inc\"][!Refresh]"
  },
  "Common Variables": {
    "Color Block": "[Variables]\nFontColor=235,235,245,255\nAccent=80,200,255,255\nBG=18,18,28,220\nBorder=60,60,80,150",
    "Global Sizes": "[Variables]\nScale=1.0\nFontSize=14\nIconSize=48\nPadding=12",
    "Paths": "[Variables]\n@=#@#\nImg=#@#Images\\\nFonts=#@#Fonts\\\nScripts=#@#Scripts\\"
  }
};

const SnippetManager: React.FC = () => {
  const { iniContent, setIniContent } = useIniFile();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleInsertSnippet = (code: string) => {
    setIniContent(iniContent + (iniContent.endsWith('\n') ? '' : '\n\n') + code);
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-4 border-b border-sidebar-border gap-4 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/50">Snippets</span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search snippets..." 
            className="pl-8 h-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Accordion type="multiple" className="px-2 pb-4">
          {Object.entries(SNIPPETS).map(([category, items]) => {
            const filteredItems = Object.entries(items).filter(([name]) => 
              name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              category.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredItems.length === 0) return null;

            return (
              <AccordionItem value={category} key={category} className="border-none">
                <AccordionTrigger className="hover:no-underline py-2 px-2 text-[10px] uppercase font-black tracking-widest text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">
                  {category}
                </AccordionTrigger>
                <AccordionContent className="pb-1 space-y-1">
                  {filteredItems.map(([name, code]) => (
                    <div 
                      key={name}
                      className="group flex items-center justify-between p-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors"
                      onClick={() => handleInsertSnippet(code)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileCode className="h-3 w-3 shrink-0 text-primary/50" />
                        <span className="text-xs truncate group-hover:text-primary transition-colors">{name}</span>
                      </div>
                      <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
};

export default SnippetManager;
