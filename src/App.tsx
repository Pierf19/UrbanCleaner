import { useState, useRef } from 'react';
import { useAction, useMutation } from 'convex/react';
// @ts-ignore
import { api } from '../convex/_generated/api';
import { UploadCloud, CheckCircle, AlertTriangle, Send, Phone, Leaf, Loader2, MapPin, Navigation } from 'lucide-react';

interface AnalysisResult {
  score: number;
  category: string;
  recommendation: string;
}

interface Location {
  latitude: number;
  longitude: number;
}

async function getLocationFromImage(file: File): Promise<Location | null> {
  try {
    const exifr = await import('exifr');
    const exifData = await exifr.default?.parse(file, { gps: true }) || await exifr.parse(file, { gps: true });
    if (exifData?.latitude && exifData?.longitude) {
      return { latitude: exifData.latitude, longitude: exifData.longitude };
    }
  } catch (e) {
    console.log("EXIF parse failed, trying browser GPS");
  }
  return null;
}

function getBrowserLocation(): Promise<Location | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }),
      (error) => {
        console.error("GPS Error:", error);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function App() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  const [location, setLocation] = useState<Location | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle');

  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [isAutoSent, setIsAutoSent] = useState(false);

  // @ts-ignore
  const analyzeImage = useAction(api.ai.analyzeImage);
  // @ts-ignore
  const uploadImage = useAction(api.cloudinary.uploadImage);
  // @ts-ignore
  const saveReport = useMutation(api.reports.saveReport);
  // @ts-ignore
  const sendWhatsApp = useAction(api.whatsapp.sendWhatsApp);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Format file tidak seringkalian. Harap upload gambar.");
      return;
    }

    // Reset state
    setResult(null);
    setSendSuccess(false);
    setIsAutoSent(false);
    setLocationStatus('idle');

    // Load image
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      
      const base64 = dataUrl.split(',')[1];
      setBase64Image(base64);
      setMimeType(file.type);

      // Try get location from EXIF first, then browser GPS
      setLocationStatus('loading');
      const exifLocation = await getLocationFromImage(file);
      if (exifLocation) {
        setLocation(exifLocation);
        setLocationStatus('found');
      } else {
        const browserLocation = await getBrowserLocation();
        if (browserLocation) {
          setLocation(browserLocation);
          setLocationStatus('found');
        } else {
          setLocationStatus('not-found');
        }
      }
    };
    reader.readAsDataURL(file);
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

      // Auto send if score < 40
      if (res.score < 40) {
        setIsSending(true);
        try {
          // Upload image to Cloudinary with signature
          let imageUrl = "";
          try {
            const uploadRes = await uploadImage({ 
              imageBase64: base64Image, 
              mimeType: mimeType!
            });
            imageUrl = uploadRes.url;
          } catch (uploadErr) {
            console.error("Image upload failed:", uploadErr);
          }

          await saveReport({
            score: res.score,
            category: res.category,
            recommendation: res.recommendation,
            latitude: location?.latitude,
            longitude: location?.longitude,
            imageUrl: imageUrl,
          });

          await sendWhatsApp({
            score: res.score,
            category: res.category,
            recommendation: res.recommendation,
            imageUrl: imageUrl,
            latitude: location?.latitude,
            longitude: location?.longitude,
          });

          setIsAutoSent(true);
        } catch (err: any) {
          console.error("Auto send failed:", err);
          alert("Gagal mengirim notifikasi otomatis ke petugas.");
        } finally {
          setIsSending(false);
        }
      }
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menganalisis gambar: ${error.message || error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSend = async () => {
    if (!result) return;
    if (!phone.startsWith('62')) {
      alert("Nomor WhatsApp harus的酒dengan 62");
      return;
    }
    
    setIsSending(true);
    try {
      // Upload image to Cloudinary first
      let imageUrl = "";
      if (base64Image && mimeType) {
        try {
          const uploadRes = await uploadImage({ 
            imageBase64: base64Image, 
            mimeType: mimeType
          });
          imageUrl = uploadRes.url;
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
        }
      }

      await saveReport({
        score: result.score,
        category: result.category,
        recommendation: result.recommendation,
        latitude: location?.latitude,
        longitude: location?.longitude,
        imageUrl: imageUrl,
      });

      // @ts-ignore
      await sendWhatsApp({
        score: result.score,
        category: result.category,
        recommendation: result.recommendation,
        imageUrl: imageUrl,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      setSendSuccess(true);
    } catch (error: any) {
      console.error(error);
      alert(`Gagal mengirim: ${error.message || error}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="max-w-3xl w-full text-center space-y-3 mb-10">
        <div className="flex justify-center mb-2">
          <div className="bg-green-100 p-3 rounded-full text-green-600">
            <Leaf size={32} />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-800">UrbanClean AI</h1>
        <p className="text-lg text-slate-600">Analisis Kebersihan Jalan & Lingkungan</p>
        <div className="inline-block bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-full text-sm font-medium mt-4 shadow-sm">
          🌍 SDG 11: Monitoring kebersihan kota berbasis AI
        </div>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
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
                <p className="text-sm mt-2 text-slate-400">PNG, JPG format</p>
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

          {imagePreview && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Navigation size={16} className={locationStatus === 'loading' ? 'animate-spin text-blue-500' : locationStatus === 'found' ? 'text-green-500' : 'text-slate-400'} />
                {locationStatus === 'loading' && <span className="text-blue-600">Mendapatkan lokasi...</span>}
                {locationStatus === 'found' && location && (
                  <span className="text-green-600 truncate">
                    📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </span>
                )}
                {locationStatus === 'not-found' && <span className="text-amber-600">⚠️ Lokasi tidak tersedia</span>}
              </div>
            </div>
          )}
        </div>

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
                    <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</span>
                    <span className="font-semibold text-slate-800">
                      {result.score < 40 ? '🚨 Kritis' : '✅ Aman'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-900">
                  <span className="block text-xs font-semibold uppercase tracking-wider mb-2 text-blue-700">Rekomendasi AI</span>
                  <p className="text-sm leading-relaxed">{result.recommendation}</p>
                </div>

                {location && (
                  <a 
                    href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 hover:bg-green-100 transition-colors"
                  >
                    <MapPin size={16} />
                    <span className="text-sm">Buka di Google Maps</span>
                  </a>
                )}

                {isAutoSent && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    ✅ Notifikasi otomatis dikirim ke {location ? 'petugas + lokasi' : 'petugas'}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">3. Kirim Manual</h2>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Phone size={16} /> Nomor WhatsApp (Format: 628xxx)
              </label>
              <input
                type="text"
                placeholder="628123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              
              <button
                onClick={handleManualSend}
                disabled={!result || !phone || isSending || sendSuccess}
                className={`mt-2 w-full py-3.5 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 transition-all
                  ${!result ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 hover:bg-slate-900 text-white'}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSending ? (
                  <><Loader2 className="animate-spin" size={20} /> Mengirim...</>
                ) : sendSuccess ? (
                  <><CheckCircle size={20} className="text-green-400" /> Terkirim!</>
                ) : (
                  <><Send size={20} /> Kirim WhatsApp</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;