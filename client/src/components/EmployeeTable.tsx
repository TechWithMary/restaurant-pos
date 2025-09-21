import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, UserMinus, Users, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  role: 'mesero' | 'cajero' | 'chef' | 'admin' | 'gerente';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeTableProps {
  onCreateEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
}

const ROLE_LABELS = {
  'mesero': 'Mesero',
  'cajero': 'Cajero', 
  'chef': 'Chef',
  'admin': 'Administrador',
  'gerente': 'Gerente'
};

const ROLE_COLORS = {
  'mesero': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'cajero': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'chef': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'gerente': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

export function EmployeeTable({ onCreateEmployee, onEditEmployee }: EmployeeTableProps) {
  const { toast } = useToast();
  
  const { data: employeesData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/employees'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestión de Personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando empleados...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Users className="w-5 h-5" />
            Error al cargar empleados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No se pudieron cargar los empleados. Por favor, intenta de nuevo.
            </p>
            <Button onClick={() => refetch()} variant="outline" data-testid="button-retry">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const employees: Employee[] = employeesData?.employees || [];
  const activeEmployees = employees.filter(emp => emp.active);
  const inactiveEmployees = employees.filter(emp => !emp.active);

  const handleDeactivateEmployee = async (employee: Employee) => {
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al desactivar empleado');
      }

      toast({
        title: "Empleado desactivado",
        description: `${employee.firstName} ${employee.lastName} ha sido desactivado`,
      });

      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo desactivar el empleado. Intenta de nuevo.",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestión de Personal
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Administra tu equipo de trabajo
          </p>
        </div>
        <Button 
          onClick={onCreateEmployee}
          className="flex items-center gap-2"
          data-testid="button-create-employee"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Empleado
        </Button>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay empleados registrados</h3>
            <p className="text-muted-foreground mb-6">
              Comienza agregando tu primer empleado al sistema
            </p>
            <Button onClick={onCreateEmployee} data-testid="button-first-employee">
              <UserPlus className="w-4 h-4 mr-2" />
              Agregar primer empleado
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Employees */}
            {activeEmployees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Empleados Activos</h3>
                  <Badge variant="secondary" data-testid="badge-active-count">
                    {activeEmployees.length}
                  </Badge>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre Completo</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeEmployees.map((employee) => (
                        <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span data-testid={`text-name-${employee.id}`}>
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ID: {employee.id.slice(0, 8)}...
                              </span>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-document-${employee.id}`}>
                            {employee.documentNumber}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={ROLE_COLORS[employee.role]}
                              data-testid={`badge-role-${employee.id}`}
                            >
                              {ROLE_LABELS[employee.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="default" 
                              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              data-testid={`badge-status-${employee.id}`}
                            >
                              Activo
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditEmployee(employee)}
                                data-testid={`button-edit-${employee.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivateEmployee(employee)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-deactivate-${employee.id}`}
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Inactive Employees */}
            {inactiveEmployees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">Empleados Inactivos</h3>
                  <Badge variant="outline" data-testid="badge-inactive-count">
                    {inactiveEmployees.length}
                  </Badge>
                </div>
                <div className="border rounded-lg overflow-hidden opacity-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre Completo</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inactiveEmployees.map((employee) => (
                        <TableRow key={employee.id} data-testid={`row-employee-inactive-${employee.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span data-testid={`text-name-inactive-${employee.id}`}>
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ID: {employee.id.slice(0, 8)}...
                              </span>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-document-inactive-${employee.id}`}>
                            {employee.documentNumber}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              data-testid={`badge-role-inactive-${employee.id}`}
                            >
                              {ROLE_LABELS[employee.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className="text-muted-foreground"
                              data-testid={`badge-status-inactive-${employee.id}`}
                            >
                              Inactivo
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditEmployee(employee)}
                              data-testid={`button-edit-inactive-${employee.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}