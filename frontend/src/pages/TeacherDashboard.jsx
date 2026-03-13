import React, { useState, useEffect } from 'react';
import { Download, Users, Loader2, FileText, ArrowLeft, ChevronDown, AlertCircle, Quote, Lightbulb, BookOpen } from 'lucide-react';

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

const TeacherDashboard = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const teacherEmail = localStorage.getItem('access_token');

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL}/teacher/history/all?teacher_email=${teacherEmail}`)
            .then(res => {
                if (!res.ok) throw new Error("Unauthorized");
                return res.json();
            })
            .then(data => setHistory(data))
            .catch(err => alert("ไม่มีสิทธิ์เข้าถึง หรือระบบมีปัญหา"))
            .finally(() => setLoading(false));
    }, [teacherEmail]);

    const exportStudentDetailCSV = (item) => {
        const headers = ['Main Criteria', 'Sub Criteria', 'AI Model', 'Score', 'Reason', 'Suggestion'];
        const csvData = item.results.map(r => [
            `"${r.main_criteria}"`,
            `"${r.sub_criteria}"`,
            `"${r.model}"`,
            r.score,
            `"${r.reason ? r.reason.replace(/"/g, '""') : ''}"`,
            `"${r.suggestion ? r.suggestion.replace(/"/g, '""') : ''}"`
        ]);

        const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `evaluation_${item.student_email}_${item.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportSummaryCSV = () => {
        const headers = ['ID', 'Student Email', 'Filename', 'Project Type', 'Rubric Version', 'Date', 'Average Score'];
        const csvData = history.map(item => [
            item.id,
            item.student_email,
            `"${item.filename}"`,
            item.project_type,
            `V.${item.rubric_version || 1}`, // เพิ่มลงในไฟล์ CSV ด้วย
            new Date(item.date).toLocaleString('th-TH'),
            item.avg_score
        ]);

        const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `all_students_summary.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={40} /></div>;

    if (selectedItem) {
        const results = selectedItem.results;
        const mainCategories = [...new Set(results.map(r => r.main_criteria))];
        const baseModelsOrder = ['ChatGPT', 'Gemini', 'DeepSeek'];
        const rawModels = [...new Set(results.map(r => r.model))];
        const actualModels = baseModelsOrder.filter(m => rawModels.some(r => r.toLowerCase() === m.toLowerCase()));
        rawModels.forEach(m => {
            if (!actualModels.some(am => am.toLowerCase() === m.toLowerCase())) actualModels.push(m);
        });

        return (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
                <header className="flex justify-between items-start border-b-2 border-black pb-6">
                    <div>
                        <button onClick={() => setSelectedItem(null)} className="flex items-center gap-2 text-gray-500 hover:text-black font-bold mb-4 transition-colors">
                            <ArrowLeft size={18} /> กลับไปหน้ารวม
                        </button>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Student Details</h2>
                        <div className="mt-2 text-sm text-gray-600 space-y-2">
                            <p><b>Email:</b> {selectedItem.student_email}</p>
                            <p><b>File:</b> {selectedItem.filename}</p>
                            <div className="flex items-center gap-4">
                                <p><b>Date:</b> {new Date(selectedItem.date).toLocaleString('th-TH')}</p>
                                {/* ✨ แสดง Badge เลขเวอร์ชันในหน้า Detail */}
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-blue-200">
                                    Rubric V.{selectedItem.rubric_version || 1}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => exportStudentDetailCSV(selectedItem)}
                        className="bg-black text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition shadow-md"
                    >
                        <Download size={18} /> Export Full Results
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

                <div className="space-y-8">
                    {mainCategories.map(cat => {
                        const subItems = [...new Set(results.filter(r => r.main_criteria === cat).map(r => r.sub_criteria))];
                        return (
                            <div key={cat} className="space-y-6 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                                <h3 className="text-xl font-bold text-gray-800 tracking-tight">ผลการประเมิน : {cat}</h3>
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
                                            {subItems.map((sub) => (
                                                <tr key={sub} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3 text-sm text-gray-700 border-r border-gray-300">{sub}</td>
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
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 tracking-tight">ข้อเสนอแนะจาก AI</h3>
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
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-end border-b-2 border-black pb-6">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase flex items-center gap-3">
                        <Users size={36} /> Teacher Dashboard
                    </h2>
                    <p className="text-gray-500 font-medium mt-2">รายชื่อนักศึกษาที่ส่งประเมิน Proposal ทั้งหมด</p>
                </div>
                <button
                    onClick={exportSummaryCSV}
                    className="bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-md active:scale-95"
                >
                    <Download size={18} /> Export Summary
                </button>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F8F9FA] text-xs font-black uppercase text-gray-500 tracking-widest border-b border-gray-200">
                        <tr>
                            <th className="p-5 border-r border-gray-200">Student Email</th>
                            <th className="p-5 border-r border-gray-200">Document</th>
                            <th className="p-5 border-r border-gray-200 text-center">Avg. Score</th>
                            <th className="p-5 border-r border-gray-200">Date</th>
                            <th className="p-5 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.length === 0 ? (
                            <tr><td colSpan="5" className="p-10 text-center text-gray-400 font-bold">ไม่มีข้อมูลการประเมิน</td></tr>
                        ) : (
                            history.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-5 font-bold text-gray-800 text-sm border-r border-gray-100">{item.student_email}</td>
                                    <td className="p-5 border-r border-gray-100">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-sm text-gray-800 font-bold">
                                                <FileText size={16} className="text-blue-500 shrink-0" />
                                                <span className="truncate max-w-[200px]" title={item.filename}>{item.filename}</span>
                                            </div>
                                            {/* ✨ แสดง Badge เลขเวอร์ชันใต้ชื่อไฟล์ */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full w-max">
                                                    Rubric V.{item.rubric_version || 1}
                                                </span>
                                                {item.zip_url && (
                                                    <a
                                                        href={item.zip_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-800 transition w-max"
                                                    >
                                                        <Download size={12} /> ZIP
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center border-r border-gray-100">
                                        <span className={`px-4 py-1 rounded-full text-xs font-black ${item.avg_score >= 3 ? 'bg-green-100 text-green-700' : item.avg_score >= 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            {item.avg_score} / 4
                                        </span>
                                    </td>
                                    <td className="p-5 text-xs text-gray-500 border-r border-gray-100">
                                        {new Date(item.date).toLocaleDateString('th-TH')}
                                    </td>
                                    <td className="p-5 text-center">
                                        <button
                                            onClick={() => setSelectedItem(item)}
                                            className="bg-gray-100 text-gray-800 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"
                                        >
                                            View Details
                                        </button>
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

export default TeacherDashboard;