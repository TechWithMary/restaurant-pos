import { useState } from 'react';
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

export default function StaffManagementPage() {
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
    <div className="container mx-auto py-6 space-y-6" data-testid="page-staff-management">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
        <p className="text-muted-foreground">
          Administra tu equipo de trabajo y controla el acceso al sistema SumaPOS Colombia
        </p>
      </div>

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
  );
}