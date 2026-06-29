import React, { useState } from 'react';
import { loginUser } from '../services/login'; 
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const session = await loginUser(email, password); 
    setLoading(false);

    if (session) {
      // Redirigir al Dashboard principal
      navigate('/dashboard');
    } else {
      alert("Error al iniciar sesión. Revisa tus credenciales.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Encabezado Estilo Barbería */}
        <div style={styles.header}>
          <span style={styles.logoIcon}>💈</span>
          <h1 style={styles.title}>BarberSaaS</h1>
          <p style={styles.subtitle}>Gestión Multi-tenant de Barberías</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="nombre@barberia.com" 
              onChange={e => setEmail(e.target.value)} 
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              onChange={e => setPassword(e.target.value)} 
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Cargando...' : 'Entrar a la Barbería'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Objeto de estilos integrados (Efecto Dark Premium)
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#09090b', // Fondo casi negro ultra moderno
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  card: {
    backgroundColor: '#18181b', // Tarjeta gris oscuro
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid #27272a', // Borde sutil
  },
  header: {
    textAlign: 'center', // Usamos sintaxis JS estándar
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '12px',
  },
  title: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#a1a1aa', // Gris claro para textos secundarios
    fontSize: '14px',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    color: '#e4e4e7',
    fontSize: '14px',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    backgroundColor: '#d97706', // Ámbar/Dorado elegante
    color: '#000000',
    fontWeight: '600',
    fontSize: '16px',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'background-color 0.2s',
  },
};