import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, ClipboardList, ArrowRight } from "lucide-react";

const roles = [
  {
    title: "Project Manager",
    description: "Full oversight of workspace health, project tracking, task assignment across all departments, and approval workflows",
    icon: Briefcase,
    href: "/project-lead",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  {
    title: "Team Lead",
    description: "Manage department projects, assign tasks to team members, review submissions, and report progress upstream",
    icon: Users,
    href: "/team-lead",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    title: "Contributor",
    description: "View assigned tasks, submit deliverables for approval, track status, and collaborate on the workspace canvas",
    icon: ClipboardList,
    href: "/member",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-2">
            Bells
          </h1>
          <p className="text-base text-primary font-medium mb-2">
            AI-Powered Workplace Productivity & Professionalism Platform
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Intelligent task management, performance assessment, and enterprise-secure collaboration — from individual to project level.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {roles.map((role) => (
            <Link key={role.href} to={role.href} className="group">
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${role.color}`}>
                    <role.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {role.title}
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {role.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Scalable, multi-tenant, and enterprise-secure from individual to project level
        </p>
      </div>
    </div>
  );
}
