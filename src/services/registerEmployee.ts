import { supabase } from '../config/supabaseClient';
import { UserSession } from './login';

/**
 * Función 2: Registro de Empleados (Multi-tenant)
 * 
 * Permite a un administrador crear un nuevo empleado (barbero),
 * asegurando que el nuevo empleado sea registrado bajo el mismo barberia_id
 * que el administrador que lo está creando.
 */
export async function registerEmployee(
  adminSession: UserSession,
  newEmployeeEmail: string,
  newEmployeePassword: string,
  newEmployeeRole: 'admin' | 'barbero' = 'barbero'
): Promise<boolean> {
  
  // A. Verificación del lado del cliente: Solo 'admin' puede registrar empleados
  if (adminSession.rol !== 'admin') {
    console.error('Permiso denegado: Solo los administradores pueden registrar nuevos empleados.');
    return false;
  }

  try {
    // 1. Crear las credenciales de Auth en Supabase
    // (En producción real, a veces se usa una Cloud Function o admin API de Supabase 
    // para crear al usuario sin desloguear al admin de su sesión actual)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newEmployeeEmail,
      password: newEmployeePassword,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Ocurrió un error al crear la cuenta en Auth.');

    // 2. Insertar metadatos en nuestra tabla 'usuarios'
    // INYECCIÓN MULTI-TENANT: Asignamos el barberia_id del admin al nuevo empleado automáticamente.
    const { error: insertError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          email: newEmployeeEmail,
          rol: newEmployeeRole,
          barberia_id: adminSession.barberia_id, // <-- CRÍTICO: Herencia del Tenant
        }
      ]);

    if (insertError) throw insertError;

    console.log(`Empleado (${newEmployeeRole}) registrado exitosamente en barbería: ${adminSession.barberia_id}`);
    return true;
    
  } catch (error) {
    console.error('Error en el registro del empleado:', error);
    return false;
  }
}
