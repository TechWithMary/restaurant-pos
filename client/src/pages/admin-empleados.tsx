import { useState } from 'react';
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EmployeeTable } from '@/components/EmployeeTable';
import { EmployeeForm } from '@/components/EmployeeForm';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  role: 'mesero' | 'cajero' | 'chef' | 'admin' | 'gerente';
  pin: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminEmpleados() {
  const [, setLocation] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleCreateEmployee = () => {
    setSelectedEmployee(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-7xl mx-auto">
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
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-primary">Gestión de Personal</h1>
            <p className="text-muted-foreground">
              Administra tu equipo de trabajo y controla el acceso al sistema SumaPOS Colombia
            </p>
          </div>
        </div>

        {/* Staff Management Content */}
        <div className="space-y-6" data-testid="admin-staff-management">
          <EmployeeTable
            onCreateEmployee={handleCreateEmployee}
            onEditEmployee={handleEditEmployee}
          />

          <EmployeeForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            employee={selectedEmployee}
            mode={formMode}
          />
        </div>
      </div>
    </div>
  );
}