import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import RobotDetail from '@/pages/RobotDetail';
import Assets from '@/pages/Assets';
import Anomalies from '@/pages/Anomalies';
import Missions from '@/pages/Missions';
import Analytics from '@/pages/Analytics';
import LiveMap from '@/pages/LiveMap';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="robots/:id" element={<RobotDetail />} />
        <Route path="assets" element={<Assets />} />
        <Route path="anomalies" element={<Anomalies />} />
        <Route path="missions" element={<Missions />} />
        <Route path="live-map" element={<LiveMap />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Routes>
  );
}
