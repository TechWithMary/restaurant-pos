import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import type { Table } from "@shared/schema";

export default function TableMap() {
  const [, setLocation] = useLocation();
  const { auth, selectTable, logout } = useAuth();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Authentication guard - redirect if not authenticated
  if (!auth.isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const handleBackToLogin = () => {
    logout();
    setLocation("/login");
  };

  const handleTableClick = (tableNumber: number, status: string) => {
    console.log(`Table ${tableNumber} clicked with status:`, status);
    if (status === "available") {
      setSelectedTable(tableNumber);
      setNumberOfPeople("");
      setIsModalOpen(true);
    } else if (status === "occupied") {
      // Navegar directamente al POS con pedido existente
      console.log(`Loading existing order for occupied table ${tableNumber}`);
      selectTable(tableNumber, 0); // Set 0 people since it's an existing order
      setLocation(`/order/${tableNumber}?existing=true`);
    }
  };

  const handleConfirmTable = () => {
    if (selectedTable && numberOfPeople && parseInt(numberOfPeople) > 0) {
      console.log(`Confirming table ${selectedTable} with ${numberOfPeople} people`);
      selectTable(selectedTable, parseInt(numberOfPeople));
      setLocation(`/order/${selectedTable}`);
      setIsModalOpen(false);
    }
  };

  // Fetch tables from API
  const { data: tables = [], isLoading: tablesLoading, error: tablesError } = useQuery<Table[]>({
    queryKey: ['/api/tables'],
    queryFn: async () => {
      console.log('Fetching tables from API');
      const response = await fetch('/api/tables');
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      console.log('Tables fetched from API:', data);
      return data;
    },
  });

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
              Cerrar Sesión
            </Button>
            <h1 className="text-3xl font-bold text-primary">Mapa de Mesas</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Mesero ID: {auth.mesero_id}</p>
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

        {/* Loading State */}
        {tablesLoading && (
          <Card className="mb-6">
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
              <span className="text-lg text-muted-foreground">Cargando mesas...</span>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {tablesError && (
          <Card className="mb-6">
            <CardContent className="text-center p-8">
              <div className="text-red-500 mb-3">⚠️</div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error al cargar las mesas</h3>
              <p className="text-muted-foreground">
                {tablesError instanceof Error ? tablesError.message : 'No se pudieron cargar las mesas del restaurante'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!tablesLoading && !tablesError && tables.length === 0 && (
          <Card className="mb-6">
            <CardContent className="text-center p-8">
              <div className="text-muted-foreground mb-3">🍽️</div>
              <h3 className="text-lg font-semibold mb-2">No hay mesas disponibles</h3>
              <p className="text-muted-foreground">
                No se encontraron mesas en el sistema.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tables Grid - Only show when we have data and no error */}
        {!tablesLoading && !tablesError && tables.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {tables.map((table) => (
              <Card 
                key={table.id}
                className={`hover-elevate active-elevate-2 transition-all ${
                  table.status === "available" || table.status === "occupied" ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                }`}
                onClick={() => handleTableClick(table.number, table.status)}
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
        )}

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Selecciona una mesa disponible (verde) para comenzar un nuevo pedido, o una mesa ocupada (roja) para continuar un pedido existente
          </p>
        </div>

        {/* Modal para número de personas */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]" data-testid="people-count-modal">
            <DialogHeader>
              <DialogTitle>Mesa {selectedTable}</DialogTitle>
              <DialogDescription>
                ¿Cuántas personas van a ocupar esta mesa?
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="people-count" className="text-right">
                  Personas:
                </Label>
                <Input
                  id="people-count"
                  type="number"
                  min="1"
                  max="10"
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(e.target.value)}
                  className="col-span-3"
                  placeholder="Ej: 4"
                  data-testid="input-people-count"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 hover-elevate active-elevate-2"
                onClick={() => setIsModalOpen(false)}
                data-testid="button-cancel-table"
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 hover-elevate active-elevate-2"
                onClick={handleConfirmTable}
                disabled={!numberOfPeople || parseInt(numberOfPeople) <= 0}
                data-testid="button-confirm-table"
              >
                Confirmar Mesa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}