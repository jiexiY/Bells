import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, MousePointer2, StickyNote, ArrowRightCircle, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CanvasElement {
  id: string;
  type: "rect" | "text" | "image" | "sticky";
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color?: string;
}

interface CanvasProps {
  zoom: number;
}

const stickyColors = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff", "#fed7aa"];

const initialElements: CanvasElement[] = [
  {
    id: "1",
    type: "rect",
    x: 60,
    y: 60,
    width: 600,
    height: 100,
    color: "#0ea5e9",
  },
  {
    id: "2",
    type: "text",
    x: 80,
    y: 90,
    width: 400,
    height: 40,
    content: "Quarterly Business Report",
  },
  {
    id: "sticky-1",
    type: "sticky",
    x: 60,
    y: 200,
    width: 180,
    height: 140,
    content: "Design new landing page layout",
    color: "#fef08a",
  },
  {
    id: "sticky-2",
    type: "sticky",
    x: 260,
    y: 200,
    width: 180,
    height: 140,
    content: "Review Q3 analytics data",
    color: "#bbf7d0",
  },
  {
    id: "sticky-3",
    type: "sticky",
    x: 460,
    y: 200,
    width: 180,
    height: 140,
    content: "Prepare client presentation slides",
    color: "#bfdbfe",
  },
  {
    id: "sticky-4",
    type: "sticky",
    x: 60,
    y: 370,
    width: 180,
    height: 140,
    content: "Research competitor pricing strategies",
    color: "#e9d5ff",
  },
  {
    id: "sticky-5",
    type: "sticky",
    x: 260,
    y: 370,
    width: 180,
    height: 140,
    content: "Update team onboarding documentation",
    color: "#fed7aa",
  },
];

export function Canvas({ zoom }: CanvasProps) {
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingElement, setConvertingElement] = useState<CanvasElement | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const scale = zoom / 100;

  const selectedElement = elements.find(e => e.id === selectedId);

  const handleAddSticky = () => {
    const randomColor = stickyColors[Math.floor(Math.random() * stickyColors.length)];
    const newSticky: CanvasElement = {
      id: `sticky-${Date.now()}`,
      type: "sticky",
      x: 100 + Math.random() * 300,
      y: 200 + Math.random() * 200,
      width: 180,
      height: 140,
      content: "New idea...",
      color: randomColor,
    };
    setElements(prev => [...prev, newSticky]);
    setSelectedId(newSticky.id);
  };

  const handleConvertToTask = (element: CanvasElement) => {
    setConvertingElement(element);
    setTaskTitle(element.content || "");
    setTaskDescription(`Converted from canvas idea: ${element.content || ""}`);
    setConvertDialogOpen(true);
  };

  const handleConfirmConvert = () => {
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    // In a real implementation, this would create a task via the API
    toast.success("Canvas idea converted to task!", {
      description: `"${taskTitle}" has been created as a new task.`,
    });
    // Remove the sticky from canvas after conversion
    if (convertingElement) {
      setElements(prev => prev.filter(e => e.id !== convertingElement.id));
    }
    setConvertDialogOpen(false);
    setConvertingElement(null);
    setSelectedId(null);
    setTaskTitle("");
    setTaskDescription("");
  };

  const handleDeleteElement = () => {
    if (selectedId) {
      setElements(prev => prev.filter(e => e.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleEditContent = (id: string, content: string) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, content } : e));
  };

  return (
    <div className="flex-1 canvas-bg overflow-auto p-8">
      {/* Floating Add Sticky Button */}
      <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-2">
        <Button
          onClick={handleAddSticky}
          className="rounded-full shadow-lg gap-2"
          size="sm"
        >
          <StickyNote className="w-4 h-4" />
          Add Sticky Note
        </Button>
      </div>

      {/* Canvas Container */}
      <div
        className="mx-auto transition-transform duration-200 origin-top"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Document */}
        <div
          className={cn(
            "relative bg-card shadow-lg rounded-sm overflow-hidden",
            "transition-shadow duration-200"
          )}
          style={{
            width: 720,
            height: 560,
          }}
          onClick={() => setSelectedId(null)}
        >
          {/* Grid Pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
            }}
          />

          {/* Elements */}
          {elements.map((element) => (
            <div
              key={element.id}
              className={cn(
                "absolute cursor-pointer transition-all duration-150",
                selectedId === element.id &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-card",
                element.type === "sticky" && "rounded-lg shadow-md"
              )}
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                backgroundColor:
                  element.type === "rect" ? element.color :
                  element.type === "sticky" ? element.color :
                  "transparent",
                borderRadius: element.type === "rect" ? 8 : element.type === "sticky" ? 8 : 0,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(element.id);
              }}
            >
              {element.type === "text" && (
                <span className="text-2xl font-bold text-primary-foreground drop-shadow-sm">
                  {element.content}
                </span>
              )}

              {element.type === "sticky" && (
                <div className="p-3 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-1">
                    <GripVertical className="w-3 h-3 text-black/20" />
                    {selectedId === element.id && (
                      <div className="flex gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConvertToTask(element); }}
                          className="p-1 rounded hover:bg-black/10 transition-colors"
                          title="Convert to Task"
                        >
                          <ArrowRightCircle className="w-3.5 h-3.5 text-black/50" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteElement(); }}
                          className="p-1 rounded hover:bg-black/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-black/50" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="flex-1 text-sm text-black/80 font-medium leading-snug outline-none"
                    onBlur={(e) => handleEditContent(element.id, e.currentTarget.textContent || "")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {element.content}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-black/30 uppercase tracking-wider font-semibold">Canvas Idea</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConvertToTask(element); }}
                      className="text-[9px] text-black/40 hover:text-black/70 font-medium transition-colors"
                    >
                      → Convert to Task
                    </button>
                  </div>
                </div>
              )}

              {/* Resize Handles (when selected) */}
              {selectedId === element.id && element.type !== "sticky" && (
                <>
                  {["nw", "ne", "sw", "se"].map((pos) => (
                    <div
                      key={pos}
                      className={cn(
                        "absolute w-3 h-3 bg-primary rounded-full border-2 border-primary-foreground shadow-md",
                        pos.includes("n") ? "-top-1.5" : "-bottom-1.5",
                        pos.includes("w") ? "-left-1.5" : "-right-1.5"
                      )}
                    />
                  ))}
                </>
              )}
            </div>
          ))}

          {/* Empty State Hint */}
          {elements.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Plus className="w-8 h-8" />
              </div>
              <p className="font-medium">Start ideating</p>
              <p className="text-sm">Add sticky notes to capture ideas, then convert them to tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Selection Info */}
      {selectedId && selectedElement?.type !== "sticky" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 animate-fade-in">
          <MousePointer2 className="w-4 h-4" />
          Element selected — Press Delete to remove
        </div>
      )}

      {/* Convert to Task Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightCircle className="w-5 h-5 text-primary" />
              Convert Canvas Idea to Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg border border-border bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Original Canvas Idea</p>
              <p className="text-sm font-medium">{convertingElement?.content}</p>
            </div>
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Enter task title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} placeholder="Task description..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmConvert} className="gap-2">
              <ArrowRightCircle className="w-4 h-4" />
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
