import { DashboardNav } from "./DashboardNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      <DashboardNav />
      
      <main className="min-w-0 flex-1 lg:ml-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8 pl-12 lg:pl-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>

          {/* Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
