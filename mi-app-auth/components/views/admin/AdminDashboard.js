import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import Layout from '../../Layout';
import Hero from '../../shared/Hero';

// ✅ CAMBIO DE NOMBRE: De HomeAdmin a AdminDashboard para ser consistente con el archivo
export default function AdminDashboard() {
  const { role } = useAuth();
  const router = useRouter();

  const [estudiantes, setEstudiantes] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('estudiantes');

  useEffect(() => {
    // ⚠️ NOTA: Ya no necesitas verificar el rol aquí ni redirigir
    // porque el AuthGuard en pages/admin/index.js ya lo hizo.
    // Solo cargamos datos.

    const fetchedEstudiantes = [
      { id: 1, nombre: 'Juan Pérez', email: 'juan.perez@universidad.edu', rol: 'Estudiante' },
      { id: 2, nombre: 'Ana García', email: 'ana.garcia@universidad.edu', rol: 'Estudiante' },
    ];

    const fetchedDocentes = [
      { id: 1, nombre: 'Carlos Mendoza', email: 'carlos.mendoza@universidad.edu', rol: 'Docente' },
      { id: 2, nombre: 'María López', email: 'maria.lopez@universidad.edu', rol: 'Docente' },
    ];

    const fetchedCursos = [
      { id: 1, nombre: 'Base de Datos', profesor: 'Carlos Mendoza' },
      { id: 2, nombre: 'Programación Web', profesor: 'María López' },
    ];

    setEstudiantes(fetchedEstudiantes);
    setDocentes(fetchedDocentes);
    setCursos(fetchedCursos);
    setLoading(false);
  }, []); // Quitamos 'role' y 'router' de dependencias porque ya no redirigimos aquí

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleDeleteEstudiante = (id) => {
    setEstudiantes(estudiantes.filter(est => est.id !== id));
  };

  const handleDeleteDocente = (id) => {
    setDocentes(docentes.filter(docente => docente.id !== id));
  };

  const handleDeleteCurso = (id) => {
    setCursos(cursos.filter(curso => curso.id !== id));
  };

  const handleAddEstudiante = () => {
    alert('Añadir estudiante');
  };

  const handleAddDocente = () => {
    alert('Añadir docente');
  };

  const handleAddCurso = () => {
    alert('Añadir curso');
  };

  const handleEditRol = (id, rol) => {
    const newEstudiantes = estudiantes.map(est => {
      if (est.id === id) {
        est.rol = rol;
      }
      return est;
    });
    setEstudiantes(newEstudiantes);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'estudiantes':
        return (
          <div>
            {loading ? (
              <p>Cargando estudiantes...</p>
            ) : (
              <div>
                {estudiantes.map((est) => (
                  <div key={est.id} className="bg-white rounded-xl shadow-md p-6 mb-4">
                    <h3>{est.nombre}</h3>
                    <p>Correo: {est.email}</p>
                    <p>Rol: {est.rol}</p>
                    <button onClick={() => handleDeleteEstudiante(est.id)} className="bg-red-500 text-white py-2 px-4 rounded-lg">
                      Eliminar
                    </button>
                    <button onClick={() => router.push(`/detalles/${est.id}`)} className="ml-4 bg-blue-600 text-white py-2 px-4 rounded-lg">
                      Ver Detalles
                    </button>
                    <button onClick={() => handleEditRol(est.id, est.rol === 'Estudiante' ? 'Docente' : 'Estudiante')} className="ml-4 bg-yellow-500 text-white py-2 px-4 rounded-lg">
                      Cambiar Rol
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleAddEstudiante} className="mt-4 bg-green-600 text-white py-2 px-4 rounded-lg">
              Agregar Estudiante
            </button>
          </div>
        );
      case 'docentes':
        return (
          <div>
            {loading ? (
              <p>Cargando docentes...</p>
            ) : (
              <div>
                {docentes.map((docente) => (
                  <div key={docente.id} className="bg-white rounded-xl shadow-md p-6 mb-4">
                    <h3>{docente.nombre}</h3>
                    <p>Correo: {docente.email}</p>
                    <p>Rol: {docente.rol}</p>
                    <button onClick={() => handleDeleteDocente(docente.id)} className="bg-red-500 text-white py-2 px-4 rounded-lg">
                      Eliminar
                    </button>
                    <button onClick={() => router.push(`/detalles/${docente.id}`)} className="ml-4 bg-blue-600 text-white py-2 px-4 rounded-lg">
                      Ver Detalles
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleAddDocente} className="mt-4 bg-green-600 text-white py-2 px-4 rounded-lg">
              Agregar Docente
            </button>
          </div>
        );
      case 'cursos':
        return (
          <div>
            {loading ? (
              <p>Cargando cursos...</p>
            ) : (
              <div>
                {cursos.map((curso) => (
                  <div key={curso.id} className="bg-white rounded-xl shadow-md p-6 mb-4">
                    <h3>{curso.nombre}</h3>
                    <p>Profesor: {curso.profesor}</p>
                    <button onClick={() => handleDeleteCurso(curso.id)} className="bg-red-500 text-white py-2 px-4 rounded-lg">
                      Eliminar
                    </button>
                    <button onClick={() => router.push(`/curso/${curso.id}`)} className="ml-4 bg-blue-600 text-white py-2 px-4 rounded-lg">
                      Ver Detalles
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleAddCurso} className="mt-4 bg-green-600 text-white py-2 px-4 rounded-lg">
              Agregar Curso
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <Hero title="¡Bienvenido, Administrador!" subtitle="Gestiona estudiantes, docentes y cursos" bgColor="from-purple-600 to-indigo-700" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8 mb-4">
          <button onClick={() => setActiveTab('estudiantes')} className={`py-4 px-2 border-b-2 font-medium text-sm transition ${activeTab === 'estudiantes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Estudiantes
          </button>
          <button onClick={() => setActiveTab('docentes')} className={`py-4 px-2 border-b-2 font-medium text-sm transition ${activeTab === 'docentes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Docentes
          </button>
          <button onClick={() => setActiveTab('cursos')} className={`py-4 px-2 border-b-2 font-medium text-sm transition ${activeTab === 'cursos' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Cursos
          </button>
        </div>

        {/* Contenido del Tab */}
        {renderTabContent()}
      </div>
    </Layout>
  );
}
