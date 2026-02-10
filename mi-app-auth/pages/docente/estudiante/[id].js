import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '@/config/api';

function DetalleEstudianteDocente() {
  const router = useRouter();
  const { id } = router.query; // ID del estudiante
  const { token } = useAuth();

  const [estudiante, setEstudiante] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- OBTENER DATOS DEL ESTUDIANTE Y SUS RESULTADOS ---
  useEffect(() => {
    if (!router.isReady || !token || !id) return;

    const fetchData = async () => {
      try {
        // 1. Datos del Estudiante (Asumiendo que tienes un endpoint para detalle de usuario, si no, usamos la lista)
        // Nota: Si no tienes endpoint de detalle de usuario, esto podría requerir ajuste en backend.
        // Usaremos el filtro de resultados que ya tienes implementado.

        const res = await fetch(`${API_URL}/api/resultados-d2r/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        const dataResultados = await resResultados.json();

        // Filtramos los resultados de ESTE estudiante
        const historial = dataResultados.filter(r => String(r.estudiante) === String(id));
        setResultados(historial);

        // Simulamos nombre por ahora si no tenemos endpoint de detalle de usuario
        setEstudiante({ id: id, nombre: "Estudiante Detalle" });

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router.isReady, token]);

  if (loading) return <div className="p-10 text-center">Cargando perfil...</div>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline">← Volver al Dashboard</button>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800">Historial del Estudiante (ID: {id})</h1>
          <p className="text-gray-500 mb-6">Resultados de pruebas D2-R</p>

          {resultados.length > 0 ? (
            <div className="space-y-3">
              {resultados.map((res, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-700">Intento del {new Date(res.fecha).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">{res.interpretacion}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-xl font-bold text-blue-600">CON: {res.con}</span>
                    <span className="text-xs text-gray-400">Concentración</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">No hay resultados registrados para este estudiante.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ✅ EXPORTACIÓN POR DEFECTO OBLIGATORIA
export default function EstudianteDetallePage() {
  return (
    <AuthGuard allowedRoles={['docente', 'admin']}>
      <DetalleEstudianteDocente />
    </AuthGuard>
  );
}
