import { useState } from "react";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import { Canvas } from "./Canvas";

export function WorkspaceLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 25));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Toolbar */}
      <WorkspaceToolbar
        projectName="Q4 Marketing Report"
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <WorkspaceSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Canvas */}
        <Canvas zoom={zoom} />
      </div>
    </div>
  );
}
