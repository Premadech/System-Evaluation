import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';

function App() {
  const location = useLocation();

  // ตรวจสอบว่าปัจจุบันอยู่ที่หน้า Login หรือ Register หรือไม่
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;