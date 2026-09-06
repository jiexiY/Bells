import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileText, Megaphone, MessageSquare, Plus, Send, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SupportView = "dashboard" | "messages" | "announcements" | "documents" | "members" | "settings";
type Message = { id: string; author: string; body: string; createdAt: string };
type Announcement = Message & { title: string };
type DemoDocument = { id: string; title: string; body: string; author: string; createdAt: string };
type PanelData = { version: 1; displayName: string; messages: Message[]; announcements: Announcement[]; documents: DemoDocument[] };

const STORAGE_KEY = "bells-demo-panels-v1";
const ITEM_LIMIT = 100;
const SAMPLE_DATE = "2026-09-05T13:00:00.000Z";
const members = [
  { name: "Employee X", role: "Project Manager", initials: "X" },
  { name: "Employee Y", role: "Team Lead · Tech", initials: "Y" },
  { name: "Employee Z", role: "Team Lead · Marketing", initials: "Z" },
  { name: "You", role: "Guest collaborator", initials: "You" },
];

function defaults(seedSampleData = true): PanelData {
  if (!seedSampleData) return { version: 1, displayName: "You", messages: [], announcements: [], documents: [] };
  return {
    version: 1,
    displayName: "You",
    messages: [
      { id: "message-maya", author: "Employee X", body: "Welcome to our sample workspace. Let's keep questions and project updates in this conversation.", createdAt: SAMPLE_DATE },
      { id: "message-alex", author: "Employee Y", body: "The design brief is in Documents. Take a look before we review the homepage together.", createdAt: "2026-09-05T13:10:00.000Z" },
    ],
    announcements: [
      { id: "announcement-kickoff", title: "A clear plan for the next milestone", author: "Employee X", body: "Review the project brief, choose a task, and share your progress with the team. This is fictional sample content for exploring Bells.", createdAt: SAMPLE_DATE },
    ],
    documents: [
      { id: "document-brief", title: "Project brief", author: "Employee X", createdAt: SAMPLE_DATE, body: "NORTHSTAR STUDIO — SAMPLE PROJECT\n\nGoal\nCreate a welcoming homepage and a simple onboarding experience for a fictional student project team.\n\nDeliverables\n• A homepage concept\n• An onboarding checklist\n• A short team handoff\n\nWorking together\nAdd context to tasks, ask questions in Messages, and submit work for review when it is ready.\n\nThis document is fictional and is stored only in this browser." },
      { id: "document-checklist", title: "Review checklist", author: "Employee Y", createdAt: SAMPLE_DATE, body: "SAMPLE REVIEW CHECKLIST\n\n1. Is the purpose of the work clear?\n2. Can a teammate understand the next step?\n3. Have the relevant notes been included?\n4. Does the work fit the project brief?\n\nUse this fictional checklist while exploring the demo." },
    ],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
function isMessage(value: unknown): value is Message {
  return isObject(value) && isText(value.id, 100) && isText(value.author, 50) && isText(value.body, 1000)
    && isText(value.createdAt, 40) && Number.isFinite(Date.parse(value.createdAt));
}
function isAnnouncement(value: unknown): value is Announcement {
  return isObject(value) && isText(value.title, 120) && isMessage(value);
}
function isDocument(value: unknown): value is DemoDocument {
  return isObject(value) && isText(value.id, 100) && isText(value.title, 120) && isText(value.body, 5000)
    && isText(value.author, 50) && isText(value.createdAt, 40) && Number.isFinite(Date.parse(value.createdAt));
}
function validList<T extends { id: string }>(value: unknown, validate: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.length <= ITEM_LIMIT && value.every(validate)
    && new Set(value.map(item => item.id)).size === value.length;
}
function migrateSampleAuthors<T extends { id: string; author: string }>(items: T[]): T[] {
  const sampleAuthors: Record<string, { previous: string; current: string }> = {
    "message-maya": { previous: "Maya Chen", current: "Employee X" },
    "message-alex": { previous: "Alex Morgan", current: "Employee Y" },
    "announcement-kickoff": { previous: "Maya Chen", current: "Employee X" },
    "document-brief": { previous: "Maya Chen", current: "Employee X" },
    "document-checklist": { previous: "Alex Morgan", current: "Employee Y" },
  };
  return items.map(item => {
    const sample = sampleAuthors[item.id];
    return sample && item.author === sample.previous ? { ...item, author: sample.current } : item;
  });
}
function readSaved(storageKey: string, seedSampleData: boolean): PanelData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw || raw.length > 2000000) return defaults(seedSampleData);
    const parsed: unknown = JSON.parse(raw);
    if (isObject(parsed) && parsed.version === 1 && isText(parsed.displayName, 50)
      && validList(parsed.messages, isMessage) && validList(parsed.announcements, isAnnouncement)
      && validList(parsed.documents, isDocument)) {
      return {
        version: 1,
        displayName: parsed.displayName,
        messages: migrateSampleAuthors(parsed.messages),
        announcements: migrateSampleAuthors(parsed.announcements),
        documents: migrateSampleAuthors(parsed.documents),
      };
    }
  } catch { /* A blocked or malformed browser store must not prevent exploring the demo. */ }
  return defaults(seedSampleData);
}
function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DemoSupportPanels({ view, resetVersion, storageKey = STORAGE_KEY, seedSampleData = true }: { view: SupportView; resetVersion: number; storageKey?: string; seedSampleData?: boolean }) {
  const [data, setData] = useState<PanelData>(() => readSaved(storageKey, seedSampleData));
  const previousReset = useRef(resetVersion);
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState(data.displayName);
  const [editor, setEditor] = useState<"announcement" | "document" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<DemoDocument | null>(null);
  const [error, setError] = useState("");
  const [editorError, setEditorError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  useEffect(() => {
    if (previousReset.current === resetVersion) return;
    previousReset.current = resetVersion;
    setData(defaults(seedSampleData));
    setMessage("");
    setDisplayName("You");
    setEditor(null);
    setPreview(null);
    setTitle("");
    setBody("");
    setError("");
    setEditorError("");
    setNotice("");
  }, [resetVersion, seedSampleData]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      setStorageUnavailable(false);
    } catch { setStorageUnavailable(true); }
  }, [data, storageKey]);

  useEffect(() => {
    setError("");
    setNotice("");
    setEditor(null);
    setPreview(null);
  }, [view]);

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || text.length > 1000) { setError("Enter a message between 1 and 1,000 characters."); return; }
    if (data.messages.length >= ITEM_LIMIT) { setError("This demo holds 100 messages. Reset the demo to start again."); return; }
    setData(current => ({ ...current, messages: [...current.messages, { id: makeId("message"), author: current.displayName, body: text, createdAt: new Date().toISOString() }] }));
    setMessage("");
    setError("");
    setNotice("Demo message added. No message was sent to anyone.");
  }

  function openEditor(kind: "announcement" | "document") {
    setTitle("");
    setBody("");
    setEditorError("");
    setNotice("");
    setEditor(kind);
  }

  function saveEntry(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const limit = editor === "announcement" ? 1000 : 5000;
    if (!trimmedTitle || trimmedTitle.length > 120) { setEditorError("Enter a title between 1 and 120 characters."); return; }
    if (!trimmedBody || trimmedBody.length > limit) { setEditorError(`Enter content between 1 and ${limit.toLocaleString()} characters.`); return; }
    if ((editor === "announcement" ? data.announcements : data.documents).length >= ITEM_LIMIT) { setEditorError("This demo holds 100 items of each type. Reset the demo to start again."); return; }
    const entry = { id: makeId(editor), title: trimmedTitle, body: trimmedBody, author: data.displayName, createdAt: new Date().toISOString() };
    setData(current => editor === "announcement" ? { ...current, announcements: [entry, ...current.announcements] } : { ...current, documents: [entry, ...current.documents] });
    setNotice(editor === "announcement" ? "Demo announcement added in this browser." : "Demo document added in this browser.");
    setEditor(null);
  }

  function saveName(event: FormEvent) {
    event.preventDefault();
    const name = displayName.trim();
    if (!name || name.length > 50) { setError("Enter a display name between 1 and 50 characters."); return; }
    setData(current => ({ ...current, displayName: name }));
    setDisplayName(name);
    setError("");
    setNotice("Demo display name saved. New demo posts will use this name.");
  }

  const sampleNote = <p className="text-sm text-muted-foreground">Fictional sample workspace. Changes stay in this browser.</p>;

  return (
    <div className="min-w-0 space-y-6">
      {storageUnavailable && <p role="status" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground">Browser storage is unavailable. You can explore, but your demo changes may be lost when you leave.</p>}
      {notice && <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">{notice}</p>}

      {view === "dashboard" && <>
        {sampleNote}
        <div className="grid gap-4 sm:grid-cols-3">
          {[{ label: "Team messages", value: data.messages.length, Icon: MessageSquare }, { label: "Announcements", value: data.announcements.length, Icon: Megaphone }, { label: "Shared documents", value: data.documents.length, Icon: FileText }].map(({ label, value, Icon }) => <Card key={label}><CardContent className="flex items-center justify-between gap-3 pt-6"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div><Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /></CardContent></Card>)}
        </div>
        {data.announcements[0] && <Card><CardHeader><CardTitle className="text-base">Latest announcement</CardTitle><CardDescription>{data.announcements[0].author} · {dateLabel(data.announcements[0].createdAt)}</CardDescription></CardHeader><CardContent><h3 className="break-words font-medium">{data.announcements[0].title}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{data.announcements[0].body}</p></CardContent></Card>}
      </>}

      {view === "messages" && <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />Team conversation</CardTitle><CardDescription>Sample messages. Anything you add is stored here locally and is not sent to another person.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="max-h-[420px] space-y-5 overflow-y-auto pr-1" role="log" aria-label="Demo team messages" aria-live="polite">
            {data.messages.map(item => <article key={item.id} className="flex min-w-0 items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary" aria-hidden="true">{members.find(member => member.name === item.author)?.initials ?? item.author.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="break-words text-sm font-medium">{item.author}</span><time className="text-xs text-muted-foreground" dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{item.body}</p></div></article>)}
            {data.messages.length === 0 && <p className="text-sm text-muted-foreground">No demo messages yet. Add the first one below.</p>}
          </div>
          <form onSubmit={sendMessage} className="space-y-3 border-t pt-5">
            <Label htmlFor="demo-message">Your demo message</Label><Textarea id="demo-message" value={message} onChange={event => { setMessage(event.target.value); setError(""); }} placeholder="Share an update or ask a question…" maxLength={1000} rows={3} aria-invalid={Boolean(error)} aria-describedby={error ? "demo-panel-error demo-message-count" : "demo-message-count"} />
            {error && <p id="demo-panel-error" role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3"><span id="demo-message-count" className="text-xs text-muted-foreground">{message.length}/1,000 characters</span><Button type="submit"><Send aria-hidden="true" />Add demo message</Button></div>
          </form>
        </CardContent>
      </Card>}

      {view === "announcements" && <>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">{sampleNote}<Button onClick={() => openEditor("announcement")}><Plus aria-hidden="true" />Add announcement</Button></div>
        <div className="space-y-4">{data.announcements.map(item => <Card key={item.id}><CardHeader><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Megaphone className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><CardTitle className="break-words text-base leading-snug">{item.title}</CardTitle><CardDescription className="mt-1 break-words">{item.author} · {dateLabel(item.createdAt)}</CardDescription></div></div></CardHeader><CardContent><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{item.body}</p></CardContent></Card>)}{data.announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet. Add a local demo announcement to try it.</p>}</div>
      </>}

      {view === "documents" && <>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><p className="text-sm text-muted-foreground">Preview sample documents or create a local text document. Nothing is uploaded.</p><Button onClick={() => openEditor("document")}><Plus aria-hidden="true" />Add document</Button></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.documents.map(item => <Card key={item.id} className="flex min-w-0 flex-col"><CardHeader><FileText className="mb-3 h-8 w-8 text-primary" aria-hidden="true" /><CardTitle className="break-words text-base leading-snug">{item.title}</CardTitle><CardDescription className="break-words">Text document · {item.author}</CardDescription></CardHeader><CardContent className="mt-auto space-y-4"><p className="text-xs text-muted-foreground">{dateLabel(item.createdAt)} · {item.body.length.toLocaleString()} characters</p><Button variant="outline" className="w-full" onClick={() => setPreview(item)} aria-label={`Preview ${item.title}`}>Preview document</Button></CardContent></Card>)}{data.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents yet. Create a text document to explore the preview.</p>}</div>
      </>}

      {view === "members" && <>
        <p className="text-sm text-muted-foreground">Meet the fictional demo team. These profiles do not represent real workspace members.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(seedSampleData ? members : members.filter(member => member.name === "You")).map(member => <Card key={member.name}><CardContent className="flex flex-col items-center gap-3 pt-6 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary" aria-hidden="true">{member.initials}</div><div className="min-w-0 max-w-full"><h3 className="break-words font-medium">{member.name === "You" && data.displayName !== "You" ? `${data.displayName} (You)` : member.name}</h3><p className="mt-1 text-sm text-muted-foreground">{member.role}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{member.name === "You" ? "Your local demo profile" : "Fictional member"}</span></CardContent></Card>)}</div>
        <div className="flex items-start gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground"><Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>Explore how different roles work together. Team invitations and real membership changes require your own workspace.</p></div>
      </>}

      {view === "settings" && <div className="max-w-2xl space-y-5">
        <Card><CardHeader><CardTitle className="text-lg">Demo profile</CardTitle><CardDescription>Your display name is used for new demo messages, announcements, and documents in this browser.</CardDescription></CardHeader><CardContent><form onSubmit={saveName} className="space-y-4"><div className="space-y-2"><Label htmlFor="demo-display-name">Display name</Label><Input id="demo-display-name" value={displayName} onChange={event => { setDisplayName(event.target.value); setError(""); }} maxLength={50} autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error ? "demo-panel-error" : undefined} /></div>{error && <p id="demo-panel-error" role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit">Save demo profile</Button></form></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Appearance</CardTitle><CardDescription>Choose light or dark mode for Bells on this browser.</CardDescription></CardHeader><CardContent className="flex items-center justify-between gap-4"><span className="text-sm">Color theme</span><ThemeToggle /></CardContent></Card>
        <p className="text-sm leading-relaxed text-muted-foreground">This is a local demo profile, with no account or shared workspace attached. Use Reset demo to restore the sample content and display name.</p>
      </div>}

      <Dialog open={editor !== null} onOpenChange={open => { if (!open) setEditor(null); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-lg sm:max-w-lg">
          <DialogHeader><DialogTitle>{editor === "announcement" ? "Add demo announcement" : "Add demo document"}</DialogTitle><DialogDescription>Saved only in this browser. Use fictional content while exploring the demo.</DialogDescription></DialogHeader>
          <form onSubmit={saveEntry} className="space-y-4"><div className="space-y-2"><Label htmlFor="demo-entry-title">Title</Label><Input id="demo-entry-title" value={title} onChange={event => { setTitle(event.target.value); setEditorError(""); }} maxLength={120} autoFocus aria-describedby={editorError ? "demo-editor-error" : undefined} /></div><div className="space-y-2"><Label htmlFor="demo-entry-body">{editor === "announcement" ? "Announcement" : "Document text"}</Label><Textarea id="demo-entry-body" value={body} onChange={event => { setBody(event.target.value); setEditorError(""); }} rows={6} maxLength={editor === "announcement" ? 1000 : 5000} aria-describedby={editorError ? "demo-editor-error demo-entry-count" : "demo-entry-count"} /><p id="demo-entry-count" className="text-xs text-muted-foreground">{body.length.toLocaleString()}/{editor === "announcement" ? "1,000" : "5,000"} characters</p></div>{editorError && <p id="demo-editor-error" role="alert" className="text-sm text-destructive">{editorError}</p>}<DialogFooter className="gap-2"><Button variant="outline" type="button" onClick={() => setEditor(null)}>Cancel</Button><Button type="submit">{editor === "announcement" ? "Add announcement" : "Add document"}</Button></DialogFooter></form>
        </DialogContent>
      </Dialog>

      <Dialog open={preview !== null} onOpenChange={open => { if (!open) setPreview(null); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-lg sm:max-w-xl">
          <DialogHeader><DialogTitle className="break-words pr-5 leading-snug">{preview?.title}</DialogTitle><DialogDescription>Local demo document · {preview?.author}</DialogDescription></DialogHeader><div className="whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">{preview?.body}</div><DialogFooter><Button variant="outline" onClick={() => setPreview(null)}>Close preview</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
