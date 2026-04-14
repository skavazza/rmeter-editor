import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";

const BANGS_META: Record<string, string[]> = {
  "!SetClip": ["String"],
  "!SetWallpaper": ["File", "Position"],
  "!About": ["Tabname"],
  "!Delay": ["Milliseconds"],
  "!SetOption": ["Config", "Meter", "Option", "Value"],
  "!SetVariable": ["Variable", "Value", "Config"],
  "!UpdateMeter": ["Meter", "Config"],
  "!UpdateMeasure": ["Measure", "Config"],
  "!WriteKeyValue": ["Section", "Key", "Value", "File"],
  "!Refresh": ["Config"],
  "!ActivateConfig": ["Config", "File"],
  "!DeactivateConfig": ["Config"],
  "!ToggleConfig": ["Config", "File"],
  "!ShowMeter": ["Meter", "Config"],
  "!HideMeter": ["Meter", "Config"],
  "!ToggleMeter": ["Meter", "Config"],
  "!Play": ["FilePath"],
  "!AddBlur": ["Region", "Config"],
  "!RemoveBlur": ["Region", "Config"],
  "!Show": ["Config"],
  "!Hide": ["Config"],
  "!Toggle": ["Config"],
  "!ShowBlur": ["Config"],
  "!HideBlur": ["Config"],
  "!ToggleBlur": ["Config"],
  "!SkinMenu": ["Config"],
  "!SkinCustomMenu": ["Config"],
  "!DisableMouseAction": ["Meter", "MouseAction", "Config"],
  "!ClearMouseAction": ["Meter", "MouseAction", "Config"],
  "!EnableMouseAction": ["Meter", "MouseAction", "Config"],
  "!ToggleMouseAction": ["Meter", "MouseAction", "Config"]
};

interface BangGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (bang: string) => void;
}

const BangGenerator: React.FC<BangGeneratorProps> = ({ open, onOpenChange, onInsert }) => {
  const [selectedBang, setSelectedBang] = useState<string>("!SetOption");
  const [params, setParams] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    const currentParams = BANGS_META[selectedBang] || [];
    const newParams: Record<string, string> = {};
    currentParams.forEach(p => {
      newParams[p] = params[p] || "";
    });
    updatePreview(selectedBang, newParams);
  }, [selectedBang]);

  const updatePreview = (bang: string, currentParams: Record<string, string>) => {
    const paramNames = BANGS_META[bang] || [];
    const values: string[] = [];
    
    paramNames.forEach(p => {
      let val = currentParams[p]?.trim();
      if (val) {
        if (val.includes(' ') && !val.startsWith('"')) {
          val = `"${val}"`;
        }
        values.push(val);
      }
    });

    setPreview(`[${bang} ${values.join(' ')}]`);
  };

  const handleParamChange = (param: string, value: string) => {
    const newParams = { ...params, [param]: value };
    setParams(newParams);
    updatePreview(selectedBang, newParams);
  };

  const handleInsert = () => {
    onInsert(preview);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rainmeter Bang Generator</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bang-select" className="text-right text-xs font-bold uppercase tracking-wider opacity-70">
              Command
            </Label>
            <Select value={selectedBang} onValueChange={setSelectedBang}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a Bang" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(BANGS_META).sort().map(bang => (
                  <SelectItem key={bang} value={bang}>{bang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-4">
              {BANGS_META[selectedBang]?.map(param => (
                <div key={param} className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs font-bold opacity-70">
                    {param}
                  </Label>
                  <Input
                    className="col-span-3"
                    placeholder={`Optional: ${param}`}
                    value={params[param] || ""}
                    onChange={(e) => handleParamChange(param, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-4 p-4 bg-secondary/50 rounded-md border border-secondary">
            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Preview</Label>
            <code className="text-sm font-mono break-all text-primary">
              {preview}
            </code>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleInsert}>Insert into Editor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BangGenerator;
