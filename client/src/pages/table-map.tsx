import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Users, Loader2, Settings, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Table } from "@shared/schema";

export default function TableMap() {
  const [, setLocation] = useLocation();
  const { auth, selectTable, logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [managingTable, setManagingTable] = useState<Table | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

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
      // Solo meseros pueden seleccionar mesas disponibles
      if (auth.role !== "cajero") {
        setSelectedTable(tableNumber);
        setNumberOfPeople("");
        setIsModalOpen(true);
      }
    } else if (status === "occupied") {
      if (auth.role === "cajero") {
        // Cajero va a gestión de pedido
        console.log(`Cajero accessing order management for table ${tableNumber}`);
        selectTable(tableNumber, 0);
        setLocation(`/order-management/${tableNumber}`);
      } else {
        // Mesero navega al POS con pedido existente
        console.log(`Loading existing order for occupied table ${tableNumber}`);
        selectTable(tableNumber, 0); // Set 0 people since it's an existing order
        setLocation(`/order/${tableNumber}?existing=true`);
      }
    }
  };

  const handleConfirmTable = async () => {
    if (selectedTable && numberOfPeople && parseInt(numberOfPeople) > 0) {
      console.log(`Confirming table ${selectedTable} with ${numberOfPeople} people`);
      
      // CRITICAL: Mark table as occupied immediately when waiter starts order
      try {
        await updateTableStatusMutation.mutateAsync({ 
          tableId: selectedTable, 
          status: "occupied" 
        });
        console.log(`Table ${selectedTable} marked as occupied - cashier will see it immediately`);
      } catch (error) {
        console.error('Failed to mark table as occupied:', error);
        // Continue anyway - don't block the flow
      }
      
      selectTable(selectedTable, parseInt(numberOfPeople));
      setLocation(`/order/${selectedTable}`);
      setIsModalOpen(false);
    }
  };

  // Mutation para cambiar estado de mesa
  const updateTableStatusMutation = useMutation({
    mutationFn: async ({ tableId, status }: { tableId: number; status: string }) => {
      return await apiRequest('PUT', `/api/tables/${tableId}/status`, { status });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "Estado actualizado",
        description: `Mesa ${variables.tableId} ahora está ${getStatusText(variables.status)}.`,
      });
      setIsManageModalOpen(false);
      setManagingTable(null);
    },
    onError: (error) => {
      console.error('Error updating table status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la mesa. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  });

  const handleManageTable = (table: Table, event: React.MouseEvent) => {
    event.stopPropagation();
    setManagingTable(table);
    setIsManageModalOpen(true);
  };

  const handleStatusChange = (newStatus: string) => {
    if (managingTable) {
      updateTableStatusMutation.mutate({
        tableId: managingTable.id,
        status: newStatus
      });
    }
  };

  // Fetch tables from API with auto-refresh for cashier real-time updates
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
    // Auto-refresh every 10 seconds for cashier real-time updates
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
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
            <p className="text-sm text-muted-foreground">
              {auth.role === "cajero" ? "Cajero" : "Mesero"} ID: {auth.mesero_id}
            </p>
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
                className={`hover-elevate active-elevate-2 transition-all relative ${
                  table.status === "available" || table.status === "occupied" ? "cursor-pointer" : "cursor-default"
                }`}
                onClick={() => handleTableClick(table.number, table.status)}
                data-testid={`table-${table.number}`}
              >
                {/* Management Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8 opacity-70 hover:opacity-100 z-10"
                  onClick={(e) => handleManageTable(table, e)}
                  data-testid={`manage-table-${table.number}`}
                >
                  <Settings className="w-4 h-4" />
                </Button>

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
            {auth.role === "cajero" ? (
              <>
                Haz clic en una mesa ocupada (roja) para gestionar su pedido y procesar el pago.
                <br />
                Usa el botón ⚙️ para cambiar el estado de cualquier mesa (disponible, ocupada, reservada).
              </>
            ) : (
              <>
                Selecciona una mesa disponible (verde) para comenzar un nuevo pedido, o una mesa ocupada (roja) para continuar un pedido existente.
                <br />
                Usa el botón ⚙️ para cambiar el estado de cualquier mesa (disponible, ocupada, reservada).
              </>
            )}
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

        {/* Modal para gestionar estado de mesa */}
        <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
          <DialogContent className="sm:max-w-[425px]" data-testid="manage-table-modal">
            <DialogHeader>
              <DialogTitle>Gestionar Mesa {managingTable?.number}</DialogTitle>
              <DialogDescription>
                Cambiar el estado de la mesa {managingTable?.number} ({managingTable?.capacity} personas)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Estado actual: <span className="font-semibold">{managingTable && getStatusText(managingTable.status)}</span>
              </p>
              
              <div className="space-y-3">
                <Button
                  className="w-full justify-start gap-3 hover-elevate active-elevate-2"
                  variant={managingTable?.status === "available" ? "default" : "outline"}
                  onClick={() => handleStatusChange("available")}
                  disabled={updateTableStatusMutation.isPending}
                  data-testid="button-set-available"
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Marcar como Disponible
                </Button>
                
                <Button
                  className="w-full justify-start gap-3 hover-elevate active-elevate-2"
                  variant={managingTable?.status === "occupied" ? "default" : "outline"}
                  onClick={() => handleStatusChange("occupied")}
                  disabled={updateTableStatusMutation.isPending}
                  data-testid="button-set-occupied"
                >
                  <XCircle className="w-4 h-4 text-red-500" />
                  Marcar como Ocupada
                </Button>
                
                <Button
                  className="w-full justify-start gap-3 hover-elevate active-elevate-2"
                  variant={managingTable?.status === "reserved" ? "default" : "outline"}
                  onClick={() => handleStatusChange("reserved")}
                  disabled={updateTableStatusMutation.isPending}
                  data-testid="button-set-reserved"
                >
                  <Clock className="w-4 h-4 text-yellow-500" />
                  Marcar como Reservada
                </Button>
              </div>
              
              {updateTableStatusMutation.isPending && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                  <span className="text-sm text-muted-foreground">Actualizando estado...</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 hover-elevate active-elevate-2"
                onClick={() => setIsManageModalOpen(false)}
                disabled={updateTableStatusMutation.isPending}
                data-testid="button-cancel-manage"
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}