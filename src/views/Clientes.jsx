import React from 'react';

export function Clientes() {
  return (
    <div>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>Clientes</h1>
        <p style={styles.pageSubtitle}>Administra la base de datos de clientes de la barbería.</p>
      </header>
      <div style={styles.content}>
        <p style={styles.placeholderText}>Aquí irá el listado de clientes...</p>
      </div>
    </div>
  );
}

const styles = {
  header: {
    marginBottom: '40px',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  pageSubtitle: {
    fontSize: '15px',
    color: '#a1a1aa',
    margin: 0,
  },
  content: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
  },
  placeholderText: {
    color: '#a1a1aa',
    fontSize: '16px',
  }
};
