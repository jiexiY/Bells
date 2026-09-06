import { useState, useRef } from "react";
import { useDocuments, useUploadDocument } from "@/hooks/useDocuments";
import { useProjects } from "@/hooks/useProjects";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Upload, FileText, File } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StoragePanel() {
  const { activeCompanyId } = useCompany();
  const { data: documents = [] } = useDocuments(activeCompanyId || undefined);
  const { data: projects = [] } = useProjects();
  const uploadDoc = useUploadDocument();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Group by project, sorted by progress
  const projectDocs = projects
    .sort((a, b) => {
      const order = { assigned: 0, in_progress: 1, complete: 2 };
      return order[a.status] - order[b.status];
    })
    .map(p => ({
      project: p,
      docs: documents.filter(d => d.project_id === p.id),
    }))
    .filter(g => g.docs.length > 0);

  const unlinkedDocs = documents.filter(d => !d.project_id);

  const handleUpload = () => {
    if (!selectedFile || !title.trim() || !activeCompanyId) return;
    uploadDoc.mutate({ file: selectedFile, companyId: activeCompanyId, title }, {
      onSuccess: () => {
        setTitle("");
        setSelectedFile(null);
        setDialogOpen(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FolderOpen className="h-4 w-4" /> Storage
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost"><Upload className="h-4 w-4" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" />
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <Input ref={fileRef} type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploadDoc.isPending}>
                {uploadDoc.isPending ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-4 pr-2">
          {projectDocs.map(({ project, docs }) => (
            <div key={project.id}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {project.name}
                <Badge variant="outline" className="ml-2 text-[10px]">{project.status.replace("_", " ")}</Badge>
              </p>
              <div className="space-y-1.5">
                {docs.map(doc => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-sm">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}

          {unlinkedDocs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">General</p>
              <div className="space-y-1.5">
                {unlinkedDocs.map(doc => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-sm">
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No files uploaded yet</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
