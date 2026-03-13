import React, { useState } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  // --- จุดที่ 1: แก้ไขฟังก์ชัน handleSubmit ให้ส่งข้อมูลจริง ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // FastAPI ต้องการรูปแบบ Form Data สำหรับการ Login
    const data = new URLSearchParams();
    data.append('username', formData.email); 
    data.append('password', formData.password);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data,
      });

      if (response.ok) {
        const result = await response.json();
        // เก็บ Token ลงเครื่องเพื่อใช้ยืนยันตัวตนในหน้าอื่นๆ
        localStorage.setItem('access_token', result.access_token);
        
        // ✨ --- แทรกบรรทัดนี้เพิ่มเข้าไป --- ✨
        localStorage.setItem('role', result.role);
        // ------------------------------------

        alert('เข้าสู่ระบบสำเร็จ!');
        window.location.href = '/dashboard'; // ไปที่หน้า Dashboard
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'อีเมลหรือรหัสผ่านผิดครับ');
      }
    } catch (err) {
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (เช็คว่ารัน uvicorn หรือยังครับ?)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] font-sans text-black">
      <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-200 w-full max-w-[450px]">
        <h1 className="text-3xl font-bold mb-8 text-left">Sign in</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">KKU-mail</label>
            <input 
              type="email" 
              required 
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black transition"
              // --- จุดที่ 2: เพิ่ม onChange เพื่อเก็บค่าที่พิมพ์ลง State ---
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <a href="#" className="text-xs text-gray-500 hover:underline font-medium">Forgot your password?</a>
            </div>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black transition"
              // --- จุดที่ 2: เพิ่ม onChange สำหรับ Password ---
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="remember" className="w-4 h-4 accent-black cursor-pointer" />
            <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">Remember me</label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-md font-bold hover:bg-gray-800 transition shadow-md active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin mx-auto text-white" /> : 'Sign in'}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold tracking-widest">OR</span></div>
        </div>

        <button className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-md hover:bg-gray-50 transition mb-4 font-semibold text-gray-700">
          <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5 h-5" alt="Google" />
          Sign in with Google
        </button>

        <div className="mt-8 text-center text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="font-bold border-b border-black pb-0.5 text-black hover:opacity-70 transition">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;