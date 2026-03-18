import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return alert("รหัสผ่านไม่ตรงกัน!");
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      if (response.ok) {
        alert('สมัครสมาชิกสำเร็จ!');
        navigate('/login');
      } else {
        const error = await response.json();
        alert(error.detail || 'สมัครสมาชิกไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err)
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-200 w-full max-w-[450px]">
        <h1 className="text-3xl font-bold mb-8 text-left">Register</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">KKU-mail</label>
            <input
              type="email" required placeholder="your@email.com"
              className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black outline-none transition"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password" required placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black outline-none transition"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password" required placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black outline-none transition"
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>
          <button type="submit" className="w-full bg-black text-white py-3 rounded-md font-bold shadow-md hover:bg-gray-800 transition">
            Create Account
          </button>
        </form>
        <div className="mt-8 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="font-bold border-b border-black pb-0.5">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;