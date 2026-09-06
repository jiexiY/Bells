import { useState } from "react";
import {
  LayoutTemplate,
  Type,
  Image,
  Shapes,
  Upload,
  FolderOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  Grid3X3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateGrid } from "./TemplateGrid";
import { ElementsPanel } from "./ElementsPanel";

interface SidebarItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const sidebarItems: SidebarItem[] = [
  { id: "templates", icon: LayoutTemplate, label: "Templates" },
  { id: "elements", icon: Shapes, label: "Elements" },
  { id: "text", icon: Type, label: "Text" },
  { id: "uploads", icon: Upload, label: "Uploads" },
  { id: "images", icon: Image, label: "Images" },
  { id: "projects", icon: FolderOpen, label: "Projects" },
  { id: "ai", icon: Sparkles, label: "AI Tools" },
];

interface WorkspaceSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function WorkspaceSidebar({ collapsed, onToggle }: WorkspaceSidebarProps) {
  const [activeItem, setActiveItem] = useState("templates");

  const renderPanelContent = () => {
    switch (activeItem) {
      case "templates":
        return <TemplateGrid />;
      case "elements":
        return <ElementsPanel />;
      case "text":
        return (
          <div className="space-y-3">
            <Button variant="secondary" className="w-full justify-start text-left h-auto py-4">
              <div>
                <p className="font-semibold text-lg">Add a heading</p>
                <p className="text-xs text-muted-foreground">Large title text</p>
              </div>
            </Button>
            <Button variant="secondary" className="w-full justify-start text-left h-auto py-3">
              <div>
                <p className="font-medium">Add a subheading</p>
                <p className="text-xs text-muted-foreground">Medium subtitle</p>
              </div>
            </Button>
            <Button variant="secondary" className="w-full justify-start text-left h-auto py-3">
              <div>
                <p className="text-sm">Add body text</p>
                <p className="text-xs text-muted-foreground">Regular paragraph</p>
              </div>
            </Button>
          </div>
        );
      case "ai":
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <Sparkles className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">AI Assistant</h3>
              <p className="text-sm text-muted-foreground">Generate content, images, and layouts with AI</p>
            </div>
            <Button className="w-full" variant="default">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Grid3X3 className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full">
      {/* Icon Rail */}
      <div className="w-[72px] sidebar-bg border-r border-border flex flex-col items-center py-4 gap-1">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveItem(item.id);
              if (collapsed) onToggle();
            }}
            className={cn(
              "w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200",
              "hover:bg-secondary/80",
              activeItem === item.id && !collapsed
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Expandable Panel */}
      <div
        className={cn(
          "sidebar-bg border-r border-border transition-all duration-300 overflow-hidden",
          collapsed ? "w-0" : "w-[280px]"
        )}
      >
        <div className="w-[280px] h-full flex flex-col">
          {/* Panel Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold capitalize">{activeItem}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggle}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeItem}...`}
                className="pl-9 bg-secondary/50 border-0"
              />
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4">{renderPanelContent()}</div>
          </ScrollArea>
        </div>
      </div>

      {/* Collapse Toggle (when collapsed) */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-[72px] top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full shadow-md bg-card border border-border"
          onClick={onToggle}
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
