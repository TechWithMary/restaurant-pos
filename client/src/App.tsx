import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SimpleToastProvider } from "@/components/SimpleToast";
import Login from "@/pages/login";
import TableMap from "@/pages/table-map";
import Admin from "@/pages/admin";
import POSSystem from "@/pages/pos-system";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/mesas" component={TableMap} />
      <Route path="/admin" component={Admin} />
      <Route path="/pos" component={POSSystem} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SimpleToastProvider>
          <div style={{ position: 'relative', zIndex: 9999 }}>
            <Toaster />
          </div>
          <Router />
        </SimpleToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
