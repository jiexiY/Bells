import { lazy, Suspense, useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import DemoRoutes from "./pages/DemoRoutes";

// Public pages never need to initialize authentication or load private workspace data.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthenticatedRoutes = lazy(() => import("./AuthenticatedRoutes"));
const queryClient = new QueryClient();

function ScrollToPageStart() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToPageStart />
          <Routes>
            <Route path="/" element={
              <Suspense fallback={<div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>}>
                <LandingPage />
              </Suspense>
            } />
            <Route path="/demo/*" element={<DemoRoutes />} />
            <Route path="/*" element={
              <Suspense fallback={<div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>}>
                <AuthenticatedRoutes />
              </Suspense>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
