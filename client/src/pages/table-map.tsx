import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users } from "lucide-react";

export default function TableMap() {
  const [, setLocation] = useLocation();

  const handleBackToLogin = () => {
    setLocation("/");
  };

  const handleTableSelect = (tableNumber: number) => {
    // Navegar al POS con la mesa seleccionada
    setLocation("/pos");
  };

  // Simulación de mesas del restaurante
  const tables = [
    { id: 1, number: 1, capacity: 4, status: "available" },
    { id: 2, number: 2, capacity: 2, status: "occupied" },
    { id: 3, number: 3, capacity: 6, status: "available" },
    { id: 4, number: 4, capacity: 4, status: "reserved" },
    { id: 5, number: 5, capacity: 2, status: "available" },
    { id: 6, number: 6, capacity: 8, status: "available" },
    { id: 7, number: 7, capacity: 4, status: "occupied" },
    { id: 8, number: 8, capacity: 2, status: "available" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500 hover:bg-green-600";
      case "occupied":
        return "bg-red-500 hover:bg-red-600";
      case "reserved":
        return "bg-yellow-500 hover:bg-yellow-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Disponible";
      case "occupied":
        return "Ocupada";
      case "reserved":
        return "Reservada";
      default:
        return "Desconocido";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-6xl mx-auto">
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
            <h1 className="text-3xl font-bold text-primary">Mapa de Mesas</h1>
          </div>
        </div>

        {/* Legend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Leyenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Ocupada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Reservada</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
          {tables.map((table) => (
            <Card 
              key={table.id}
              className="hover-elevate active-elevate-2 cursor-pointer transition-all"
              onClick={() => handleTableSelect(table.number)}
              data-testid={`table-${table.number}`}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-white font-bold text-xl ${getStatusColor(table.status)}`}>
                  {table.number}
                </div>
                <h3 className="font-semibold text-lg mb-2">Mesa {table.number}</h3>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-2">
                  <Users className="w-4 h-4" />
                  <span>{table.capacity} personas</span>
                </div>
                <p className="text-sm font-medium">{getStatusText(table.status)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Selecciona una mesa para comenzar a tomar un pedido
          </p>
          <Button 
            size="lg"
            onClick={() => setLocation("/pos")}
            className="hover-elevate active-elevate-2"
            data-testid="button-direct-pos"
          >
            Ir Directamente al POS
          </Button>
        </div>
      </div>
    </div>
  );
}