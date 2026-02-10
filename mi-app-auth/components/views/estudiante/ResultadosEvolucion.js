// components/views/estudiante/ResultadosEvolucion.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '@/config/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ResultadosEvolucion() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [historial, setHistorial] = useState([]);
  const [evolucion, setEvolucion] = useState(null);

  useEffect(() => {
    fetchHistorial();
  }, [token]);

  const fetchHistorial = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/historial-evaluaciones/`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setHistorial(data.evaluaciones || []);
        setEvolucion(data.evolucion || null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!historial || historial.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Sin evaluaciones aún
        </h3>
        <p className="text-gray-600">
          Completa tu primera evaluación adaptativa para ver tu evolución aquí.
        </p>
      </div>
    );
  }

  // Preparar datos para el gráfico
  const chartData = {
    labels: historial.map((item, index) => `Intento ${index + 1}`),
    datasets: [
      {
        label: 'Puntaje (%)',
        data: historial.map(item => item.porcentaje),
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `Puntaje: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function (value) {
            return value + '%';
          }
        }
      }
    }
  };

  // Calcular tendencia
  const ultimosPuntajes = historial.slice(-3).map(h => h.porcentaje);
  const promedio = ultimosPuntajes.reduce((a, b) => a + b, 0) / ultimosPuntajes.length;
  const tendencia = promedio >= 70 ? 'mejorando' : promedio >= 50 ? 'estable' : 'necesita_refuerzo';

  return (
    <div className="space-y-6">
      {/* TÍTULO Y RESUMEN */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              📈 Tu Evolución
            </h2>
            <p className="text-sm text-gray-600">
              {historial.length} evaluación{historial.length !== 1 ? 'es' : ''} completada{historial.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* BADGE DE TENDENCIA */}
          <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${tendencia === 'mejorando' ? 'bg-green-100 text-green-700' :
              tendencia === 'estable' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
            }`}>
            {tendencia === 'mejorando' ? '↗ Mejorando' :
              tendencia === 'estable' ? '→ Estable' :
                '↘ Necesita refuerzo'}
          </div>
        </div>

        {/* GRÁFICO */}
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* MÉTRICAS CLAVE */}
      {evolucion && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-3xl font-bold text-gray-800">
              {evolucion.promedio_puntaje}%
            </div>
            <p className="text-sm text-gray-600 mt-1">Promedio General</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-3xl font-bold text-gray-800">
              {evolucion.mejor_puntaje}%
            </div>
            <p className="text-sm text-gray-600 mt-1">Mejor Puntaje</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl mb-2">
              {evolucion.tendencia === 'mejorando' ? '📈' :
                evolucion.tendencia === 'estable' ? '➡️' : '📉'}
            </div>
            <div className="text-lg font-bold text-gray-800">
              {evolucion.tendencia === 'mejorando' ? 'En Ascenso' :
                evolucion.tendencia === 'estable' ? 'Estable' :
                  'Necesita Apoyo'}
            </div>
            <p className="text-sm text-gray-600 mt-1">Tendencia</p>
          </div>
        </div>
      )}

      {/* HISTORIAL DETALLADO */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          📋 Historial Detallado
        </h3>
        <div className="space-y-3">
          {historial.slice().reverse().map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${item.aprobado ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                  {item.porcentaje}%
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {item.nivel_dificultad} - {item.total_preguntas} preguntas
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(item.fecha).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {item.aciertos}/{item.total_preguntas} aciertos
                </p>
                <p className="text-xs text-gray-500">
                  {Math.floor(item.tiempo_invertido / 60)}:{String(item.tiempo_invertido % 60).padStart(2, '0')} min
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
