export default function Hero({ title, subtitle, bgColor = 'from-blue-600 to-indigo-700' }) {
  return (
    <div className={`relative bg-gradient-to-r ${bgColor} text-white overflow-hidden`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-4xl font-bold mb-2">{title}</h2>
        <p className="text-xl opacity-90">{subtitle}</p>
      </div>
    </div>
  );
}
