import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  MoreHorizontal,
  Play,
  Grid3X3,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

function ToolbarButton({ icon: Icon, label, onClick, disabled }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface WorkspaceToolbarProps {
  projectName: string;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function WorkspaceToolbar({
  projectName,
  zoom,
  onZoomIn,
  onZoomOut,
}: WorkspaceToolbarProps) {
  return (
    <header className="h-14 toolbar-bg border-b border-border flex items-center px-4 gap-2 shadow-toolbar">
      {/* Project Info */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
          <Layers className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">{projectName}</h1>
          <p className="text-xs text-muted-foreground">Last edited 2 min ago</p>
        </div>
      </div>

      <Separator orientation="vertical" className="h-8 mx-2" />

      {/* History Actions */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton icon={Undo2} label="Undo (Ctrl+Z)" />
        <ToolbarButton icon={Redo2} label="Redo (Ctrl+Y)" />
      </div>

      <Separator orientation="vertical" className="h-8 mx-2" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <ToolbarButton icon={ZoomOut} label="Zoom Out" onClick={onZoomOut} />
        <span className="text-sm font-medium w-14 text-center tabular-nums">
          {zoom}%
        </span>
        <ToolbarButton icon={ZoomIn} label="Zoom In" onClick={onZoomIn} />
      </div>

      <Separator orientation="vertical" className="h-8 mx-2" />

      {/* View Options */}
      <ToolbarButton icon={Grid3X3} label="Toggle Grid" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Play className="w-3.5 h-3.5" />
          Present
        </Button>

        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-3.5 h-3.5" />
          Share
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>PNG Image</DropdownMenuItem>
            <DropdownMenuItem>JPG Image</DropdownMenuItem>
            <DropdownMenuItem>PDF Document</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>SVG Vector</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
