import { useEffect, useState } from 'react';

interface ReportItem {
  id: string;
  name: string;
  branchName?: string;
  unitsSold?: number;
  totalRevenue?: number;
  stock?: number;
}

interface ProductReportsData {
  topSelling: ReportItem[];
  leastSelling: ReportItem[];
  outOfStock: ReportItem[];
  topRevenue: ReportItem[];
}

export function AdminReportsPage() {
  const [data, setData] = useState<ProductReportsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/reports/products')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Error al cargar reportes');
        }
        return res.json();
      })
      .then((result: ProductReportsData) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error desconocido');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#666' }}>
        <p>Cargando reportes del sistema...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', color: '#c53030' }}>
        <p>Ocurrió un error al obtener las métricas: {error}</p>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f0e6dc',
    display: 'flex',
    flexDirection: 'column',
  };

  const tableHeaderStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#8c7b70',
    borderBottom: '2px solid #f4ede6',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #f9f5f1',
    fontSize: '0.95rem',
    color: '#2d2522',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1a1412', margin: 0 }}>
          Reportes de Productos
        </h1>
        <p style={{ color: '#7a6e65', fontSize: '0.95rem', marginTop: '0.35rem' }}>
          Métricas acumuladas de pedidos y control de stock
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* 1. Más vendidos */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2b2118', margin: 0 }}>
              Más vendidos
            </h2>
            <span style={{ fontSize: '0.8rem', backgroundColor: '#eef8ee', color: '#2e7d32', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Top ventas
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Producto</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Unidades</th>
              </tr>
            </thead>
            <tbody>
              {data.topSelling.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ ...cellStyle, textAlign: 'center', color: '#a09891' }}>
                    Sin ventas registradas
                  </td>
                </tr>
              ) : (
                data.topSelling.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}>{item.name}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#e65100' }}>
                      {item.unitsSold}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* 2. Menos vendidos */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2b2118', margin: 0 }}>
              Menos vendidos
            </h2>
            <span style={{ fontSize: '0.8rem', backgroundColor: '#fff8e1', color: '#f57f17', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Baja rotación
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Producto</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Unidades</th>
              </tr>
            </thead>
            <tbody>
              {data.leastSelling.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ ...cellStyle, textAlign: 'center', color: '#a09891' }}>
                    Sin datos registrados
                  </td>
                </tr>
              ) : (
                data.leastSelling.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}>{item.name}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, color: '#7a6e65' }}>
                      {item.unitsSold}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* 3. Mayor facturación */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2b2118', margin: 0 }}>
              Mayor facturación
            </h2>
            <span style={{ fontSize: '0.8rem', backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Ingresos
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Producto</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total Facturado</th>
              </tr>
            </thead>
            <tbody>
              {data.topRevenue.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ ...cellStyle, textAlign: 'center', color: '#a09891' }}>
                    Sin facturación registrada
                  </td>
                </tr>
              ) : (
                data.topRevenue.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}>{item.name}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#1b5e20' }}>
                      ${item.totalRevenue?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* 4. Sin stock */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2b2118', margin: 0 }}>
              Sin stock
            </h2>
            <span style={{ fontSize: '0.8rem', backgroundColor: '#ffebee', color: '#c62828', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Alerta de reposición
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Producto</th>
                <th style={tableHeaderStyle}>Sucursal</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Stock Disp.</th>
              </tr>
            </thead>
            <tbody>
              {data.outOfStock.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ ...cellStyle, textAlign: 'center', color: '#2e7d32' }}>
                    Todos los productos tienen stock disponible
                  </td>
                </tr>
              ) : (
                data.outOfStock.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}>{item.name}</td>
                    <td style={{ ...cellStyle, color: '#7a6e65', fontSize: '0.85rem' }}>
                      {item.branchName ?? 'Todas'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#d32f2f' }}>
                      {item.stock}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}