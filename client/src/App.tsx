import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SimpleToastProvider } from "@/components/SimpleToast";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "@/pages/login";
import TableMap from "@/pages/table-map";
import Admin from "@/pages/admin";
import AdminMenu from "@/pages/admin-menu";
import AdminVentas from "@/pages/admin-ventas";
import AdminEmpleados from "@/pages/admin-empleados";
import AdminConfiguracion from "@/pages/admin-configuracion";
import POSSystem from "@/pages/pos-system";
import OrderManagement from "@/pages/order-management";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/tables" component={TableMap} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/menu" component={AdminMenu} />
      <Route path="/admin/ventas" component={AdminVentas} />
      <Route path="/admin/empleados" component={AdminEmpleados} />
      <Route path="/admin/configuracion" component={AdminConfiguracion} />
      <Route path="/order/:tableId" component={POSSystem} />
      <Route path="/order-management/:tableId" component={OrderManagement} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SimpleToastProvider>
            <div style={{ position: 'relative', zIndex: 9999 }}>
              <Toaster />
            </div>
            <Router />
          </SimpleToastProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
