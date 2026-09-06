import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InviteMemberPanel } from "@/components/dashboard/InviteMemberPanel";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanies, useCompanyMemberships, useCreateCompany } from "@/hooks/useCompanies";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import {
  User,
  Settings,
  Activity,
  Bell,
  Shield,
  Building2,
  ArrowLeft,
  Camera,
  Globe,
  Sun,
  Moon,
  Lock,
  Plus,
  Circle,
  XCircle,
  ArrowRightLeft,
  LogOut,
  UserPlus,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { id: "profile", label: "Profile", icon: User },
  { id: "general", label: "General", icon: Settings },
  { id: "status", label: "Status", icon: Activity },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "workspaces", label: "Workspaces", icon: Building2 },
];

const timezones = [
  "Eastern Time (ET) — UTC-5",
  "Central Time (CT) — UTC-6",
  "Mountain Time (MT) — UTC-7",
  "Pacific Time (PT) — UTC-8",
  "GMT — UTC+0",
  "Central European (CET) — UTC+1",
  "India Standard (IST) — UTC+5:30",
  "Japan Standard (JST) — UTC+9",
];

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "ar", label: "العربية" },
];

const statusOptions = [
  { value: "active", label: "Active", color: "bg-green-500", description: "You're available and online" },
  { value: "away", label: "Away", color: "bg-yellow-500", description: "You're temporarily away" },
  { value: "vacation", label: "Vacation", color: "bg-orange-500", description: "You're on vacation" },
];

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  bio: string;
  job_title: string;
  timezone: string;
  avatar_url: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setActiveCompanyId } = useCompany();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { data: companies = [] } = useCompanies();
  const { data: memberships = [] } = useCompanyMemberships();
  const createCompany = useCreateCompany();
  const [sendingInvite, setSendingInvite] = useState(false);

  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: "", email: "", phone: "", bio: "", job_title: "", timezone: "", avatar_url: "",
  });
  const [language, setLanguage] = useState("en");
  const [userStatus, setUserStatus] = useState("active");

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Workspaces
  const [newWsDialogOpen, setNewWsDialogOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsRole, setNewWsRole] = useState<"project_lead" | "team_lead" | "member">("project_lead");
  const [closeWsDialogOpen, setCloseWsDialogOpen] = useState(false);
  const [closingWsId, setClosingWsId] = useState<string | null>(null);
  const [closingWs, setClosingWs] = useState(false);
  
  // Transfer Role
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferringWsId, setTransferringWsId] = useState<string | null>(null);
  const [transferTargetUserId, setTransferTargetUserId] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ user_id: string; name: string; email: string; role: string }>>([]);
  
  // Post-transfer choice dialog
  const [postTransferDialogOpen, setPostTransferDialogOpen] = useState(false);
  const [postTransferWsId, setPostTransferWsId] = useState<string | null>(null);
  const [postTransferChoice, setPostTransferChoice] = useState<"stay" | "leave" | null>(null);
  const [processingChoice, setProcessingChoice] = useState(false);
  
  // Leave Workspace
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leavingWsId, setLeavingWsId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Add Member
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [addMemberWsId, setAddMemberWsId] = useState<string | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<"team_lead" | "member">("member");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, email, phone, bio, job_title, timezone, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({
            name: data.name || "",
            email: data.email || "",
            phone: (data as any).phone || "",
            bio: (data as any).bio || "",
            job_title: (data as any).job_title || "",
            timezone: (data as any).timezone || "",
            avatar_url: (data as any).avatar_url || "",
          });
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        phone: profile.phone,
        bio: profile.bio,
        job_title: profile.job_title,
        timezone: profile.timezone,
        avatar_url: profile.avatar_url,
      } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Profile updated successfully." });
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleCreateWorkspace = () => {
    if (!newWsName.trim()) return;
    createCompany.mutate(
      { name: newWsName, role: "project_lead" },
      {
        onSuccess: () => {
          setNewWsName("");
          setNewWsDialogOpen(false);
          toast({ title: "Created", description: "Workspace created successfully." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create workspace.", variant: "destructive" });
        },
      }
    );
  };

  const handleCloseWorkspace = async () => {
    if (!closingWsId || !user) return;
    setClosingWs(true);
    const { error } = await supabase.rpc("close_company_workspace", {
      _company_id: closingWsId,
    });
    setClosingWs(false);
    if (error) {
      toast({ title: "Error", description: "Failed to close workspace.", variant: "destructive" });
    } else {
      toast({ title: "Workspace closed", description: "The workspace has been deactivated for all members." });
      setCloseWsDialogOpen(false);
      setClosingWsId(null);
      window.location.reload();
    }
  };

  const loadWorkspaceMembers = async (companyId: string) => {
    // Get all memberships for this company
    const { data: allMemberships } = await supabase
      .from("company_memberships")
      .select("user_id, role")
      .eq("company_id", companyId)
      .eq("is_active", true);
    
    if (!allMemberships) return;
    
    // Get profiles for these users
    const userIds = allMemberships.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .in("user_id", userIds);
    
    const members = allMemberships
      .filter(m => m.user_id !== user?.id) // Exclude current user
      .filter(m => m.role === "member" || m.role === "team_lead") // Include team members and team leads as transfer options
      .map(m => {
        const profile = profiles?.find(p => p.user_id === m.user_id);
        return {
          user_id: m.user_id,
          name: profile?.name || "Unknown",
          email: profile?.email || "",
          role: m.role,
        };
      });
    
    setWorkspaceMembers(members);
  };

  const handleTransferRole = async () => {
    if (!transferringWsId || !transferTargetUserId) return;
    setTransferring(true);
    const { error } = await supabase.rpc("transfer_role_to_member", {
      _company_id: transferringWsId,
      _target_user_id: transferTargetUserId,
    });
    setTransferring(false);
    if (error) {
      toast({ title: "Error", description: error.message || "Failed to transfer role.", variant: "destructive" });
    } else {
      toast({ title: "Role transferred", description: "Your role has been transferred successfully." });
      setTransferDialogOpen(false);
      setPostTransferWsId(transferringWsId);
      setTransferringWsId(null);
      setTransferTargetUserId("");
      setPostTransferDialogOpen(true);
    }
  };

  const handlePostTransferChoice = async () => {
    if (!postTransferWsId || !postTransferChoice) return;
    setProcessingChoice(true);
    
    if (postTransferChoice === "leave") {
      const { error } = await supabase.rpc("leave_workspace", {
        _company_id: postTransferWsId,
      });
      if (error) {
        toast({ title: "Error", description: error.message || "Failed to leave workspace.", variant: "destructive" });
      } else {
        toast({ title: "Left workspace", description: "You have left the workspace." });
      }
    }
    
    setProcessingChoice(false);
    setPostTransferDialogOpen(false);
    setPostTransferWsId(null);
    setPostTransferChoice(null);
    window.location.reload();
  };

  const handleLeaveWorkspace = async () => {
    if (!leavingWsId) return;
    setLeaving(true);
    const { error } = await supabase.rpc("leave_workspace", {
      _company_id: leavingWsId,
    });
    setLeaving(false);
    if (error) {
      toast({ title: "Error", description: error.message || "Failed to leave workspace.", variant: "destructive" });
    } else {
      toast({ title: "Left workspace", description: "You have left the workspace." });
      setLeaveDialogOpen(false);
      setLeavingWsId(null);
      window.location.reload();
    }
  };

  const nameParts = profile.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const initials = (firstName[0] || "") + (lastName[0] || "");

  const setFirstName = (v: string) =>
    setProfile((p) => ({ ...p, name: `${v} ${lastName}`.trim() }));
  const setLastName = (v: string) =>
    setProfile((p) => ({ ...p, name: `${firstName} ${v}`.trim() }));

  const currentStatus = statusOptions.find((s) => s.value === userStatus) || statusOptions[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">W</span>
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", currentStatus.color)} />
            {currentStatus.label}
          </span>
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-muted text-xs font-medium">
              {initials.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="flex flex-col md:flex-row max-w-6xl mx-auto min-w-0">
        {/* Sidebar */}
        <nav className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r min-h-0 md:min-h-[calc(100vh-65px)] p-2 md:p-4 flex md:block gap-1 overflow-x-auto space-y-0 md:space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-2 md:gap-3 shrink-0 md:w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1 p-3 sm:p-5 md:p-8">
          {/* ===== PROFILE ===== */}
          {activeTab === "profile" && (
            <div className="bg-card border rounded-xl p-4 sm:p-6 md:p-8 max-w-3xl w-full min-w-0">
              <h2 className="text-xl font-semibold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage how others see you in your workspace.</p>
              <Separator className="my-6" />

              <div className="flex items-center gap-5 mb-8">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                      {initials.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-card border flex items-center justify-center shadow-sm hover:bg-muted transition-colors">
                    <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div>
                  <p className="font-medium text-foreground">Profile photo</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG or GIF. Max 5MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2 mb-6 max-w-sm">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> Job title
                </Label>
                <Input
                  value={profile.job_title}
                  onChange={(e) => setProfile((p) => ({ ...p, job_title: e.target.value }))}
                  placeholder="e.g. Product Designer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="opacity-60" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-1">
                <Label>Bio</Label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">Brief description for your profile.</p>
              </div>

              <div className="space-y-2 mb-8 max-w-sm mt-6">
                <Label>Time zone</Label>
                <Select value={profile.timezone} onValueChange={(v) => setProfile((p) => ({ ...p, timezone: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="mb-6" />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
              </div>
            </div>
          )}

          {/* ===== GENERAL ===== */}
          {activeTab === "general" && (
            <div className="bg-card border rounded-xl p-4 sm:p-6 md:p-8 max-w-3xl w-full min-w-0 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground">General</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your language and appearance preferences.</p>
              </div>

              <Separator />

              {/* Language */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-muted-foreground" /> Language
                </Label>
                <p className="text-sm text-muted-foreground">Select your preferred language for the interface.</p>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Theme */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-base">
                  <Sun className="h-4 w-4 text-muted-foreground" /> Appearance
                </Label>
                <p className="text-sm text-muted-foreground">Choose between light and dark mode.</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors w-32",
                      theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="h-16 w-full rounded-lg bg-white border flex items-center justify-center">
                      <Sun className="h-6 w-6 text-yellow-500" />
                    </div>
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors w-32",
                      theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="h-16 w-full rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center">
                      <Moon className="h-6 w-6 text-blue-300" />
                    </div>
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors w-32",
                      theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="h-16 w-full rounded-lg bg-gradient-to-r from-white to-gray-900 border flex items-center justify-center">
                      <Settings className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== STATUS ===== */}
          {activeTab === "status" && (
            <div className="bg-card border rounded-xl p-4 sm:p-6 md:p-8 max-w-3xl w-full min-w-0 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Status</h2>
                <p className="text-sm text-muted-foreground mt-1">Set your current availability status. This will be visible to your teammates.</p>
              </div>

              <Separator />

              <RadioGroup value={userStatus} onValueChange={setUserStatus} className="space-y-3">
                {statusOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      userStatus === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <RadioGroupItem value={opt.value} />
                    <span className={cn("h-3 w-3 rounded-full shrink-0", opt.color)} />
                    <div>
                      <p className="font-medium text-foreground">{opt.label}</p>
                      <p className="text-sm text-muted-foreground">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <span className={cn("h-3 w-3 rounded-full", currentStatus.color)} />
                <p className="text-sm text-foreground">
                  Your status is currently set to <span className="font-semibold">{currentStatus.label}</span>
                </p>
              </div>
            </div>
          )}

          {/* ===== NOTIFICATIONS ===== */}
          {activeTab === "notifications" && (
            <div className="bg-card border rounded-xl p-4 sm:p-6 md:p-8 max-w-3xl w-full min-w-0 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
                <p className="text-sm text-muted-foreground mt-1">Configure how you receive notifications.</p>
              </div>
              <Separator />
              <div className="space-y-4">
                {[
                  { label: "Email notifications", desc: "Receive email updates for important events" },
                  { label: "Task assignments", desc: "Get notified when a task is assigned to you" },
                  { label: "Announcements", desc: "Receive notifications for new announcements" },
                  { label: "Direct messages", desc: "Get notified for new direct messages" },
                  { label: "Document updates", desc: "Receive alerts when documents are updated" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== SECURITY ===== */}
          {activeTab === "security" && (
            <div className="bg-card border rounded-xl p-4 sm:p-6 md:p-8 max-w-3xl w-full min-w-0 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Security</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your password and account security.</p>
              </div>

              <Separator />

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Change password</p>
                    <p className="text-sm text-muted-foreground">Update your password to keep your account secure.</p>
                  </div>
                </div>

                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Current password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm new password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !newPassword || !confirmPassword}
                  >
                    {changingPassword ? "Changing..." : "Update password"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="font-medium text-foreground">Account</p>
                <p className="text-sm text-muted-foreground">
                  Signed in as <span className="font-medium text-foreground">{profile.email}</span>
                </p>
              </div>
            </div>
          )}

          {/* ===== WORKSPACES ===== */}
          {activeTab === "workspaces" && (
            <div className="bg-card border rounded-xl p-4 sm:p-6 md:p-8 max-w-3xl w-full min-w-0 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Workspaces</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage your organizations and workspaces.</p>
                </div>
                <Dialog open={newWsDialogOpen} onOpenChange={setNewWsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New workspace</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create workspace</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Workspace name</Label>
                        <Input
                          value={newWsName}
                          onChange={(e) => setNewWsName(e.target.value)}
                          placeholder="e.g. Acme Corp"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">You will manage this workspace and invite your team.</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewWsDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateWorkspace} disabled={createCompany.isPending}>
                        {createCompany.isPending ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              <div className="space-y-3">
                {memberships.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No workspaces yet. Create one to get started.</p>
                )}
                {memberships.map((m) => {
                  const company = companies.find((c) => c.id === m.company_id);
                  const isProjectLead = m.role === "project_lead";
                  return (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{company?.name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground capitalize">{m.role.replace("_", " ")}{m.department ? ` · ${m.department}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded-full",
                          m.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                        {m.is_active && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => {
                                setActiveCompanyId(m.company_id);
                                setAddMemberWsId(m.company_id);
                                setAddMemberEmail("");
                                setAddMemberRole("member");
                                setAddMemberDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-3.5 w-3.5 mr-1" />
                              Add
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={async () => {
                                setTransferringWsId(m.company_id);
                                await loadWorkspaceMembers(m.company_id);
                                setTransferDialogOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                              Transfer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs"
                              onClick={() => {
                                setLeavingWsId(m.company_id);
                                setLeaveDialogOpen(true);
                              }}
                            >
                              <LogOut className="h-3.5 w-3.5 mr-1" />
                              Leave
                            </Button>
                            {isProjectLead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs"
                                onClick={() => {
                                  setClosingWsId(m.company_id);
                                  setCloseWsDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Close
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Close Workspace Confirmation */}
      <AlertDialog open={closeWsDialogOpen} onOpenChange={setCloseWsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the workspace. You and your team members will no longer be able to access it. This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClosingWsId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseWorkspace}
              disabled={closingWs}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {closingWs ? "Closing..." : "Close workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Role Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer your role</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a workspace member to transfer your role to. You will be downgraded to a member role.
            </p>
            <div className="space-y-2">
              <Label>Select member</Label>
              <Select value={transferTargetUserId} onValueChange={setTransferTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent>
                  {workspaceMembers.length === 0 ? (
                    <SelectItem value="none" disabled>No other members available</SelectItem>
                  ) : (
                    workspaceMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.name} ({member.email}) - {member.role.replace("_", " ")}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setTransferDialogOpen(false);
              setTransferringWsId(null);
              setTransferTargetUserId("");
            }}>Cancel</Button>
            <Button 
              onClick={handleTransferRole} 
              disabled={transferring || !transferTargetUserId || workspaceMembers.length === 0}
            >
              {transferring ? "Transferring..." : "Transfer role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Workspace Confirmation */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer have access to this workspace. If you are a project lead, you must transfer your role first unless there is another project lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeavingWsId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveWorkspace}
              disabled={leaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leaving ? "Leaving..." : "Leave workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Invite people to {companies.find(company => company.id === addMemberWsId)?.name}</DialogTitle></DialogHeader>
          <InviteMemberPanel key={addMemberWsId} />
        </DialogContent>
      </Dialog>

      {/* Post-Transfer Choice Dialog */}
      <Dialog open={postTransferDialogOpen} onOpenChange={setPostTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What would you like to do next?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Your role has been successfully transferred. You can either stay as a team member or leave the organization.
            </p>
            <RadioGroup value={postTransferChoice || ""} onValueChange={(value) => setPostTransferChoice(value as "stay" | "leave")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stay" id="stay" />
                <Label htmlFor="stay" className="font-normal">Stay as a team member</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="leave" id="leave" />
                <Label htmlFor="leave" className="font-normal">Leave the organization</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button 
              onClick={handlePostTransferChoice} 
              disabled={processingChoice || !postTransferChoice}
            >
              {processingChoice ? "Processing..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
