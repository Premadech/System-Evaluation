import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Edit3, X, Loader2, History, CheckCircle2, Info } from 'lucide-react';

const RubricPage = () => {
  const [rubricList, setRubricList] = useState([]);
  const [selectedRubricId, setSelectedRubricId] = useState(null);
  const [rubricData, setRubricData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const isTeacher = localStorage.getItem('role') === 'teacher';
  const userEmail = localStorage.getItem('access_token');

  useEffect(() => {
    fetchAllRubrics();
  }, []);

  const fetchAllRubrics = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rubrics`);
      const data = await res.json();
      setRubricList(data);
      if (data.length > 0 && !selectedRubricId) {
        loadRubricDetail(data[0].id);
      } else if (data.length === 0) {
        setRubricData(null);
        setSelectedRubricId(null);
      }
    } catch (error) {
      console.error("Failed to fetch rubrics", error);
    }
  };

  const loadRubricDetail = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rubric/${id}`);
      const data = await res.json();
      setRubricData(data);
      setSelectedRubricId(id);
      setNewTitle(data.title);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const autoParseCriteria = (str) => {
    if (typeof str !== 'string') return str;

    const idx1 = str.indexOf('- 1 คะแนน');
    const idx2 = str.indexOf('- 2 คะแนน');
    const idx3 = str.indexOf('- 3 คะแนน');
    const idx4 = str.indexOf('- 4 คะแนน');

    if (idx1 !== -1 && idx2 !== -1 && idx3 !== -1) {
      const cleanText = (t) => t.replace(/^-?\s*\d\s*คะแนน[^\:]*:\s*/, '').trim();

      const p1 = str.substring(idx1);
      const p2 = str.substring(idx2, idx1);
      const p3 = str.substring(idx3, idx2);
      const p4 = idx4 !== -1 ? str.substring(idx4, idx3) : str.substring(0, idx3);

      return {
        '4': cleanText(p4),
        '3': cleanText(p3),
        '2': cleanText(p2),
        '1': cleanText(p1)
      };
    }
    return str;
  };

  const startEditing = () => {
    let clonedData = JSON.parse(JSON.stringify(rubricData.rubric_data));
    for (let cat in clonedData) {
      for (let sub in clonedData[cat]) {
        if (typeof clonedData[cat][sub] === 'string') {
          clonedData[cat][sub] = autoParseCriteria(clonedData[cat][sub]);
        } else if (typeof clonedData[cat][sub] === 'object') {
          for (let pt in clonedData[cat][sub]) {
            if (typeof clonedData[cat][sub][pt] === 'string') {
              clonedData[cat][sub][pt] = autoParseCriteria(clonedData[cat][sub][pt]);
            }
          }
        }
      }
    }
    setEditData(clonedData);
    setIsEditing(true);
  };

  const handleDeleteVersion = async () => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${rubricData.title} (V.${rubricData.version})" ทิ้ง?\n\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rubric/${selectedRubricId}?email=${userEmail}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert("🗑️ ลบเวอร์ชันนี้ออกจากระบบเรียบร้อยแล้ว");
        setSelectedRubricId(null);
        fetchAllRubrics();
      } else {
        alert("ไม่สามารถลบได้ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  const addCategory = () => {
    const categoryName = prompt("ชื่อหมวดหมู่ใหม่ (เช่น บทที่ 4 ผลการดำเนินงาน):");
    if (categoryName && !editData[categoryName]) {
      setEditData({ ...editData, [categoryName]: { "หัวข้อเริ่มต้น": { "4": "", "3": "", "2": "", "1": "" } } });
    }
  };

  const removeCategory = (catName) => {
    if (window.confirm(`ลบหมวดหมู่ "${catName}" และหัวข้อย่อยทั้งหมด?`)) {
      const newData = { ...editData };
      delete newData[catName];
      setEditData(newData);
    }
  };

  const addSubCriteria = (catName) => {
    const subName = prompt(`เพิ่มหัวข้อย่อยใน ${catName}:`);
    if (subName) {
      setEditData({
        ...editData,
        [catName]: { ...editData[catName], [subName]: { "4": "", "3": "", "2": "", "1": "" } }
      });
    }
  };

  const removeSubCriteria = (catName, subName) => {
    const newData = { ...editData };
    delete newData[catName][subName];
    setEditData(newData);
  };

  const handleScoreChange = (cat, sub, scoreKey, value, projType = null, isFullString = false) => {
    const newData = { ...editData };
    if (projType) {
      if (isFullString) {
        newData[cat][sub][projType] = value;
      } else {
        if (typeof newData[cat][sub][projType] !== 'object') {
          newData[cat][sub][projType] = { "4": newData[cat][sub][projType] || "", "3": "", "2": "", "1": "" };
        }
        newData[cat][sub][projType][scoreKey] = value;
      }
    } else {
      if (isFullString) {
        newData[cat][sub] = value;
      } else {
        if (typeof newData[cat][sub] !== 'object') {
          newData[cat][sub] = { "4": newData[cat][sub] || "", "3": "", "2": "", "1": "" };
        }
        newData[cat][sub][scoreKey] = value;
      }
    }
    setEditData(newData);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rubric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, title: newTitle, rubric_data: editData })
      });

      if (res.ok) {
        alert("✅ บันทึกเป็นเวอร์ชันใหม่เรียบร้อยแล้ว!");
        setIsEditing(false);
        fetchAllRubrics();
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const renderScoreCells = (cat, sub, criteriaObj, projType = null) => {
    const parsedObj = autoParseCriteria(criteriaObj);

    if (typeof parsedObj === 'string') {
      return (
        <td colSpan={4} className="p-4 border-r border-gray-200 align-top bg-gray-50/50">
          {isEditing ? (
            <textarea
              className="w-full h-full min-h-[100px] p-4 text-sm bg-white border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none resize-y"
              value={parsedObj}
              placeholder="ระบุรายละเอียด..."
              onChange={(e) => handleScoreChange(cat, sub, '4', e.target.value, projType, true)}
            />
          ) : (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{parsedObj}</div>
          )}
        </td>
      );
    }

    const scores = ['4', '3', '2', '1'];
    return scores.map(score => {
      const val = parsedObj[score] || '';
      return (
        <td key={score} className="p-4 border-r border-gray-200 align-top w-[18%]">
          {isEditing ? (
            <textarea
              className="w-full h-full min-h-[140px] p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-400 focus:outline-none resize-y transition-colors leading-relaxed"
              value={val}
              placeholder={`เกณฑ์สำหรับคะแนน ${score}...`}
              onChange={(e) => handleScoreChange(cat, sub, score, e.target.value, projType, false)}
            />
          ) : (
            <div className="text-sm text-gray-700 leading-relaxed bg-white h-full p-2 whitespace-pre-wrap break-words whitespace-normal">{val}</div>
          )}
        </td>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] -mt-10 pt-10 pb-20 font-sans">
      <div className="flex flex-col xl:flex-row gap-8 max-w-[1600px] mx-auto px-6 animate-in fade-in duration-500">

        {/* ========================================== */}
        {/* 📚 Sidebar: Version History */}
        {/* ========================================== */}
        <div className="w-full xl:w-72 shrink-0 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-md">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-xl text-gray-900">Rubric Vault</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Version History</p>
            </div>
          </div>

          {isTeacher && (
            <button
              onClick={() => {
                setRubricData({ title: "รูบริกใหม่", rubric_data: {} });
                setEditData({});
                setNewTitle("รูบริกใหม่");
                setIsEditing(true);
              }}
              className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-black hover:text-black hover:shadow-sm transition-all flex items-center justify-center gap-2 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Create New Rubric
            </button>
          )}

          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            {rubricList.map((r) => {
              const isActive = selectedRubricId === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => loadRubricDetail(r.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 relative overflow-hidden group ${isActive
                    ? 'border-black bg-white shadow-md ring-1 ring-black/5'
                    : 'border-transparent bg-white shadow-sm hover:border-gray-300'
                    }`}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black" />}
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-black text-sm line-clamp-2 pr-2 ${isActive ? 'text-black' : 'text-gray-600'}`}>
                      {r.title}
                    </span>
                    <span className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest ${isActive ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                      V.{r.version}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <CheckCircle2 size={12} className={isActive ? 'text-green-500' : ''} />
                    {new Date(r.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}

            {rubricList.length === 0 && !loading && (
              <div className="text-center p-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm font-bold">ไม่มีข้อมูล Rubric</p>
                <p className="text-xs mt-1">กรุณากดสร้างรูบริกใหม่</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* 📝 Main Content: Rubric Editor */}
        {/* ========================================== */}
        <div className="flex-1 space-y-8 min-w-0">

          {rubricData ? (
            <>
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-gray-900">
                    EVALUATION <span className="text-gray-300">RUBRIC</span>
                  </h1>
                  <p className="text-gray-500 font-medium mt-1">เกณฑ์การประเมินโครงงานที่ AI ใช้เป็นมาตรฐานในการให้คะแนน</p>
                </div>

                {isTeacher && (
                  <div className="flex gap-3 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-full font-bold hover:bg-gray-50 transition-colors">
                          <X size={16} className="inline mr-1" /> Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-[#0052FF] text-white rounded-full font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all disabled:opacity-50">
                          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Changes
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleDeleteVersion} className="px-5 py-3 bg-red-50 text-red-600 rounded-full font-bold flex items-center gap-2 hover:bg-red-100 transition-colors border border-red-100">
                          <Trash2 size={18} /> ลบ V.{rubricData.version}
                        </button>
                        <button onClick={startEditing} className="px-8 py-3 bg-black text-white rounded-full font-bold flex items-center gap-2 hover:-translate-y-0.5 shadow-lg transition-all">
                          <Edit3 size={18} /> Edit Rubric
                        </button>
                      </>
                    )}
                  </div>
                )}
              </header>

              {isEditing && (
                <div className="bg-[#EBF3FF] border border-[#B3D4FF] text-[#0052FF] p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
                  <Info size={20} className="shrink-0" />
                  <p className="text-sm font-medium">✏️ <b>คุณกำลังอยู่ในโหมดแก้ไข:</b> สามารถคลิกและพิมพ์แก้ไขข้อความในตารางด้านล่างได้เลย เมื่อเสร็จแล้วกด Save Changes (ระบบจะสร้างเป็นเวอร์ชันใหม่ให้)</p>
                </div>
              )}

              {isEditing && (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                  <span className="font-bold text-gray-500 whitespace-nowrap">ชื่อเกณฑ์การประเมิน :</span>
                  <input
                    className="w-full text-xl font-bold text-black bg-gray-50 border border-gray-200 p-3 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="เช่น สอบเค้าโครง (Proposal)..."
                  />
                </div>
              )}

              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="animate-spin mb-4" size={48} />
                  <p className="font-bold uppercase tracking-widest text-sm">Loading Rubric Data...</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {(isEditing ? editData : rubricData.rubric_data) && Object.entries(isEditing ? editData : rubricData.rubric_data).map(([cat, subs]) => (
                    <div key={cat} className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-black text-gray-900 border-l-[6px] border-black pl-4 py-1 leading-none">{cat}</h2>
                        {isEditing && (
                          <button onClick={() => removeCategory(cat)} className="text-red-400 hover:text-red-600 bg-white border border-gray-200 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1">
                            <Trash2 size={16} /> ลบหมวดหมู่นี้
                          </button>
                        )}
                      </div>

                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
                          <thead>
                            <tr className="bg-[#F8F9FA] text-sm font-black text-gray-700 border-b border-gray-200">
                              <th className="p-4 w-[25%] border-r border-gray-200 text-center">เกณฑ์การประเมิน</th>
                              <th className="p-4 w-[18%] border-r border-gray-200 text-center">4 (ดีมาก)</th>
                              <th className="p-4 w-[18%] border-r border-gray-200 text-center">3 (ดี)</th>
                              <th className="p-4 w-[18%] border-r border-gray-200 text-center">2 (พอใช้)</th>
                              <th className="p-4 w-[18%] border-r border-gray-200 text-center">1 (ต้องปรับปรุง)</th>
                              {isEditing && <th className="p-4 w-10 text-center"></th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {Object.entries(subs).map(([sub, criteria]) => {
                              const isProjectType = typeof criteria === 'object' && criteria !== null && !('4' in criteria);

                              if (isProjectType) {
                                return (
                                  <React.Fragment key={sub}>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                      <td colSpan={isEditing ? 6 : 5} className="p-4 font-black text-blue-800 text-base break-words">
                                        <span className="break-words whitespace-normal block">{sub}</span>
                                        {isEditing && (
                                          <button onClick={() => removeSubCriteria(cat, sub)} className="ml-4 text-red-500 text-xs hover:underline font-normal">
                                            [ลบหัวข้อหลักนี้]
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                    {Object.entries(criteria).map(([projType, projCriteria]) => (
                                      <tr key={`${sub}-${projType}`} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="p-4 border-r border-gray-200 align-top break-words">
                                          <span className="font-bold text-[14px] text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-200 break-words whitespace-normal block w-full leading-relaxed shadow-sm">{projType}</span>
                                        </td>
                                        {renderScoreCells(cat, sub, projCriteria, projType)}
                                        {isEditing && <td className="border-r border-gray-200"></td>}
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                );
                              }

                              return (
                                <tr key={sub} className="hover:bg-gray-50/50 transition-colors group">
                                  <td className="p-4 border-r border-gray-200 align-top break-words">
                                    <span className="font-bold text-[15px] text-gray-800 leading-snug break-words whitespace-normal block">{sub}</span>
                                  </td>
                                  {renderScoreCells(cat, sub, criteria)}

                                  {isEditing && (
                                    <td className="p-2 align-middle text-center border-r border-gray-200">
                                      <button onClick={() => removeSubCriteria(cat, sub)} className="text-gray-300 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-xl border border-gray-200 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100">
                                        <X size={16} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {isEditing && (
                          <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <button
                              onClick={() => addSubCriteria(cat)}
                              className="text-blue-600 font-bold text-sm flex items-center gap-2 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-blue-200"
                            >
                              <Plus size={16} /> เพิ่มหัวข้อการประเมินย่อย
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isEditing && (
                    <button
                      onClick={addCategory}
                      className="w-full py-10 border-4 border-dashed border-gray-200 rounded-[1.5rem] text-gray-400 font-black text-xl hover:border-black hover:text-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-3 group mt-8"
                    >
                      <div className="w-12 h-12 bg-gray-100 text-gray-400 group-hover:bg-black group-hover:text-white rounded-full flex items-center justify-center transition-all">
                        <Plus size={24} />
                      </div>
                      เพิ่มหมวดหมู่ใหม่ (Main Category)
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 pt-20">
              <p className="text-xl font-bold uppercase">ไม่มีข้อมูลให้แสดงผล</p>
              <p className="text-sm mt-2">กรุณาเลือก Rubric จากประวัติด้านซ้าย หรือกดสร้างใหม่</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RubricPage;