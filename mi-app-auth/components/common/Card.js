export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 ${className}`}>
      {children}
    </div>
  );
}
