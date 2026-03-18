import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

const ApiSettingModal = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    base_url: 'https://gen.ai.kku.ac.th/api/v1',
    api_key: ''
  });
  const [loading, setLoading] = useState(false);
  const userEmail = localStorage.getItem('access_token');

  useEffect(() => {
    if (isOpen && userEmail) {
      fetch(`${import.meta.env.VITE_API_URL}/api-settings/${userEmail}`)
        .then(res => res.json())
        .then(data => {
          setSettings({
            base_url: data.base_url || 'https://gen.ai.kku.ac.th/api/v1',
            api_key: data.has_key ? '********' : ''
          });
        })
        .catch(err => console.error(err));
    }
  }, [isOpen, userEmail]);

  const handleSave = async () => {
    if (settings.api_key === '********') {
      alert("ปิดหน้าต่างได้เลย ระบบยังใช้ API Key เดิมที่ปลอดภัยของคุณครับ");
      onClose();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          base_url: settings.base_url,
          api_key: settings.api_key
        })
      });

      if (res.ok) {
        alert("บันทึกและเข้ารหัส API Key ลงฐานข้อมูลเรียบร้อย!");
        onClose();
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#E9E9E9] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-300">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-white/50">
          <span className="text-gray-600 font-bold">API Security Setting</span>
          <button onClick={onClose} className="hover:bg-gray-200 p-1 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-10 space-y-8">
          <div className="text-center space-y-5">
            <h2 className="text-3xl font-bold">การตั้งค่า API อย่างปลอดภัย</h2>
            <p className="text-gray-600 text-sm">
              API Key ของคุณจะถูก <b>เข้ารหัส (Encrypted)</b> ก่อนบันทึกลงฐานข้อมูล<br />
              เพื่อป้องกันการเข้าถึงจากบุคคลที่สาม
            </p>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 inline-block w-full max-w-md text-left shadow-sm">
              <span className="font-bold flex items-center gap-2 mb-1">
                วิธีการขอรับ API Key
              </span>
              สามารถขอรับได้จากเว็บ KKU IntelSphere API ผ่านลิ้งค์ด้านล่างนี้:<br />
              <a
                href="https://gen.ai.kku.ac.th/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-bold hover:text-blue-800 transition mt-1 inline-block"
              >
                https://gen.ai.kku.ac.th/
              </a>
            </div>
          </div>

          <div className="space-y-6 max-w-md mx-auto">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase">Base URL</label>
              <input
                type="text"
                className="w-full p-3 bg-gray-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                value={settings.base_url}
                onChange={(e) => setSettings({ ...settings, base_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase">API Key (AES Encrypted)</label>
              <input
                type="password"
                className="w-full p-3 bg-gray-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                placeholder="กรอก API Key ใหม่ของคุณที่นี่..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave} disabled={loading}
              className="bg-black text-white px-10 py-3 rounded-full font-bold transition-all shadow-md flex items-center gap-2 hover:scale-105"
            >
              {loading && <Loader2 className="animate-spin" size={16} />} Save Securely
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiSettingModal;