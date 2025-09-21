import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, UserPlus, UserCheck, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  mode: 'create' | 'edit';
}

const employeeFormSchema = z.object({
  firstName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede tener más de 50 caracteres'),
  lastName: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede tener más de 50 caracteres'),
  documentNumber: z.string()
    .min(6, 'El documento debe tener al menos 6 caracteres')
    .max(20, 'El documento no puede tener más de 20 caracteres')
    .regex(/^[0-9]+$/, 'El documento solo puede contener números'),
  role: z.enum(['mesero', 'cajero', 'chef', 'admin', 'gerente'], {
    required_error: 'Debes seleccionar un rol',
  }),
  pin: z.string()
    .length(4, 'El PIN debe tener exactamente 4 dígitos')
    .regex(/^\d{4}$/, 'El PIN solo puede contener números'),
  active: z.boolean().default(true),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

const ROLE_OPTIONS = [
  { value: 'mesero', label: 'Mesero' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'chef', label: 'Chef' },
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
];

export function EmployeeForm({ isOpen, onClose, employee, mode }: EmployeeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPin, setShowPin] = useState(false);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      documentNumber: '',
      role: 'mesero',
      pin: '',
      active: true,
    },
  });

  // Update form values when employee changes
  useEffect(() => {
    if (employee && mode === 'edit') {
      form.reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        documentNumber: employee.documentNumber,
        role: employee.role,
        pin: employee.pin,
        active: employee.active,
      });
    } else if (mode === 'create') {
      form.reset({
        firstName: '',
        lastName: '',
        documentNumber: '',
        role: 'mesero',
        pin: '',
        active: true,
      });
    }
  }, [employee, mode, form]);

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      return apiRequest('/api/employees', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Empleado creado exitosamente",
        description: `${response.employee.firstName} ${response.employee.lastName} ha sido agregado al equipo`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al crear empleado",
        description: error?.message || "Ocurrió un error inesperado. Intenta de nuevo.",
      });
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      if (!employee?.id) throw new Error('ID de empleado requerido');
      
      return apiRequest(`/api/employees/${employee.id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Empleado actualizado exitosamente",
        description: `Los datos de ${response.employee.firstName} ${response.employee.lastName} han sido actualizados`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al actualizar empleado",
        description: error?.message || "Ocurrió un error inesperado. Intenta de nuevo.",
      });
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    if (mode === 'create') {
      createEmployeeMutation.mutate(data);
    } else {
      updateEmployeeMutation.mutate(data);
    }
  };

  const isLoading = createEmployeeMutation.isPending || updateEmployeeMutation.isPending;

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      form.reset();
    }
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    form.setValue('pin', pin);
    toast({
      title: "PIN generado",
      description: `PIN aleatorio generado: ${pin}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' ? (
              <>
                <UserPlus className="w-5 h-5" />
                Nuevo Empleado
              </>
            ) : (
              <>
                <UserCheck className="w-5 h-5" />
                Editar Empleado
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader className="pb-4">
            <CardDescription>
              {mode === 'create' 
                ? 'Completa los datos del nuevo empleado. Todos los campos son obligatorios.'
                : 'Modifica los datos del empleado. Los cambios se guardarán inmediatamente.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Juan" 
                            {...field}
                            data-testid="input-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Pérez" 
                            {...field}
                            data-testid="input-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Document Number */}
                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Documento *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: 12345678" 
                          {...field}
                          data-testid="input-document-number"
                        />
                      </FormControl>
                      <FormDescription>
                        Cédula de ciudadanía o documento de identidad
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        data-testid="select-role"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLE_OPTIONS.map((role) => (
                            <SelectItem 
                              key={role.value} 
                              value={role.value}
                              data-testid={`option-role-${role.value}`}
                            >
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define los permisos y responsabilidades del empleado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* PIN Field */}
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIN de Acceso *</FormLabel>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input 
                              type={showPin ? "text" : "password"}
                              placeholder="****" 
                              maxLength={4}
                              {...field}
                              data-testid="input-pin"
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => setShowPin(!showPin)}
                            data-testid="button-toggle-pin-visibility"
                          >
                            {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateRandomPin}
                          data-testid="button-generate-pin"
                        >
                          Generar
                        </Button>
                      </div>
                      <FormDescription>
                        4 dígitos para autenticación en el sistema
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Active Status (only for edit mode) */}
                {mode === 'edit' && (
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Estado del Empleado</FormLabel>
                          <FormDescription>
                            Controla si el empleado puede acceder al sistema
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-active-status"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {/* Submit Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClose}
                    disabled={isLoading}
                    data-testid="button-cancel"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isLoading}
                    data-testid="button-submit"
                    className="flex-1"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {mode === 'create' 
                      ? (isLoading ? 'Creando...' : 'Crear Empleado')
                      : (isLoading ? 'Guardando...' : 'Guardar Cambios')
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}