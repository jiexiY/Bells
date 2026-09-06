import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DocumentRow {
  id: string;
  company_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  status: "submitted" | "in_review" | "revision_needed" | "completed";
  submitted_by: string;
  submitted_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnotationRow {
  id: string;
  document_id: string;
  user_id: string;
  user_name: string | null;
  content: string;
  page_number: number | null;
  position_x: number | null;
  position_y: number | null;
  highlight_text: string | null;
  created_at: string;
}

export function useDocuments(companyId?: string) {
  return useQuery({
    queryKey: ["documents", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return Promise.all((data || []).map(async (document) => {
        const { data: signed } = await supabase.storage
          .from("project-files")
          .createSignedUrl(document.file_url, 60 * 60);
        return { ...document, file_url: signed?.signedUrl || "" } as DocumentRow;
      }));
    },
  });
}

export function useDocumentAnnotations(documentId?: string) {
  return useQuery({
    queryKey: ["document_annotations", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_annotations")
        .select("*")
        .eq("document_id", documentId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as AnnotationRow[];
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const { user, profileName } = useAuth();
  return useMutation({
    mutationFn: async ({ file, companyId, projectId, title, description }: {
      file: File; companyId: string; projectId?: string; title: string; description?: string;
    }) => {
      const filePath = `${companyId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("documents").insert({
        company_id: companyId,
        project_id: projectId || null,
        title,
        description: description || null,
        file_url: filePath,
        file_name: file.name,
        file_size: file.size,
        submitted_by: user!.id,
        submitted_by_name: profileName,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useUpdateDocumentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DocumentRow["status"] }) => {
      const { error } = await supabase
        .from("documents")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useCreateAnnotation() {
  const qc = useQueryClient();
  const { user, profileName } = useAuth();
  return useMutation({
    mutationFn: async (annotation: Omit<AnnotationRow, "id" | "created_at" | "user_id" | "user_name">) => {
      const { error } = await supabase
        .from("document_annotations")
        .insert({ ...annotation, user_id: user!.id, user_name: profileName });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document_annotations"] }),
  });
}
