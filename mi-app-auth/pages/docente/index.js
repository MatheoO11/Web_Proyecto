import Head from 'next/head';
// ✅ CORREGIDO: Apuntamos a la carpeta /docente/ y al archivo DocenteDashboard
import DocenteDashboard from '../../components/views/docente/DocenteDashboard';
import AuthGuard from '../../components/AuthGuard';

export default function DocentePage() {
  return (
    <>
      <Head>
        <title>Panel Docente | Campus Virtual</title>
      </Head>

      <AuthGuard allowedRoles={['docente']}>
        <DocenteDashboard />
      </AuthGuard>
    </>
  );
}
