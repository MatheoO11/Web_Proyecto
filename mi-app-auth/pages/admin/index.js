import Head from 'next/head';
// ✅ CORREGIDO: Apuntamos a la carpeta /admin/ y al archivo AdminDashboard
import AdminDashboard from '../../components/views/admin/AdminDashboard';
import AuthGuard from '../../components/AuthGuard';

export default function AdminPage() {
  return (
    <>
      <Head>
        <title>Panel de Administración | Campus Virtual</title>
      </Head>

      <AuthGuard allowedRoles={['admin']}>
        <AdminDashboard />
      </AuthGuard>
    </>
  );
}
