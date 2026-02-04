import React, { useState } from 'react';
import { Sliders, Scissors, Download, AlertCircle, PlayCircle } from 'lucide-react';
import DropZone from './components/DropZone';
import { extractAudioAndDetectSilence } from './services/audioService';
import { generateFcpXml } from './services/xmlService';
import { ProcessingStatus, AnalysisResult } from './types';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  // Ayarlar
  const [thresholdDb, setThresholdDb] = useState<number>(-30);
  const [minSilenceDuration, setMinSilenceDuration] = useState<number>(0.5);
  const [padding, setPadding] = useState<number>(0.1);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setStatus(ProcessingStatus.IDLE);
    setResult(null);
  };

  const handleProcess = async () => {
    if (!file) return;

    try {
      setStatus(ProcessingStatus.EXTRACTING_AUDIO);
      
      const segments = await extractAudioAndDetectSilence(
        file,
        { thresholdDb, minSilenceDuration, padding },
        (msg) => setProgressMsg(msg)
      );

      const newDuration = segments.reduce((acc, seg) => acc + seg.duration, 0);

      setResult({
        segments,
        originalDuration: 0,
        newDuration,
        cutCount: segments.length
      });
      
      setStatus(ProcessingStatus.COMPLETED);
    } catch (error) {
      console.error(error);
      setStatus(ProcessingStatus.ERROR);
      setProgressMsg("Dosya işlenirken hata oluştu. Dosya formatı tarayıcı tarafından desteklenmiyor olabilir.");
    }
  };

  const handleDownloadXml = () => {
    if (!result || !file) return;
    
    const xmlContent = generateFcpXml(file.name, result.segments);
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.split('.')[0]}_edited.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Başlık */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-cyan-500/10 rounded-2xl mb-2">
            <Scissors className="text-cyan-400 w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Uskut
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Videolarınızdaki sessiz bölümleri otomatik olarak tespit edin ve çıkarın. 
            Premiere Pro için hazır XML çıktısı alın.
          </p>
        </header>

        {/* Ana Arayüz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Sol Kolon: Ayarlar */}
          <div className="md:col-span-1 space-y-6 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 h-fit">
             <div className="flex items-center gap-2 text-xl font-semibold text-white mb-2">
               <Sliders size={20} className="text-cyan-400" />
               Ayarlar
             </div>
             
             {/* Threshold */}
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <label className="text-slate-300">Sessizlik Eşiği</label>
                 <span className="font-mono text-cyan-400">{thresholdDb} dB</span>
               </div>
               <input
                 type="range"
                 min="-60"
                 max="0"
                 step="1"
                 value={thresholdDb}
                 onChange={(e) => setThresholdDb(Number(e.target.value))}
                 className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
               />
               <p className="text-xs text-slate-500">Bu seviyenin altındaki sesler sessizlik olarak kabul edilir.</p>
             </div>

             {/* Min Duration */}
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <label className="text-slate-300">Min. Sessizlik Süresi</label>
                 <span className="font-mono text-cyan-400">{minSilenceDuration}s</span>
               </div>
               <input
                 type="range"
                 min="0.1"
                 max="2.0"
                 step="0.1"
                 value={minSilenceDuration}
                 onChange={(e) => setMinSilenceDuration(Number(e.target.value))}
                 className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
               />
             </div>

             {/* Padding */}
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <label className="text-slate-300">Pay (Padding)</label>
                 <span className="font-mono text-cyan-400">{padding}s</span>
               </div>
               <input
                 type="range"
                 min="0"
                 max="0.5"
                 step="0.05"
                 value={padding}
                 onChange={(e) => setPadding(Number(e.target.value))}
                 className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
               />
               <p className="text-xs text-slate-500">Kesilen kliplerin başına ve sonuna güvenlik payı ekler.</p>
             </div>
          </div>

          {/* Sağ Kolon: Yükleme ve İşlem */}
          <div className="md:col-span-2 space-y-6">
            <DropZone onFileSelected={handleFileSelect} disabled={status === ProcessingStatus.ANALYZING} />
            
            {file && (
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <PlayCircle size={24} />
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-white truncate">{file.name}</p>
                    <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                {status === ProcessingStatus.IDLE && (
                  <button 
                    onClick={handleProcess}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-900/20 transition-all transform active:scale-95"
                  >
                    Analiz Et
                  </button>
                )}
              </div>
            )}

            {/* Durum Mesajları */}
            {status !== ProcessingStatus.IDLE && status !== ProcessingStatus.COMPLETED && (
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-center animate-pulse">
                <div className="text-cyan-400 mb-2">İşleniyor...</div>
                <div className="text-slate-300 text-sm">{progressMsg}</div>
              </div>
            )}
            
            {status === ProcessingStatus.ERROR && (
               <div className="bg-red-900/20 p-6 rounded-xl border border-red-800 flex items-center gap-3 text-red-200">
                 <AlertCircle className="flex-shrink-0" />
                 <p>{progressMsg}</p>
               </div>
            )}

            {/* Sonuçlar */}
            {status === ProcessingStatus.COMPLETED && result && (
              <div className="bg-gradient-to-b from-green-900/20 to-slate-800/50 p-6 rounded-xl border border-green-800/30 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    Analiz Tamamlandı
                  </h3>
                  <div className="text-sm text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700">
                    {result.cutCount} klip bulundu
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Yeni Süre</div>
                    <div className="text-2xl font-mono text-green-400">{result.newDuration.toFixed(1)}s</div>
                  </div>
                   <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Tahmini Kazanç</div>
                    <div className="text-2xl font-mono text-white">
                      {(result.segments[result.segments.length-1].end - result.newDuration).toFixed(1)}s
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-900/10 border border-yellow-800/30 rounded-lg text-sm text-yellow-200/80">
                  <strong>Önemli:</strong> XML dosyasını Premiere Pro'ya aktardığınızda, tarayıcı güvenlik kısıtlamaları nedeniyle medya dosyasını manuel olarak yeniden bağlamanız (re-link media) gerekecektir.
                </div>

                <button 
                  onClick={handleDownloadXml}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1"
                >
                  <Download size={24} />
                  Premiere Pro XML İndir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;