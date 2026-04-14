import React, { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useSkinMetadata } from '@/context/SkinMetadataContext'

interface ExportModalProps {
  onExport: () => Promise<boolean>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ onExport, open, onOpenChange }) => {
  const { metadata, updateMetadata } = useSkinMetadata();

  const handleExport = async () => {
    const success = await onExport()
    if (success) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Rainmeter Skin</DialogTitle>
          <DialogDescription>
            Enter metadata for your Rainmeter skin. Click export when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={metadata.name}
              onChange={(e) => updateMetadata({ name: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="author" className="text-right">
              Author
            </Label>
            <Input
              id="author"
              value={metadata.author}
              onChange={(e) => updateMetadata({ author: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="version" className="text-right">
              Version
            </Label>
            <Input
              id="version"
              value={metadata.version}
              onChange={(e) => updateMetadata({ version: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={metadata.description}
              onChange={(e) => updateMetadata({ description: e.target.value })}
              className="col-span-3"
            />
          </div>
          <Separator />
          <div className="flex flex-col items-center gap-4 justify-center">
            <div>
              <Checkbox 
                id="allowScrollResize" 
                checked={metadata.allowScrollResize}
                onCheckedChange={(checked) => updateMetadata({ allowScrollResize: checked as boolean })}
              />
              <label
                htmlFor="allowScrollResize"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-2"
              >
                Allow Mouse Scroll Resize
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleExport}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ExportModal