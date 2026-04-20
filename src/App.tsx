import { useState, useRef } from 'react';
import { useAction, useMutation } from 'convex/react';
// @ts-ignore
import { api } from '../convex/_generated/api';
import { UploadCloud, CheckCircle, AlertTriangle, Send, Phone, Leaf, Loader2 } from 'lucide-react';

interface AnalysisResult {
  score: number;
  category: string;
  recommendation: string;
}

function App() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Convex Hooks
  // @ts-ignore
  const analyzeImage = useAction(api.ai.analyzeImage);
  // @ts-ignore
  const saveReport = useMutation(api.reports.saveReport);
  // @ts-ignore
  const sendWhatsApp = useAction(api.whatsapp.sendWhatsApp);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Format file tidak didukung. Harap upload gambar.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      
      // Extract base64 part
      const base64 = dataUrl.split(',')[1];
      setBase64Image(base64);
      setMimeType(file.type);
      setResult(null); // Reset previous result
      setSendSuccess(false);
    };
    reader.readAsDataURL(file);
  };

  const executeSendReport = async (data: AnalysisResult, phoneNumber: string) => {
    if (!phoneNumber.startsWith('62')) {
      alert("Nomor WhatsApp harus diawali dengan 62");
      return;
    }
    
    setIsSending(true);
    try {
      // Save to database
      await saveReport({
        score: data.score,
        category: data.category,
        recommendation: data.recommendation,
      });

      // Send WhatsApp
      await sendWhatsApp({
        score: data.score,
        category: data.category,
        recommendation: data.recommendation,
        phone: phoneNumber,
      });

      setSendSuccess(true);
    } catch (error) {
      console.error(error);
      alert("Gagal mengirim laporan atau menyimpan data.");
    } finally {
      setIsSending(false);
    }
  };

  const handleAnalyze = async () => {
    if (!base64Image || !mimeType) {
      alert("Harap upload gambar terlebih dahulu");
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await analyzeImage({ imageBase64: base64Image, mimeType });
      setResult(res);

      // Otomatis kirim WA jika skor < 40 dan nomor sudah diisi
      if (res.score < 40) {
        if (phone && phone.startsWith('62')) {
          await executeSendReport(res, phone);
        } else {
          alert('Skor kurang dari 40! Harap masukkan nomor WhatsApp yang benar untuk mengirim peringatan otomatis.');
        }
      }
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menganalisis gambar: ${error.message || error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 sm:px-6">
      {/* Header */}
      <div className="max-w-3xl w-full text-center space-y-3 mb-10">
        <div className="flex justify-center mb-2">
          <div className="bg-green-100 p-3 rounded-full text-green-600">
            <Leaf size={32} />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-800">UrbanClean AI</h1>
        <p className="text-lg text-slate-600">Analisis Kebersihan Jalan & Lingkungan</p>
        <div className="inline-block bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-full text-sm font-medium mt-4 shadow-sm">
          🌍 Aplikasi ini mendukung SDG 11 dengan monitoring kebersihan kota berbasis AI.
        </div>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Upload */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">1. Upload Gambar Jalan</h2>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${imagePreview ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-green-400 hover:bg-slate-50'}
            `}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-sm" />
            ) : (
              <div className="flex flex-col items-center text-slate-500 py-10">
                <UploadCloud size={48} className="text-slate-400 mb-4" />
                <p className="font-medium">Klik atau Drag & Drop gambar</p>
                <p className="text-sm mt-2 text-slate-400">PNG, JPG format up to 5MB</p>
              </div>
            )}
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleImageChange} 
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!imagePreview || isAnalyzing}
            className="mt-6 w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <><Loader2 className="animate-spin" size={20} /> Menganalisis...</>
            ) : (
              <><CheckCircle size={20} /> Analisis Kebersihan</>
            )}
          </button>
        </div>

        {/* Right Column: Results & Action */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-grow">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">2. Hasil Analisis AI</h2>
            
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <AlertTriangle size={48} className="mb-4 opacity-50" />
                <p>Belum ada analisis. Upload dan klik tombol analisis.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-600">Skor Kebersihan</span>
                    <span className={`text-2xl font-bold ${result.score >= 70 ? 'text-green-600' : result.score >= 40 ? 'text-amber-500' : 'text-red-600'}`}>
                      {result.score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${result.score >= 70 ? 'bg-green-500' : result.score >= 40 ? 'bg-amber-400' : 'bg-red-500'}`} 
                      style={{ width: `${result.score}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Kategori</span>
                    <span className="font-semibold text-slate-800 capitalize">{result.category}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status Laporan</span>
                    <span className="font-semibold text-slate-800">
                      {result.score < 40 ? '🚨 Kritis' : '✅ Aman'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-900">
                  <span className="block text-xs font-semibold uppercase tracking-wider mb-2 text-blue-700">Rekomendasi AI</span>
                  <p className="text-sm leading-relaxed">{result.recommendation}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">3. Notifikasi Laporan</h2>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Phone size={16} /> Nomor WhatsApp Tujuan (Format: 628xxx)
              </label>
              <input
                type="text"
                placeholder="628123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              
              <button
                onClick={() => result && executeSendReport(result, phone)}
                disabled={!result || !phone || isSending || sendSuccess}
                className={`mt-2 w-full py-3.5 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 transition-all
                  ${!result ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 hover:bg-slate-900 text-white'}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSending ? (
                  <><Loader2 className="animate-spin" size={20} /> Mengirim Laporan...</>
                ) : sendSuccess ? (
                  <><CheckCircle size={20} className="text-green-400" /> Terkirim!</>
                ) : (
                  <><Send size={20} /> Kirim Manual (WhatsApp)</>
                )}
              </button>
            </div>
            {result?.score !== undefined && result.score < 40 && (
              <p className="border-l-4 border-amber-400 pl-3 mt-4 text-xs text-amber-700 py-1 bg-amber-50 rounded-r-md">
                Karena skor &lt; 40%, sistem otomatis akan berusaha mengirimkan peringatan begitu analisis selesai.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
