import React, { useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { Home, History, FileText, Settings, LogOut, User, Bookmark, Users } from 'lucide-react'; // ✨ เพิ่ม Users icon
import ApiSettingModal from '../components/ApiSettingModal';
import EvaluationPage from './EvaluationPage';
import HistoryPage from './HistoryPage';
import RubricPage from './RubricPage';
import TeacherDashboard from './TeacherDashboard'; // ✨ Import หน้าจออาจารย์

const Dashboard = () => {
  const [userEmail, setUserEmail] = useState("Loading...");
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('home');
  const userRole = localStorage.getItem('role') || 'Student';

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserEmail(decoded.sub || decoded.email || token);
      } catch (error) {
        setUserEmail(token);
      }
    } else {
      window.location.href = '/login';
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  const renderHomeContent = () => (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <header className="mb-10 text-left">
        <h2 className="text-3xl font-bold text-gray-900 font-sans">ขั้นตอนการใช้งานระบบ</h2>
        <p className="text-gray-500 mt-2 text-lg">ยินดีต้อนรับ! กรุณาทำตามขั้นตอนด้านล่างเพื่อเริ่มต้นประมวลผลเอกสารของคุณ</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:border-black transition-all cursor-pointer hover:shadow-md"
          onClick={() => setIsApiModalOpen(true)}
        >
          <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl mb-6 group-hover:scale-110 transition-transform">1</div>
          <h3 className="font-bold text-xl text-gray-800 mb-3 font-sans">ตั้งค่า API</h3>
          <p className="text-sm text-gray-500 leading-relaxed font-sans">กรอกรหัส Key สำหรับเชื่อมต่อกับระบบ LLM</p>
        </div>

        <div
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:border-black transition-all cursor-pointer hover:shadow-md"
          onClick={() => setActiveMenu('evaluation')}
        >
          <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl mb-6 group-hover:scale-110 transition-transform">2</div>
          <h3 className="font-bold text-xl text-gray-800 mb-3 font-sans">อัปโหลดไฟล์</h3>
          <p className="text-sm text-gray-500 leading-relaxed font-sans">อัปโหลดไฟล์ PDF เพื่อทำการประเมินผล</p>
        </div>

        <div
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:border-black transition-all cursor-pointer hover:shadow-md"
          onClick={() => setActiveMenu('history')}
        >
          <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl mb-6 group-hover:scale-110 transition-transform">3</div>
          <h3 className="font-bold text-xl text-gray-800 mb-3 font-sans">ตรวจสอบประวัติ</h3>
          <p className="text-sm text-gray-500 leading-relaxed font-sans">ดูผลการประเมินย้อนหลังได้ที่เมนู History</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] font-sans">
      {/* --- Sidebar --- */}
      <div className="w-64 bg-[#212529] text-gray-400 flex flex-col p-4 shrink-0 transition-all">
        <div className="flex items-center gap-3 mb-10 p-2 border-b border-gray-700 pb-6">
          <div className="bg-white p-2 rounded-lg text-black shadow-sm">
            <User size={24} />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs text-gray-500 font-medium uppercase">{userRole}</p>
            <p className="text-xs truncate text-gray-400 max-w-[150px]" title={userEmail}>{userEmail}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-2 font-sans">
          <div onClick={() => setActiveMenu('home')} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${activeMenu === 'home' ? 'bg-gray-800 text-white shadow-md' : 'hover:bg-gray-800 hover:text-white'}`}>
            <Home size={20} /> <span className="text-sm font-medium">Home</span>
          </div>
          <div onClick={() => setActiveMenu('history')} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${activeMenu === 'history' ? 'bg-gray-800 text-white shadow-md' : 'hover:bg-gray-800 hover:text-white'}`}>
            <History size={20} /> <span className="text-sm font-medium">History</span>
          </div>
          <div onClick={() => setActiveMenu('evaluation')} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${activeMenu === 'evaluation' ? 'bg-gray-800 text-white shadow-md' : 'hover:bg-gray-800 hover:text-white'}`}>
            <FileText size={20} /> <span className="text-sm font-medium">Evaluation</span>
          </div>
          <div onClick={() => setActiveMenu('rubric')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeMenu === 'rubric' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:bg-gray-800 hover:text-white font-medium'}`}>
            <Bookmark size={20} /> <span className="text-sm">Rubric Criteria</span>
          </div>

          {/* ✨ เมนูใหม่เฉพาะอาจารย์ (ดีไซน์ให้ดูแตกต่างเล็กน้อย) ✨ */}
          {userRole === 'teacher' && (
            <div
              onClick={() => setActiveMenu('teacher')}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all mt-4 border ${activeMenu === 'teacher' ? 'bg-green-900/40 border-green-900/50 text-green-400 shadow-md' : 'border-transparent text-green-500/70 hover:bg-gray-800 hover:text-green-400'}`}
            >
              <Users size={20} /> <span className="text-sm font-bold">Teacher Panel</span>
            </div>
          )}
        </nav>

        {/* Bottom Menu */}
        <div className="mt-auto pt-4 space-y-2 font-sans">
          <div onClick={() => setIsApiModalOpen(true)} className="flex items-center gap-3 p-3 hover:bg-gray-800 hover:text-white rounded-lg cursor-pointer transition-all">
            <Settings size={20} /> <span className="text-sm font-medium">API Setting</span>
          </div>
          <div className="border-t border-gray-700 my-2 opacity-50"></div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-all font-sans">
            <LogOut size={20} /> <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 p-10 overflow-auto">
        {activeMenu === 'home' && renderHomeContent()}

        {/* ซ่อนหน้า Evaluation ไว้แทนการ unmount เพื่อรักษา State ของ AI */}
        <div className={activeMenu === 'evaluation' ? 'block' : 'hidden'}>
          <EvaluationPage />
        </div>

        {activeMenu === 'history' && <HistoryPage />}
        {activeMenu === 'rubric' && <RubricPage />}

        {/* ✨ หน้า Dashboard ของอาจารย์ ✨ */}
        {activeMenu === 'teacher' && <TeacherDashboard />}
      </div>

      <ApiSettingModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} />
    </div>
  );
};

export default Dashboard;