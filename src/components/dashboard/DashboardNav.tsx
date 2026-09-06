import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, ClipboardList, Menu, X, Briefcase, LogOut, Megaphone, FileText, Building2, ChevronDown, ChevronRight, UserPlus, Settings, ArrowLeftRight, UsersRound, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanies, useCompanyMemberships } from "@/hooks/useCompanies";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { CommunicationPanel } from "./CommunicationPanel";
import { DocumentSubmissionPanel } from "./DocumentSubmissionPanel";
import { InviteMemberPanel } from "./InviteMemberPanel";
import { MembersPanel } from "./MembersPanel";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export function DashboardNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profileName, signOut } = useAuth();
  const { activeCompanyId, setActiveCompanyId, activeRole } = useCompany();
  const { data: companies = [] } = useCompanies();
  const { data: memberships = [] } = useCompanyMemberships();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const hasMultipleMemberships = memberships.length >= 2;

  const navigation = [
    activeRole === "project_lead" && { name: "Project Manager", href: "/project-lead", icon: Briefcase },
    activeRole === "team_lead" && { name: "Team Lead", href: "/team-lead", icon: Users },
    activeRole === "member" && { name: "My Tasks", href: "/member", icon: ClipboardList },
  ].filter(Boolean) as { name: string; href: string; icon: any }[];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSwitchCompany = () => {
    setActiveCompanyId(null);
    navigate("/companies");
  };

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} onClick={() => setMobileOpen(!mobileOpen)} className="bg-background">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />}

      <nav className={cn(
        "fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-40 w-72 shrink-0 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <Link to="/workspace" className="flex items-center gap-2 mb-1">
              <img src="/brand/bells-icon-transparent.png" alt="" className="h-8 w-8 rounded-lg" />
              <span className="font-bold text-lg">Bells</span>
            </Link>
            <p className="text-[10px] text-muted-foreground leading-tight px-0.5">One workplace. Clear responsibilities.</p>
            {activeCompany && (
              <div className="flex items-center gap-1">
                <button onClick={handleSwitchCompany} className="min-w-0 flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium truncate flex-1 text-left">{activeCompany.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {hasMultipleMemberships && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleSwitchCompany}>
                          <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Switch organization</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Navigation */}
            <div className="p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Dashboard</p>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || location.pathname === "/workspace";
                return (
                  <Link key={item.name} to={item.href} onClick={() => setMobileOpen(false)}
                    className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Communication */}
            {activeCompanyId && (
              <div className="px-3">
                <Collapsible open={commOpen} onOpenChange={setCommOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                    <span className="flex items-center gap-2"><Megaphone className="h-3.5 w-3.5" /> Communication</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", commOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-1 pb-3">
                    <CommunicationPanel />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Documents */}
            {activeCompanyId && (
              <div className="px-3">
                <Collapsible open={storageOpen} onOpenChange={setStorageOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                    <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Documents</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", storageOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-1 pb-3">
                    <DocumentSubmissionPanel />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Members */}
            {activeCompanyId && (
              <div className="px-3">
                <Collapsible open={membersOpen} onOpenChange={setMembersOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                    <span className="flex items-center gap-2"><UsersRound className="h-3.5 w-3.5" /> Members</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", membersOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-1 pb-3 space-y-3">
                    {(activeRole === "project_lead" || activeRole === "team_lead") && (
                      <InviteMemberPanel />
                    )}
                    <MembersPanel />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Settings */}
            {activeCompanyId && (
              <div className="px-3 py-1">
                <Link to="/settings" onClick={() => setMobileOpen(false)}
                  className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}>
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            <div className="flex items-center justify-between px-3">
              <div>
                {profileName && <p className="text-sm font-medium text-foreground">{profileName}</p>}
                <p className="text-xs text-muted-foreground capitalize">{activeRole === "project_lead" ? "Project Manager" : activeRole === "member" ? "Contributor" : activeRole?.replace("_", " ") || "No role"}</p>
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Switch view</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/project-lead")} className={cn(activeRole === "project_lead" && location.pathname === "/project-lead" && "bg-accent")}>
                      <Briefcase className="h-4 w-4 mr-2" /> Project Manager
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/team-lead")} className={cn(activeRole === "team_lead" && location.pathname === "/team-lead" && "bg-accent")}>
                      <Users className="h-4 w-4 mr-2" /> Team Lead
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/member")} className={cn(activeRole === "member" && location.pathname === "/member" && "bg-accent")}>
                      <ClipboardList className="h-4 w-4 mr-2" /> Contributor
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ThemeToggle />
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
}
