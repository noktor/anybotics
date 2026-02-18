import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <Header />
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
