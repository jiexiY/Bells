import {
  Square,
  Circle,
  Triangle,
  Star,
  Hexagon,
  Heart,
  ArrowRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ElementCategory {
  name: string;
  elements: {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }[];
}

const categories: ElementCategory[] = [
  {
    name: "Shapes",
    elements: [
      { id: "rect", icon: Square, label: "Rectangle" },
      { id: "circle", icon: Circle, label: "Circle" },
      { id: "triangle", icon: Triangle, label: "Triangle" },
      { id: "star", icon: Star, label: "Star" },
      { id: "hexagon", icon: Hexagon, label: "Hexagon" },
      { id: "heart", icon: Heart, label: "Heart" },
    ],
  },
  {
    name: "Lines & Arrows",
    elements: [
      { id: "line", icon: Minus, label: "Line" },
      { id: "arrow", icon: ArrowRight, label: "Arrow" },
    ],
  },
];

export function ElementsPanel() {
  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.name}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {category.name}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {category.elements.map((element) => (
              <button
                key={element.id}
                className={cn(
                  "aspect-square rounded-lg bg-secondary/50 hover:bg-secondary",
                  "flex flex-col items-center justify-center gap-1.5 transition-all duration-200",
                  "hover:shadow-card hover:-translate-y-0.5 group"
                )}
              >
                <element.icon className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                  {element.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Color Presets */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Quick Colors
        </h3>
        <div className="flex gap-2 flex-wrap">
          {[
            "#0ea5e9",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#8b5cf6",
            "#ec4899",
            "#06b6d4",
            "#84cc16",
          ].map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded-lg shadow-sm hover:scale-110 transition-transform ring-2 ring-transparent hover:ring-primary/30"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
