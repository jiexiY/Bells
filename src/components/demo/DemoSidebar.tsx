import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  LayoutDashboard,
  LogIn,
  Megaphone,
  Menu,
  MessageSquare,
  Settings,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";

export type DemoView = "dashboard" | "messages" | "announcements" | "documents" | "members" | "settings";
export type DemoRole = "project_lead" | "team_lead" | "member";

export interface DemoSidebarProps {
  view: DemoView;
  onViewChange: (view: DemoView) => void;
  role: DemoRole;
  onRoleChange: (role: DemoRole) => void;
  organizationName?: string;
  onSwitchOrganization?: () => void;
}

const roleOptions = [
  { value: "project_lead", label: "Project Manager", navigation: "Project Manager", icon: Briefcase },
  { value: "team_lead", label: "Team Lead", navigation: "Team Lead", icon: Users },
  { value: "member", label: "Contributor", navigation: "My Tasks", icon: ClipboardList },
] as const;

export function DemoSidebar({ view, onViewChange, role, onRoleChange, organizationName = "Bells Demo Organization", onSwitchOrganization }: DemoSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [communicationOpen, setCommunicationOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const selectedRole = roleOptions.find((option) => option.value === role) ?? roleOptions[0];
  const RoleIcon = selectedRole.icon;

  useEffect(() => {
    if (view === "messages" || view === "announcements") setCommunicationOpen(true);
  }, [view]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const desktopMedia = window.matchMedia("(min-width: 1024px)");
    document.body.style.overflow = "hidden";
    menuButtonRef.current?.focus();

    const isInsideNavigation = (target: EventTarget | null) => target instanceof HTMLElement && (
      target === menuButtonRef.current || navigationRef.current?.contains(target) || target.closest("[data-demo-role-menu]")
    );
    const handleFocus = (event: FocusEvent) => {
      if (!isInsideNavigation(event.target)) menuButtonRef.current?.focus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      // The portaled role menu manages its own keyboard navigation and Escape.
      if (event.target instanceof HTMLElement && event.target.closest("[data-demo-role-menu]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
      if (event.key === "Tab") {
        const controls = [
          menuButtonRef.current,
          ...Array.from(navigationRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? []),
        ].filter((element): element is HTMLElement => Boolean(element && element.getClientRects().length));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const handleDesktopResize = () => {
      if (desktopMedia.matches) setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocus);
    desktopMedia.addEventListener("change", handleDesktopResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocus);
      desktopMedia.removeEventListener("change", handleDesktopResize);
      if (previousFocus?.isConnected && previousFocus.getClientRects().length) previousFocus.focus();
      else if (!desktopMedia.matches) menuButtonRef.current?.focus();
    };
  }, [mobileOpen]);

  const navigate = (nextView: DemoView) => {
    onViewChange(nextView);
    setMobileOpen(false);
  };

  const navigationClass = (target: DemoView) => cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    view === target
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

  return (
    <>
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <Button
          ref={menuButtonRef}
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen((open) => !open)}
          className="bg-background"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          aria-controls="bells-demo-navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
          tabIndex={-1}
        />
      )}

      <nav
        ref={navigationRef}
        id="bells-demo-navigation"
        aria-label="Demo workspace navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:visible lg:translate-x-0",
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full",
        )}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="border-b border-border p-4">
            <button
              type="button"
              onClick={() => navigate("dashboard")}
              className="mb-1 ml-12 flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:ml-0"
              aria-label="Bells demo dashboard"
            >
              <img src="/brand/bells-icon-transparent.png" alt="" className="h-8 w-8 rounded-lg" />
              <span className="text-lg font-bold">Bells</span>
            </button>
            <p className="mb-2 ml-12 px-0.5 text-[10px] leading-tight text-muted-foreground lg:ml-0">Team Workspace · Guest Demo</p>
            <button type="button" onClick={() => { setMobileOpen(false); onSwitchOrganization?.(); }} disabled={!onSwitchOrganization} aria-label={`Switch organization: ${organizationName}`} className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2 text-left text-sm transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate font-medium">{organizationName}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1 p-3">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dashboard</p>
              <button type="button" onClick={() => navigate("dashboard")} className={navigationClass("dashboard")} aria-current={view === "dashboard" ? "page" : undefined}>
                <RoleIcon className="h-4 w-4" />
                {selectedRole.navigation}
              </button>
            </div>

            <div className="px-3">
              <Collapsible open={communicationOpen} onOpenChange={setCommunicationOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="flex items-center gap-2"><Megaphone className="h-3.5 w-3.5" /> Communication</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", communicationOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 px-1 pb-3">
                  <button type="button" onClick={() => navigate("messages")} className={navigationClass("messages")} aria-current={view === "messages" ? "page" : undefined}>
                    <MessageSquare className="h-4 w-4" /> Messages
                  </button>
                  <button type="button" onClick={() => navigate("announcements")} className={navigationClass("announcements")} aria-current={view === "announcements" ? "page" : undefined}>
                    <Megaphone className="h-4 w-4" /> Announcements
                  </button>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="space-y-1 px-3">
              <button type="button" onClick={() => navigate("documents")} className={navigationClass("documents")} aria-current={view === "documents" ? "page" : undefined}>
                <FileText className="h-4 w-4" /> Documents
              </button>
              <button type="button" onClick={() => navigate("members")} className={navigationClass("members")} aria-current={view === "members" ? "page" : undefined}>
                <UsersRound className="h-4 w-4" /> Members
              </button>
            </div>

            <div className="px-3 py-1">
              <button type="button" onClick={() => navigate("settings")} className={navigationClass("settings")} aria-current={view === "settings" ? "page" : undefined}>
                <Settings className="h-4 w-4" /> Settings
              </button>
            </div>
          </div>

          <div className="space-y-2 border-t border-border p-4">
            <div className="flex items-center justify-between px-3">
              <div>
                <p className="text-sm font-medium text-foreground">You</p>
                <p className="text-xs text-muted-foreground">{selectedRole.label}</p>
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Switch demo role">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    data-demo-role-menu
                    onCloseAutoFocus={(event) => {
                      if (!mobileOpen && window.matchMedia("(max-width: 1023px)").matches) {
                        event.preventDefault();
                        menuButtonRef.current?.focus();
                      }
                    }}
                  >
                    {roleOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => {
                          onRoleChange(option.value);
                          navigate("dashboard");
                        }}
                        className={cn(role === option.value && "bg-muted")}
                      >
                        <option.icon className="mr-2 h-4 w-4" /> {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <ThemeToggle />
              </div>
            </div>
            <p className="px-3 text-[10px] text-muted-foreground">Sample team · Saved in this browser</p>
            <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
              <Link to="/auth"><LogIn className="h-4 w-4" /> Sign in</Link>
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
}
