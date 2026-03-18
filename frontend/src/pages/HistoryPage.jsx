import React, { useState, useEffect } from 'react';
import { ChevronDown, LayoutList, ArrowLeft, Lightbulb, Search, FileText, FileBarChart, Loader2, Quote, AlertCircle, BookOpen } from 'lucide-react';

const FeedbackAccordion = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isPerfect = item.score === 4 || item.score === '4';
  const isZero = item.score === 0 || item.score === '0';

  return (
    <div className={`rounded-2xl border overflow-hidden mb-4 transition-all duration-300 ${isZero ? 'bg-red-50 border-red-200' : 'bg-[#F1F1F1] border-gray-200'}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isZero ? 'hover:bg-red-100' : 'hover:bg-gray-200'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-2 h-10 rounded-full ${isPerfect ? 'bg-green-500' : isZero ? 'bg-red-500' : 'bg-black'}`}></div>
          <div className="flex flex-col">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isZero ? 'text-red-400' : 'text-gray-400'}`}>{item.model}</span>
            <span className={`text-base font-bold ${isZero ? 'text-red-700' : 'text-gray-800'}`}>{item.sub_criteria}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className={`text-2xl font-black ${isPerfect ? 'text-green-600' : isZero ? 'text-red-600' : 'text-black'}`}>
            {item.score}<span className={`text-xs ${isZero ? 'text-red-300' : 'text-gray-400'}`}>/4</span>
          </span>
          <ChevronDown className={`${isZero ? 'text-red-400' : 'text-gray-400'} transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className={`p-6 bg-white border-t space-y-5 animate-in fade-in slide-in-from-top-1 ${isZero ? 'border-red-100' : 'border-gray-100'}`}>
          <div>
            <h4 className={`text-[10px] font-black uppercase mb-1 flex items-center gap-1 ${isZero ? 'text-red-500' : 'text-gray-400'}`}>
              <AlertCircle size={12} /> Analysis Reason
            </h4>
            <p className={`leading-relaxed ${isZero ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{item.reason}</p>
          </div>

          {!isZero && (
            <div className="p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
              <h4 className="text-[10px] font-black uppercase text-blue-600 mb-2 flex items-center gap-1">
                <Quote size={12} /> Evidence from your document
              </h4>
              <p className="text-sm italic text-blue-900 leading-relaxed font-serif">
                "{item.evidence || "ไม่พบประโยคอ้างอิงที่ชัดเจน"}"
              </p>
            </div>
          )}

          {!isZero && (
            <div className="pt-2 border-t border-gray-50">
              <h4 className="text-[10px] font-black uppercase text-green-600 mb-1 flex items-center gap-1">
                <Lightbulb size={12} /> Improvement Suggestion
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed">{item.suggestion || "ไม่มีคำแนะนำเพิ่มเติม"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const email = localStorage.getItem('access_token');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/history/${email}`);
        const data = await res.json();
        setHistory(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, []);

  if (selectedItem) {
    const results = selectedItem.results;
    const mainCategories = [...new Set(results.map(r => r.main_criteria))];

    const baseModelsOrder = ['ChatGPT', 'Gemini', 'DeepSeek'];
    const rawModels = [...new Set(results.map(r => r.model))];
    const actualModels = baseModelsOrder.filter(m => rawModels.some(r => r.toLowerCase() === m.toLowerCase()));
    rawModels.forEach(m => {
      if (!actualModels.some(am => am.toLowerCase() === m.toLowerCase())) {
        actualModels.push(m);
      }
    });

    return (
      <div className="max-w-5xl mx-auto p-10 space-y-12 animate-in fade-in duration-500 font-sans pb-20">
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic">History Details</h2>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-blue-600 font-bold text-xs uppercase tracking-widest">
                {new Date(selectedItem.date).toLocaleString()}
              </p>
              <span className="bg-blue-100 text-blue-800 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-blue-200">
                Rubric V.{selectedItem.rubric_version || 1}
              </span>
            </div>
          </div>
          <button onClick={() => setSelectedItem(null)} className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 text-black rounded-xl font-bold hover:bg-black hover:text-white transition-all">
            <ArrowLeft size={18} /> Back
          </button>
        </header>

        {selectedItem.extracted_text && (
          <div className="bg-gray-50 border-2 border-gray-100 rounded-[32px] p-8 space-y-4">
            <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
              <BookOpen size={16} /> Extracted Document Content
            </h3>
            <div className="bg-white max-h-[300px] overflow-y-auto border border-gray-200 p-6 rounded-2xl shadow-inner">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-600 leading-relaxed">
                {selectedItem.extracted_text}
              </pre>
            </div>
          </div>
        )}

        {mainCategories.map(cat => {
          const subItems = [...new Set(results.filter(r => r.main_criteria === cat).map(r => r.sub_criteria))];

          return (
            <div key={cat} className="space-y-6 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 tracking-tight">
                ผลการประเมิน : {cat}
              </h3>

              <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8F9FA] border-b border-gray-300 text-sm font-bold text-gray-700">
                    <tr>
                      <th className="px-6 py-3 border-r border-gray-300 w-1/2">Criteria</th>
                      {actualModels.map(m => (
                        <th key={m} className="px-4 py-3 text-center border-r border-gray-300 w-[15%]">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {subItems.map((sub, sIdx) => (
                      <tr key={sub} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-sm text-gray-700 border-r border-gray-300">
                          {sub}
                        </td>
                        {actualModels.map(m => {
                          const scoreItem = results.find(r => r.model.toLowerCase() === m.toLowerCase() && r.sub_criteria === sub && r.main_criteria === cat);
                          const score = scoreItem?.score || '-';
                          const isPerfectScore = score === 4 || score === '4';

                          return (
                            <td key={m} className={`px-4 py-3 text-center text-sm font-bold border-r border-gray-300 ${isPerfectScore ? 'text-green-600' : 'text-black'}`}>
                              {score}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4 tracking-tight">
                  ข้อเสนอแนะ : {cat}
                </h3>
                <div className="space-y-4">
                  {subItems.map((sub, sIdx) => {
                    return actualModels.map(modelName => {
                      const item = results.find(r => r.main_criteria === cat && r.sub_criteria === sub && r.model.toLowerCase() === modelName.toLowerCase());
                      if (!item) return null;

                      return <FeedbackAccordion key={`${sIdx}-${modelName}`} item={item} />;
                    });
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-10 font-sans space-y-10 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-2 italic uppercase">History</h2>
        <p className="text-gray-400 font-medium text-sm">รายการประเมินโครงงานย้อนหลังของคุณ</p>
      </header>

      <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 bg-[#212529] text-white flex justify-between items-center">
          <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
            <LayoutList size={24} /> Evaluation Logs
          </h3>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">
            <tr>
              <th className="p-6 border-b">ID</th>
              <th className="p-6 border-b">Date</th>
              <th className="p-6 border-b">Filename</th>
              <th className="p-6 border-b text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="4" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-300" size={40} /></td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan="4" className="p-20 text-center text-gray-300 font-black text-xl italic uppercase">No Data Found</td></tr>
            ) : (
              history.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-all group">
                  <td className="p-6 text-gray-400 font-mono text-xs">#{String(index + 1).padStart(3, '0')}</td>
                  <td className="p-6 text-gray-800 font-bold text-sm">
                    {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-6 text-gray-500 text-xs font-medium">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="truncate max-w-[200px] text-gray-800 font-bold">{item.filename}</span>
                      <span className="w-max bg-blue-50 text-blue-700 border border-blue-200 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                        Rubric V.{item.rubric_version || 1}
                      </span>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => setSelectedItem(item)} className="bg-gray-100 text-gray-800 px-8 py-2 rounded-xl font-black text-xs uppercase hover:bg-black hover:text-white transition-all shadow-sm active:scale-95">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryPage;