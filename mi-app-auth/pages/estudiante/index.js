import Head from 'next/head';
// ✅ CORREGIDO: Apuntamos a la carpeta /estudiante/ y al archivo StudentDashboard
import StudentDashboard from '../../components/views/estudiante/StudentDashboard';
import AuthGuard from '../../components/AuthGuard';

export default function EstudiantePage() {
  return (
    <>
      <Head>
        <title>Mis Cursos | Campus Virtual</title>
      </Head>

      <AuthGuard allowedRoles={['estudiante']}>
        <StudentDashboard />
      </AuthGuard>
    </>
  );
}
