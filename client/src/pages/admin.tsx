import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Settings, BarChart3, Users, Menu, DollarSign, UserCheck, TableIcon } from "lucide-react";
import { formatColombianPrice } from "@/lib/utils";

// Tipos para los datos de KPIs
interface AdminKPIs {
  ventas_hoy: number;
  personal_activo: number;
  mesas_ocupadas: number;
  mesas_totales: number;
}

export default function Admin() {
  const [, setLocation] = useLocation();

  // Fetch KPIs data from n8n
  const { data: kpisData, isLoading: kpisLoading } = useQuery<AdminKPIs>({
    queryKey: ['/api/admin/kpis'],
    queryFn: async () => {
      const response = await fetch('/api/admin/kpis');
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      return response.json();
    },
  });

  const handleBackToLogin = () => {
    setLocation("/");
  };

  const adminSections = [
    {
      title: "Gestión de Menú",
      description: "Administrar categorías y productos",
      icon: Menu,
      route: "/admin/menu",
    },
    {
      title: "Reportes y Ventas",
      description: "Ver estadísticas y reportes de ventas",
      icon: BarChart3,
      route: "/admin/ventas",
    },
    {
      title: "Gestión de Personal",
      description: "Administrar usuarios y permisos",
      icon: Users,
      route: "/admin/empleados",
    },
    {
      title: "Configuración",
      description: "Configurar sistema y integraciones",
      icon: Settings,
      route: "/admin/configuracion",
    },
  ];

  // KPIs data with loading states
  const kpiCards = [
    {
      title: "Ventas Hoy",
      value: kpisLoading ? "Cargando..." : formatColombianPrice(kpisData?.ventas_hoy || 0),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Personal Activo",
      value: kpisLoading ? "Cargando..." : `${kpisData?.personal_activo || 0} meseros`,
      icon: UserCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Mesas Ocupadas",
      value: kpisLoading ? "Cargando..." : `${kpisData?.mesas_ocupadas || 0}/${kpisData?.mesas_totales || 0}`,
      icon: TableIcon,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToLogin}
              className="hover-elevate active-elevate-2"
              data-testid="button-back-login"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Login
            </Button>
            <h1 className="text-3xl font-bold text-primary">Panel de Administración</h1>
          </div>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {kpiCards.map((kpi, index) => (
            <Card key={index} className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold mt-2" data-testid={`kpi-${index}`}>{kpi.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Welcome Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Panel de Administración</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Desde aquí puedes gestionar todos los aspectos del sistema POS.
              Selecciona una opción para comenzar.
            </p>
          </CardContent>
        </Card>

        {/* Admin Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminSections.map((section, index) => (
            <Card 
              key={index}
              className="hover-elevate active-elevate-2 cursor-pointer transition-all"
              onClick={() => setLocation(section.route)}
              data-testid={`admin-section-${index}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <section.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{section.title}</h3>
                    <p className="text-muted-foreground text-sm">{section.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            ¿Necesitas acceder rápidamente al POS?
          </p>
          <Button 
            size="lg"
            onClick={() => setLocation("/pos")}
            className="hover-elevate active-elevate-2"
            data-testid="button-quick-pos"
          >
            Ir al POS
          </Button>
        </div>
      </div>
    </div>
  );
}