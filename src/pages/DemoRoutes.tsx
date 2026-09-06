import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { DemoOrganizationProvider, useDemoOrganizations } from "@/contexts/DemoOrganizationContext";
import DemoOrganizationPortal from "./DemoOrganizationPortal";
import GuestDemoPage from "./GuestDemoPage";

function DemoWorkspace() {
  const { activeOrganization, selectOrganization } = useDemoOrganizations();
  const navigate = useNavigate();
  if (!activeOrganization) return <Navigate to="/demo" replace />;

  return <GuestDemoPage
    key={activeOrganization.id}
    organizationName={activeOrganization.name}
    storageKey={activeOrganization.isSample ? "bells-demo-v1" : `bells-demo-workspace-${activeOrganization.id}`}
    panelStorageKey={activeOrganization.isSample ? "bells-demo-panels-v1" : `bells-demo-panels-${activeOrganization.id}`}
    initialRole={activeOrganization.role}
    initialDepartment={activeOrganization.department ?? "tech"}
    seedSampleData={activeOrganization.isSample}
    onSwitchOrganization={() => { selectOrganization(null); navigate("/demo"); }}
  />;
}

export default function DemoRoutes() {
  return <DemoOrganizationProvider>
    <Routes>
      <Route index element={<DemoOrganizationPortal />} />
      <Route path="organizations" element={<DemoOrganizationPortal />} />
      <Route path="workspace" element={<DemoWorkspace />} />
      <Route path="*" element={<Navigate to="/demo" replace />} />
    </Routes>
  </DemoOrganizationProvider>;
}
