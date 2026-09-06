import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: string;
  colors: string[];
}

const templates: Template[] = [
  { id: "1", name: "Presentation", category: "Business", colors: ["#0ea5e9", "#06b6d4"] },
  { id: "2", name: "Report", category: "Business", colors: ["#8b5cf6", "#a78bfa"] },
  { id: "3", name: "Infographic", category: "Marketing", colors: ["#f97316", "#fb923c"] },
  { id: "4", name: "Social Post", category: "Social", colors: ["#ec4899", "#f472b6"] },
  { id: "5", name: "Newsletter", category: "Email", colors: ["#10b981", "#34d399"] },
  { id: "6", name: "Flyer", category: "Print", colors: ["#6366f1", "#818cf8"] },
  { id: "7", name: "Resume", category: "Personal", colors: ["#14b8a6", "#2dd4bf"] },
  { id: "8", name: "Poster", category: "Print", colors: ["#f59e0b", "#fbbf24"] },
];

export function TemplateGrid() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["All", "Business", "Marketing", "Social"].map((cat) => (
          <button
            key={cat}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              cat === "All"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {templates.map((template, index) => (
          <button
            key={template.id}
            className="group relative aspect-[4/3] rounded-lg overflow-hidden shadow-card hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})`,
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Template Preview Pattern */}
            <div className="absolute inset-0 p-3 flex flex-col gap-2">
              <div className="w-2/3 h-2 bg-white/30 rounded-full" />
              <div className="w-1/2 h-1.5 bg-white/20 rounded-full" />
              <div className="flex-1 flex gap-2 mt-2">
                <div className="flex-1 bg-white/10 rounded-md" />
                <div className="w-1/3 bg-white/10 rounded-md" />
              </div>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
              <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-foreground/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                {template.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
