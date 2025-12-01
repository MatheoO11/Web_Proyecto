
import Navbar from './common/Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
      <footer className="bg-white border-t py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          © 2024 Campus Virtual. Sistema de monitoreo de atención.
        </div>
      </footer>
    </div>
  );
}
