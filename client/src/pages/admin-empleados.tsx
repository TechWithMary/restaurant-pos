import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function AdminEmpleados() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => setLocation("/admin")}
            className="hover-elevate active-elevate-2"
            data-testid="button-back-admin"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Panel
          </Button>
          <h1 className="text-3xl font-bold text-primary">Gestión de Empleados</h1>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Empleados - Próximamente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-lg">
              Esta sección estará disponible próximamente. Aquí podrás administrar usuarios, permisos y la información del personal del restaurante.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}