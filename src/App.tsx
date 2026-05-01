import { useState, useRef, useEffect, useCallback } from 'react';
import { useAction, useMutation } from 'convex/react';
// @ts-ignore
import { api } from '../convex/_generated/api';
import { UploadCloud, CheckCircle, AlertTriangle, Send, Phone, Leaf, Loader2, MapPin, Navigation, Camera, X } from 'lucide-react';

interface AnalysisResult {
  score: number;
  category: string;
  recommendation: string;
  isEnvironment?: boolean;
  reason?: string;
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
  } catch {
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
  
  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const openCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      setCameraStream(stream);
      setShowCamera(true);
      setCapturedImage(null);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Izin kamera ditolak. Harap aktifkan izin kamera di pengaturan browser.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.');
      } else {
        setCameraError(`Gagal mengakses kamera: ${err.message}`);
      }
    }
  };

  const closeCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setCapturedImage(null);
  }, [cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmPhoto = async () => {
    if (!capturedImage) return;
    
    setImagePreview(capturedImage);
    const base64 = capturedImage.split(',')[1];
    setBase64Image(base64);
    setMimeType('image/jpeg');
    
    // Reset state
    setResult(null);
    setSendSuccess(false);
    setIsAutoSent(false);
    setLocationStatus('loading');
    
    // Try to get location (no EXIF from canvas, so use browser GPS)
    const browserLocation = await getBrowserLocation();
    if (browserLocation) {
      setLocation(browserLocation);
      setLocationStatus('found');
    } else {
      setLocationStatus('not-found');
    }
    
    closeCamera();
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode }
      });
      setCameraStream(stream);
    } catch (err: any) {
      console.error("Switch camera error:", err);
      setCameraError(`Gagal切换 kamera: ${err.message}`);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Connect video to stream
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

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

  const scoreColor = result
    ? result.score >= 70 ? '#34d399' : result.score >= 40 ? '#fbbf24' : '#f87171'
    : '#34d399';

  const scoreGlow = result
    ? result.score >= 70
      ? '0 0 40px rgba(52,211,153,0.55)'
      : result.score >= 40
        ? '0 0 40px rgba(251,191,36,0.55)'
        : '0 0 40px rgba(248,113,113,0.55)'
    : 'none';

  return (
    <div style={{ minHeight: '100vh', background: '#030a06', position: 'relative', overflowX: 'hidden' }}>

      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb" style={{
          top: '-15%', left: '-10%',
          width: '55vw', height: '55vw',
          background: 'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 65%)',
          animationDelay: '0s',
        }} />
        <div className="orb" style={{
          bottom: '-20%', right: '-10%',
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(5,150,105,0.09) 0%, transparent 65%)',
          animationDelay: '-7s',
        }} />
        <div className="orb" style={{
          top: '45%', left: '35%',
          width: '35vw', height: '35vw',
          background: 'radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 70%)',
          animationDelay: '-13s',
        }} />
      </div>

      {/* Noise texture overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
        opacity: 0.4,
      }} />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, paddingTop: '80px', paddingBottom: '56px', textAlign: 'center', padding: '80px 24px 56px' }}>

        {/* Icon mark */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '54px', height: '54px', borderRadius: '16px', marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(5,150,105,0.6) 0%, rgba(16,185,129,0.4) 100%)',
          border: '1px solid rgba(52,211,153,0.3)',
          boxShadow: '0 0 32px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}>
          <Leaf size={22} style={{ color: '#6ee7b7' }} />
        </div>

        {/* SDG pill */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '999px',
            fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#6ee7b7',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            SDG 11 — Kota Berkelanjutan
          </span>
        </div>

        {/* Headline */}
        <h1 className="gradient-text" style={{
          fontSize: 'clamp(2.8rem, 7vw, 5.2rem)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.02,
          marginBottom: '16px',
        }}>
          UrbanClean AI
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.38)',
          fontSize: '16px',
          fontWeight: 300,
          maxWidth: '380px',
          margin: '0 auto',
          lineHeight: 1.65,
        }}>
          Analisis kebersihan jalan &amp; lingkungan dengan kecerdasan buatan
        </p>
      </header>

      {/* Cards grid */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: '900px', margin: '0 auto', padding: '0 16px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>

          {/* ── Upload card ── */}
          <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
              <span className="step-badge">1</span>
              <h2 style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Unggah Gambar
              </h2>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button 
                  onClick={openCamera}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '8px',
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                    color: '#6ee7b7', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <Camera size={14} />
                  Kamera
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <UploadCloud size={14} />
                  File
                </button>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={`upload-zone${imagePreview ? ' active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '216px', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ padding: '52px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <UploadCloud size={19} style={{ color: 'rgba(255,255,255,0.28)' }} />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                    Klik untuk unggah gambar
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '11px' }}>PNG · JPG</p>
                  <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px', marginTop: '8px', textAlign: 'center' }}>Foto jalan/trotoar/lingkungan outdoor</p>
                </div>
              )}
              <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleImageChange} />
            </div>

            {/* Location row */}
            {imagePreview && locationStatus !== 'idle' && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {locationStatus === 'loading' && (
                  <>
                    <Loader2 size={11} className="animate-spin" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Mendeteksi lokasi...</span>
                  </>
                )}
                {locationStatus === 'found' && location && (
                  <>
                    <MapPin size={11} style={{ color: '#34d399', flexShrink: 0 }} />
                    <span style={{ color: '#6ee7b7', fontSize: '11px' }}>
                      {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                    </span>
                  </>
                )}
                {locationStatus === 'not-found' && (
                  <>
                    <Navigation size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />
                    <span style={{ color: '#fbbf24', fontSize: '11px' }}>Lokasi tidak tersedia</span>
                  </>
                )}
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!imagePreview || isAnalyzing}
              className={`btn-glow${(!imagePreview || isAnalyzing) ? '' : ''}`}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                cursor: (!imagePreview || isAnalyzing) ? 'not-allowed' : 'pointer',
                opacity: (!imagePreview || isAnalyzing) ? 0.38 : 1,
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '-0.01em',
              }}
            >
              {isAnalyzing
                ? <><Loader2 className="animate-spin" size={15} /> Menganalisis...</>
                : <><CheckCircle size={15} /> Analisis Kebersihan</>
              }
            </button>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Result card ── */}
            <div className="glass-card" style={{ padding: '28px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
                <span className="step-badge">2</span>
                <h2 style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Hasil Analisis
                </h2>
              </div>

              {!result ? (
                <div style={{ padding: '44px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '14px',
                  }}>
                    <AlertTriangle size={19} style={{ color: 'rgba(255,255,255,0.14)' }} />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '13px', textAlign: 'center', lineHeight: 1.65 }}>
                    Unggah gambar lalu klik<br />tombol analisis untuk memulai
                  </p>
                </div>
              ) : result.isEnvironment === false ? (
                /* Bukan Lingkungan - Show error state */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
                  {/* Badge */}
                  <span style={{
                    padding: '8px 16px', borderRadius: '999px',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(100,100,100,0.2)',
                    border: '1px solid rgba(150,150,150,0.3)',
                  }}>
                    Bukan Lingkungan
                  </span>
                  
                  {/* Icon */}
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'rgba(100,100,100,0.1)',
                    border: '1px solid rgba(150,150,150,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertTriangle size={28} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                  
                  {/* Reason */}
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.65 }}>
                    {result.reason || 'Gambar yang diupload bukan jalan atau lingkungan outdoor.'}
                  </p>
                  
                  {/* Suggestion */}
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', lineHeight: 1.5 }}>
                    Silakan upload foto jalan, trotoar, taman, atau lingkungan outdoor lainnya untuk analisis.
                  </p>
                </div>
              ) : (
                /* Normal Environment - Show analysis results */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* Score */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
                        Skor Kebersihan
                      </p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{
                          fontSize: '4.2rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
                          color: scoreColor,
                          textShadow: scoreGlow,
                        }}>
                          {result.score}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '15px', fontWeight: 300, marginBottom: '6px' }}>/100</span>
                      </div>
                    </div>
                    <span style={{
                      padding: '5px 12px', borderRadius: '999px',
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                      color: scoreColor,
                      background: `${scoreColor}18`,
                      border: `1px solid ${scoreColor}35`,
                    }}>
                      {result.score < 40 ? 'Kritis' : result.score >= 70 ? 'Bersih' : 'Sedang'}
                    </span>
                  </div>

                  {/* Glowing bar */}
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '999px',
                      width: `${result.score}%`,
                      background: result.score >= 70
                        ? 'linear-gradient(90deg, #059669, #34d399)'
                        : result.score >= 40
                          ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                          : 'linear-gradient(90deg, #dc2626, #f87171)',
                      boxShadow: `0 0 10px ${scoreColor}90`,
                      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>

                  {/* Category */}
                  <div style={{
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '5px' }}>
                      Kategori
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {result.category}
                    </p>
                  </div>

                  {/* Recommendation */}
                  <div style={{
                    padding: '14px 16px',
                    background: 'rgba(16,185,129,0.07)',
                    borderRadius: '14px',
                    border: '1px solid rgba(16,185,129,0.18)',
                  }}>
                    <p style={{ color: '#6ee7b7', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                      Rekomendasi
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.65 }}>
                      {result.recommendation}
                    </p>
                  </div>

                  {location && (
                    <a
                      href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.28)', fontSize: '12px', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}
                    >
                      <MapPin size={11} />
                      <span>Lihat di Google Maps</span>
                    </a>
                  )}

                  {isAutoSent && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(52,211,153,0.08)',
                      border: '1px solid rgba(52,211,153,0.2)',
                    }}>
                      <CheckCircle size={13} style={{ color: '#34d399', flexShrink: 0 }} />
                      <span style={{ color: '#6ee7b7', fontSize: '12px' }}>Notifikasi otomatis terkirim ke petugas</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Send card ── */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span className="step-badge">3</span>
                <h2 style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Kirim Manual
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Phone size={13} style={{
                    position: 'absolute', left: '13px', top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.25)',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="text"
                    placeholder="628123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="dark-input"
                  />
                </div>

                <button
                  onClick={handleManualSend}
                  disabled={!result || !phone || isSending || sendSuccess}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '13px',
                    border: sendSuccess ? '1px solid rgba(52,211,153,0.3)' : 'none',
                    cursor: (!result || !phone || isSending || sendSuccess) ? 'not-allowed' : 'pointer',
                    opacity: (!result || !phone) ? 0.38 : 1,
                    background: sendSuccess
                      ? 'rgba(52,211,153,0.1)'
                      : (!result || !phone)
                        ? 'rgba(255,255,255,0.05)'
                        : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    boxShadow: (!result || !phone || sendSuccess) ? 'none' : '0 0 20px rgba(16,185,129,0.3)',
                    color: sendSuccess ? '#6ee7b7' : (!result || !phone) ? 'rgba(255,255,255,0.25)' : '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'opacity 0.2s, box-shadow 0.2s',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {isSending
                    ? <><Loader2 className="animate-spin" size={14} /> Mengirim...</>
                    : sendSuccess
                      ? <><CheckCircle size={14} /> Terkirim</>
                      : <><Send size={14} /> Kirim via WhatsApp</>
                  }
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-modal-overlay">
          <div className="camera-modal-content">
            {/* Header */}
            <div className="camera-header">
              <button onClick={closeCamera} className="camera-close-btn">
                <X size={20} />
              </button>
              <span className="camera-title">Ambil Foto</span>
              <button onClick={switchCamera} className="camera-switch-btn">
                <Camera size={20} />
              </button>
            </div>

            {/* Video Preview or Captured Image */}
            <div className="camera-viewport">
              {cameraError ? (
                <div className="camera-error">
                  <AlertTriangle size={32} style={{ color: '#f87171', marginBottom: 12 }} />
                  <p>{cameraError}</p>
                  <button onClick={openCamera} className="camera-retry-btn">
                    Coba Lagi
                  </button>
                </div>
              ) : capturedImage ? (
                <img src={capturedImage} alt="Captured" className="captured-preview" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              )}
              <canvas ref={canvasRef} className="hidden-canvas" />
            </div>

            {/* Controls */}
            <div className="camera-controls">
              {capturedImage ? (
                <>
                  <button onClick={retakePhoto} className="camera-retake-btn">
                    <span style={{ marginRight: 6 }}>↻</span> Ulang
                  </button>
                  <button onClick={confirmPhoto} className="camera-confirm-btn">
                    <CheckCircle size={18} style={{ marginRight: 6 }} />
                    Pakai Foto
                  </button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }} />
                  <button onClick={capturePhoto} className="camera-capture-btn">
                    <div className="capture-inner" />
                  </button>
                  <div style={{ flex: 1 }} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;