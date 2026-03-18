import React, { useState, useEffect } from 'react';
import {
  Upload, Play, Loader2, CheckCircle2, FileText,
  ChevronDown, Lightbulb, Search, FileBarChart,
  BookOpen, Quote, AlertCircle, AlertTriangle, ScrollText
} from 'lucide-react';

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
            <>
              <div className="p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                <h4 className="text-[10px] font-black uppercase text-blue-600 mb-2 flex items-center gap-1">
                  <Quote size={12} /> Evidence from your document
                </h4>
                <p className="text-sm italic text-blue-900 leading-relaxed font-serif">
                  "{item.evidence || "ไม่พบประโยคอ้างอิงที่ชัดเจน"}"
                </p>
              </div>

              <div className="pt-2 border-t border-gray-50">
                <h4 className="text-[10px] font-black uppercase text-green-600 mb-1 flex items-center gap-1">
                  <Lightbulb size={12} /> Improvement Suggestion
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">{item.suggestion || "ไม่มีคำแนะนำเพิ่มเติม"}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const EvaluationPage = () => {
  const [file, setFile] = useState(null);
  const [projectType, setProjectType] = useState('Web / Mobile App');
  const [selectedModels, setSelectedModels] = useState(['ChatGPT']);

  const [availableRubrics, setAvailableRubrics] = useState([]);
  const [selectedRubricId, setSelectedRubricId] = useState("");
  const [activeRubricData, setActiveRubricData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isJsonOpen, setIsJsonOpen] = useState(false);

  const projectTypes = ['Web / Mobile App', 'Research', 'IoT & Hardware', 'Game'];
  const models = ['ChatGPT', 'Gemini', 'DeepSeek'];

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/rubrics`)
      .then(res => res.json())
      .then(data => {
        setAvailableRubrics(data);
        if (data.length > 0) {
          setSelectedRubricId(data[0].id);
          fetchRubricDetail(data[0].id);
        }
      })
      .catch(err => console.error("Error fetching rubrics:", err));
  }, []);

  const fetchRubricDetail = (id) => {
    fetch(`${import.meta.env.VITE_API_URL}/rubric/${id}`)
      .then(res => res.json())
      .then(data => setActiveRubricData(data.rubric_data))
      .catch(err => console.error(err));
  };

  const handleRubricChange = (id) => {
    setSelectedRubricId(id);
    fetchRubricDetail(id);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
      setExtractedText("");
      setShowResults(false);
      setIsJsonOpen(false);
    }
  };

  const processAIEvaluation = async (textToEval, zipUrl = "") => {
    const aiFormData = new FormData();
    aiFormData.append('extracted_text', textToEval);
    aiFormData.append('project_type', projectType);
    aiFormData.append('models', JSON.stringify(selectedModels));
    aiFormData.append('user_email', localStorage.getItem('access_token') || 'guest');
    aiFormData.append('filename', file.name);
    aiFormData.append('zip_url', zipUrl);
    aiFormData.append('rubric_id', selectedRubricId);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/evaluate/run-ai`, {
        method: 'POST',
        body: aiFormData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "error") {
          alert(data.message);
        } else {
          setResults(data.results);
          setExtractedText(data.extracted_text);
          setShowResults(true);
        }
      } else {
        alert("การประเมินล้มเหลว กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์");
      }
    } catch (err) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อประเมินผลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEval = async () => {
    if (!file) return alert("กรุณาอัปโหลดไฟล์ PDF");
    if (!selectedRubricId) return alert("กรุณาเลือกเกณฑ์การประเมิน");
    if (selectedModels.length === 0) return alert("กรุณาเลือกอย่างน้อย 1 Model");

    setLoading(true);
    try {
      const startFormData = new FormData();
      startFormData.append('file', file);

      const startRes = await fetch(`${import.meta.env.VITE_API_URL}/evaluate/start-mineru`, {
        method: 'POST',
        body: startFormData,
      });
      const startData = await startRes.json();

      if (startData.batch_id === "fallback") {
        processAIEvaluation(startData.text, "");
        return;
      }

      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const checkRes = await fetch(`${import.meta.env.VITE_API_URL}/evaluate/check-mineru/${startData.batch_id}`);
          const statusData = await checkRes.json();
          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            processAIEvaluation(statusData.text, statusData.zip_url);
          } else if (pollCount > 60) {
            clearInterval(pollInterval);
            setLoading(false);
            alert("หมดเวลารอ (Timeout) การสกัดข้อความ");
          }
        } catch (err) {
          clearInterval(pollInterval);
          setLoading(false);
        }
      }, 5000);
    } catch (err) {
      setLoading(false);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 font-sans">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tighter text-black uppercase">
          Project <span className="text-gray-300">Evaluation</span>
        </h1>
        <p className="text-gray-400 font-medium tracking-wide">AI-driven insights for Computer Science Proposals & Projects.</p>
      </div>

      {!showResults ? (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="space-y-4">
            <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
              <Upload size={16} /> 1. Upload Document (PDF)
            </h3>
            <label className="group block w-full aspect-[21/6] border-4 border-dashed border-gray-100 rounded-[40px] hover:border-black hover:bg-gray-50 transition-all cursor-pointer relative overflow-hidden">
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="text-gray-400 group-hover:text-black" size={32} />
                </div>
                <span className="text-sm font-black uppercase tracking-widest text-gray-400 group-hover:text-black">
                  {file ? file.name : "Drag & Drop or Click to Upload"}
                </span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <ScrollText size={16} /> 2. Select Evaluation Criteria
              </h3>
              <select
                className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-700 focus:outline-none focus:border-black transition-all appearance-none cursor-pointer"
                value={selectedRubricId}
                onChange={(e) => handleRubricChange(e.target.value)}
              >
                {availableRubrics.map(r => (
                  <option key={r.id} value={r.id}>{r.title} (V.{r.version})</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <Search size={16} /> 3. Project Category
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {projectTypes.map(t => (
                  <button
                    key={t} onClick={() => setProjectType(t)}
                    className={`p-4 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${projectType === t ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}
                  >{t}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
              <FileBarChart size={16} /> 4. AI Evaluators
            </h3>
            <div className="flex flex-wrap gap-4">
              {models.map(m => (
                <button
                  key={m} onClick={() => setSelectedModels(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                  className={`px-10 py-4 rounded-2xl font-black border-2 transition-all ${selectedModels.includes(m) ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                >{m}</button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartEval} disabled={loading || !file}
            className="w-full py-8 bg-black text-white rounded-[32px] font-black text-2xl hover:scale-[1.01] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4 disabled:bg-gray-200"
          >
            {loading ? <><Loader2 className="animate-spin" size={32} /><span>EVALUATING...</span></> : <><Play size={32} fill="white" /><span>START EVALUATION</span></>}
          </button>
        </div>
      ) : (
        <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700">
          <div className="flex items-center justify-between border-b-4 border-black pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight italic">Evaluation Complete</h2>
            </div>
            <button onClick={() => setShowResults(false)} className="text-xs font-black uppercase px-6 py-3 border-2 border-black rounded-full hover:bg-black hover:text-white transition-all">Back to Edit</button>
          </div>

          {extractedText && (
            <div className="bg-gray-50 border-2 border-gray-100 rounded-[32px] p-8 space-y-4">
              <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2"><BookOpen size={16} /> Extracted Content</h3>
              <div className="bg-white max-h-[300px] overflow-y-auto border p-6 rounded-2xl shadow-inner text-sm text-gray-600 leading-relaxed font-sans whitespace-pre-wrap">{extractedText}</div>
            </div>
          )}

          {results && results.length > 0 && activeRubricData ? (
            <div className="space-y-12">
              {(() => {
                const baseModelsOrder = ['ChatGPT', 'Gemini', 'DeepSeek'];
                const actualModels = baseModelsOrder.filter(modelName => results.some(r => r.model.toLowerCase().includes(modelName.toLowerCase())));

                return Object.keys(activeRubricData).map((mainCriteria, idx) => {
                  let subItems = Object.keys(activeRubricData[mainCriteria]);
                  if (mainCriteria === "วิธีการดำเนินงาน") {
                    subItems = activeRubricData[mainCriteria][projectType] ? Object.keys(activeRubricData[mainCriteria][projectType]) : [];
                  }
                  if (subItems.length === 0) return null;

                  return (
                    <div key={idx} className="space-y-8 animate-in fade-in duration-500">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 tracking-tight">ผลการประเมิน : {mainCriteria}</h3>
                      <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#F8F9FA] border-b text-sm font-bold text-gray-700">
                            <tr>
                              <th className="px-6 py-3 border-r w-1/2">Criteria</th>
                              {actualModels.map(m => <th key={m} className="px-4 py-3 text-center border-r w-[15%]">{m}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y border-gray-300">
                            {subItems.map(sub => (
                              <tr key={sub} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3 text-sm text-gray-700 border-r">{sub}</td>
                                {actualModels.map(m => {
                                  const scoreItem = results.find(r => r.sub_criteria === sub && r.model.toLowerCase().includes(m.toLowerCase()));
                                  const score = scoreItem?.score || '-';
                                  return (
                                    <td key={m} className={`px-4 py-3 text-center text-sm font-bold border-r ${score == 4 ? 'text-green-600' : score == 0 ? 'text-red-600' : 'text-black'}`}>
                                      {score}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 tracking-tight">ข้อเสนอแนะ : {mainCriteria}</h3>
                        {subItems.map(sub => actualModels.map(m => {
                          const item = results.find(r => r.sub_criteria === sub && r.model.toLowerCase().includes(m.toLowerCase()));
                          return item ? <FeedbackAccordion key={`${sub}-${m}`} item={item} /> : null;
                        }))}
                      </div>
                    </div>
                  );
                });
              })()}

              <div className="pt-8 animate-in fade-in duration-500 border-t-2 border-dashed border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 tracking-tight">ผลลัพธ์ JSON</h3>
                <div className="bg-[#F1F1F1] border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                  <div
                    onClick={() => setIsJsonOpen(!isJsonOpen)}
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-[#E5E5E5] transition-colors"
                  >
                    <ChevronDown className={`text-gray-600 transition-transform duration-300 ${isJsonOpen ? '' : '-rotate-90'}`} size={20} />
                    <span className="text-sm font-bold text-gray-800">แสดงผลลัพธ์ JSON ดิบจากโมเดล</span>
                  </div>
                  {isJsonOpen && (
                    <div className="border-t border-gray-300 bg-[#EFEFEF] p-6 max-h-[500px] overflow-auto">
                      <pre className="text-xs text-gray-600 font-mono leading-relaxed">
                        {JSON.stringify({ evaluations: results }, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

          ) : results && results.length === 0 ? (

            <div className="mt-8 p-10 bg-red-50 border-2 border-dashed border-red-200 rounded-[32px] text-center space-y-3">
              <AlertTriangle size={48} className="text-red-400 mx-auto" />
              <h3 className="text-xl font-black text-red-600 uppercase">Evaluation Failed</h3>
              <p className="text-red-500 font-medium text-sm">ไม่สามารถประเมินผลได้ กรุณากด 'Back to Edit' เพื่อตรวจสอบการตั้งค่า</p>
            </div>

          ) : null}
        </div>
      )}
    </div>
  );
};

export default EvaluationPage;