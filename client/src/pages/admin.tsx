import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Settings, BarChart3, Users, Menu } from "lucide-react";

export default function Admin() {
  const [, setLocation] = useLocation();

  const handleBackToLogin = () => {
    setLocation("/");
  };

  const adminSections = [
    {
      title: "Gestión de Menú",
      description: "Administrar categorías y productos",
      icon: Menu,
      action: () => console.log("Menú management"),
    },
    {
      title: "Reportes y Ventas",
      description: "Ver estadísticas y reportes de ventas",
      icon: BarChart3,
      action: () => console.log("Sales reports"),
    },
    {
      title: "Gestión de Personal",
      description: "Administrar usuarios y permisos",
      icon: Users,
      action: () => console.log("Staff management"),
    },
    {
      title: "Configuración",
      description: "Configurar sistema y integraciones",
      icon: Settings,
      action: () => console.log("Settings"),
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

        {/* Welcome Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Bienvenido al Panel de Administración</CardTitle>
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
              onClick={section.action}
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