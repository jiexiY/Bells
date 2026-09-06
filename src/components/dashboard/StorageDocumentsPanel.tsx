import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoragePanel } from "./StoragePanel";
import { DocumentSubmissionPanel } from "./DocumentSubmissionPanel";

export function StorageDocumentsPanel() {
  return (
    <Tabs defaultValue="storage" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="storage" className="flex-1">Storage</TabsTrigger>
        <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
      </TabsList>
      <TabsContent value="storage">
        <StoragePanel />
      </TabsContent>
      <TabsContent value="documents">
        <DocumentSubmissionPanel />
      </TabsContent>
    </Tabs>
  );
}
