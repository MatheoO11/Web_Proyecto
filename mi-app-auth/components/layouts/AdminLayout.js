// components/layouts/AdminLayout.js (Ejemplo)
import Layout from '../Layout';

export default function AdminLayout({ children }) {
  return (
    <Layout>
      {/* Aquí podrías agregar un Sidebar específico de Admin en el futuro */}
      {children}
    </Layout>
  );
}
