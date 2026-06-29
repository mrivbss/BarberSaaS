import { supabase } from '../config/supabaseClient';

/**
 * Estructura de los datos de la sesión del usuario.
 */
export interface UserSession {
  id: string;
  email: string;
  rol: 'admin' | 'barbero';
  barberia_id: string; // Dato crucial para el Multi-tenant
}

/**
 * Función 1: Login y Persistencia
 * 
 * Autentica al usuario en Supabase Auth, recupera sus metadatos (rol y tenant_id)
 * y los guarda en el almacenamiento local para definir su entorno en la app.
 */
export async function loginUser(email: string, password: string): Promise<UserSession | null> {
  try {
    // 1. Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No se pudo obtener el usuario autenticado');

    // 2. Recuperar metadatos personalizados desde nuestra tabla 'usuarios'
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('rol, barberia_id')
      .eq('id', authData.user.id)
      .single();

    if (userError) throw userError;

    // 3. Construir el objeto de sesión integrando el barberia_id
    const session: UserSession = {
      id: authData.user.id,
      email: authData.user.email!,
      rol: userData.rol,
      barberia_id: userData.barberia_id, // Entorno del inquilino (Tenant)
    };

    // 4. Persistencia (Guardar en Local Storage o manejar en estado global ej: Zustand/Redux)
    localStorage.setItem('tenant_session', JSON.stringify(session));

    console.log(`Sesión iniciada exitosamente en entorno barbería: ${session.barberia_id}`);
    
    return session;
  } catch (error) {
    console.error('Error en el proceso de login:', error);
    return null;
  }
}
