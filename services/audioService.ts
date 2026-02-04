import { AudioSegment, ProcessingSettings } from '../types';
// @ts-ignore
import MP4Box from 'mp4box';

// Define WebCodecs API types locally
declare global {
  interface AudioData {
    format: string;
    timestamp: number;
    duration: number;
    numberOfChannels: number;
    sampleRate: number;
    allocationSize(options: { planeIndex: number }): number;
    copyTo(destination: BufferSource, options: { planeIndex: number }): void;
    close(): void;
  }

  class AudioDecoder {
    constructor(init: {
      output: (output: AudioData) => void;
      error: (error: any) => void;
    });
    readonly decodeQueueSize: number;
    state: "configured" | "closed" | "unconfigured";
    configure(config: {
      codec: string;
      sampleRate: number;
      numberOfChannels: number;
      description?: any;
    }): void;
    decode(chunk: EncodedAudioChunk): void;
    flush(): Promise<void>;
    close(): void;
    reset(): void;
    static isConfigSupported(config: any): Promise<{ supported: boolean }>;
  }

  class EncodedAudioChunk {
    constructor(init: {
      type: 'key' | 'delta';
      timestamp: number;
      duration: number;
      data: any;
    });
  }
}

// 200MB üzeri dosyalar için streaming dene
const LARGE_FILE_THRESHOLD = 200 * 1024 * 1024;

interface VolumePoint {
  time: number;
  maxVolume: number; // 0-1 arası genlik
}

export const extractAudioAndDetectSilence = async (
  file: File,
  settings: ProcessingSettings,
  onProgress: (msg: string) => void,
  onLoadProgress?: (percent: number) => void
): Promise<AudioSegment[]> => {
  
  // MP4Box sadece ISOBMFF (MP4, MOV, M4A) destekler. MKV desteklemez.
  // Dosya uzantısını ve tipini kontrol et.
  const isMp4Compatible = 
    file.name.match(/\.(mp4|mov|m4a|m4v)$/i) || 
    (file.type.includes('mp4') || file.type.includes('quicktime'));
  
  const isMkv = file.name.match(/\.mkv$/i);

  // Streaming Modu Şartları: Büyük dosya + MP4 uyumlu + WebCodecs desteği + MKV değil
  if (file.size > LARGE_FILE_THRESHOLD && isMp4Compatible && !isMkv && 'AudioDecoder' in window) {
    try {
      return await processLargeVideoFile(file, settings, onProgress, onLoadProgress);
    } catch (e) {
      console.warn("Streaming modunda hata oluştu:", e);
      
      // Eğer dosya 1GB'dan büyükse, fallback (klasik yöntem) muhtemelen tarayıcıyı çökertir.
      if (file.size > 1024 * 1024 * 1024) { 
        throw new Error(`Streaming işlemi başarısız oldu ve dosya klasik yöntem için çok büyük (Limit: 1GB). \nTeknik Hata: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      onProgress("Streaming başarısız, bellek tabanlı yöntem deneniyor (Bu işlem uzun sürebilir)...");
    }
  }

  // Güvenlik: Eğer dosya MKV ise ve çok büyükse (örn > 2GB), kullanıcıyı uyar.
  // Çünkü ArrayBuffer'a 2GB+ dosya yüklemek çoğu tarayıcıda limiti aşar.
  if (file.size > 2 * 1024 * 1024 * 1024) {
      throw new Error("Bu dosya boyutu (2GB+) tarayıcı belleği için çok büyük ve formatı streaming için uygun değil (Sadece MP4/MOV streaming destekler).");
  }

  // Küçük dosyalar veya fallback için klasik yöntem
  try {
    return await processSmallFile(file, settings, onProgress, onLoadProgress);
  } catch (e: any) {
    if (e.message === "Dosya okunamadı.") {
       // FileReader hatasını daha anlaşılır hale getir
       throw new Error("Dosya belleğe alınırken hata oluştu. Dosya bozuk olabilir veya tarayıcı belleği yetersiz geldi.");
    }
    throw e;
  }
};

// --- YÖNTEM 1: KLASİK (Belleğe Yüklemeli) ---
const processSmallFile = async (
  file: File,
  settings: ProcessingSettings,
  onProgress: (msg: string) => void,
  onLoadProgress?: (percent: number) => void
): Promise<AudioSegment[]> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  onProgress("Dosya belleğe yükleniyor...");
  const arrayBuffer = await readFileAsArrayBuffer(file, (percent) => {
    if (onLoadProgress) onLoadProgress(percent);
  });
  
  onProgress("Ses çözümleniyor...");
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    onProgress("Analiz ediliyor...");
    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    const timeline = createVolumeTimeline(rawData, sampleRate, 0.05);
    const segments = analyzeVolumeTimeline(timeline, settings);
    
    audioContext.close();
    return segments;
  } catch (e) {
    audioContext.close();
    throw new Error("Ses dosyası çözümlenemedi (Decode Error). Format desteklenmiyor olabilir.");
  }
};

// --- YÖNTEM 2: STREAMING (Büyük Dosyalar İçin) ---
const processLargeVideoFile = async (
  file: File,
  settings: ProcessingSettings,
  onProgress: (msg: string) => void,
  onLoadProgress?: (percent: number) => void
): Promise<AudioSegment[]> => {
  return new Promise(async (resolve, reject) => {
    onProgress("Büyük dosya modu başlatılıyor...");
    
    const mp4boxfile = MP4Box.createFile();
    let audioTrack: any = null;
    let decoder: AudioDecoder | null = null;
    
    const timeline: VolumePoint[] = [];
    let samplesProcessed = 0;
    let totalSamples = 0;
    
    mp4boxfile.onError = (e: any) => {
      console.error("MP4Box Error:", e);
      reject(new Error("MP4 ayrıştırma hatası: Dosya yapısı bozuk veya desteklenmiyor."));
    };

    mp4boxfile.onReady = async (info: any) => {
      audioTrack = info.audioTracks[0];
      if (!audioTrack) {
        reject(new Error("Video dosyasında ses izi bulunamadı."));
        return;
      }
      
      totalSamples = audioTrack.nb_samples;
      onProgress(`Ses izi bulundu: ${audioTrack.codec}. Kod çözme başlıyor...`);

      decoder = new AudioDecoder({
        output: (audioData) => {
          const size = audioData.allocationSize({ planeIndex: 0 });
          const buffer = new ArrayBuffer(size);
          audioData.copyTo(buffer, { planeIndex: 0 });
          
          const float32 = new Float32Array(buffer);
          const rms = calculateRMS(float32);
          
          const time = audioData.timestamp / 1e6;
          timeline.push({ time, maxVolume: rms });
          
          audioData.close();
        },
        error: (e) => {
          console.error("Decoder error", e);
          reject(e);
        }
      });

      const config = {
        codec: audioTrack.codec,
        sampleRate: audioTrack.audio.sample_rate,
        numberOfChannels: audioTrack.audio.channel_count,
        description: getDescription(audioTrack)
      };

      try {
        const support = await AudioDecoder.isConfigSupported(config);
        if (!support.supported) {
             console.warn("Codec config might not be supported:", config);
        }
        decoder.configure(config);
        
        // MP4Box extraction options
        mp4boxfile.setExtractionOptions(audioTrack.id, null, { nbSamples: 100 });
        mp4boxfile.start();
      } catch (e) {
        reject(new Error("Ses kodeği tarayıcı tarafından desteklenmiyor: " + audioTrack.codec));
      }
    };

    mp4boxfile.onSamples = (id: number, user: any, samples: any[]) => {
      if (!decoder) return;
      
      for (const sample of samples) {
        const type = sample.is_sync ? "key" : "delta";
        
        const chunk = new EncodedAudioChunk({
          type: type,
          timestamp: sample.cts,
          duration: sample.duration,
          data: sample.data
        });
        
        try {
            decoder.decode(chunk);
        } catch(e) {
            console.error("Decode error on chunk", e);
        }
        samplesProcessed++;
      }

      mp4boxfile.releaseUsedSamples(audioTrack.id, samplesProcessed);

      if (onLoadProgress && totalSamples > 0) {
         onLoadProgress((samplesProcessed / totalSamples) * 100);
      }
      
      if (samplesProcessed % 200 === 0) {
        onProgress(`İşleniyor: %${Math.round((samplesProcessed / totalSamples) * 100)}`);
      }
    };

    // --- AKILLI DOSYA OKUMA DÖNGÜSÜ ---
    try {
      const reader = file.stream().getReader();
      let offset = 0;
      let lastYieldTime = Date.now();
      const MAX_QUEUE_SIZE = 100; 

      while (true) {
        // 1. Backpressure: Decoder şiştiyse bekle
        if (decoder && decoder.decodeQueueSize >= MAX_QUEUE_SIZE) {
          await new Promise(r => setTimeout(r, 20));
          continue;
        }

        // 2. UI Nefes Alma
        if (Date.now() - lastYieldTime > 50) {
           await new Promise(r => setTimeout(r, 0));
           lastYieldTime = Date.now();
        }

        // 3. Dosyadan Oku
        const { done, value } = await reader.read();
        
        if (done) {
          mp4boxfile.flush();
          break;
        }
        
        // 4. MP4Box'a Besle
        // FIX: DataView constructor error. MP4Box expects ArrayBuffer, not Uint8Array.
        // Copy the chunk to a new ArrayBuffer to ensure clean data passage.
        const chunkBuffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);

        // @ts-ignore
        chunkBuffer.fileStart = offset;
        mp4boxfile.appendBuffer(chunkBuffer);
        
        // Metadata (moov atom) ararken kullanıcıya bilgi ver
        if (!audioTrack && offset % (50 * 1024 * 1024) === 0) {
             const percent = (offset / file.size) * 100;
             onProgress(`Dosya yapısı taranıyor (%${Math.round(percent)})...`);
        }

        offset += value.length;
      }
      
      // Flush Decoder
      if (decoder) {
        await decoder.flush();
        decoder.close();
      } else {
        // Eğer döngü bitti ama decoder hiç oluşmadıysa (onReady çalışmadı)
        throw new Error("Dosya işlendi ama ses parçası başlatılamadı (moov atom bulunamadı veya geçersiz).");
      }

      onProgress("Ses haritası oluşturuluyor...");
      
      if (timeline.length === 0) {
        throw new Error("Ses verisi çıkartılamadı (Sessiz dosya veya decoder çıktısı boş).");
      }

      const segments = analyzeVolumeTimeline(timeline, settings);
      resolve(segments);

    } catch (err) {
      reject(err);
    }
  });
};

const getDescription = (track: any) => {
  const avcC = track.mdia?.minf?.stbl?.stsd?.entries[0]?.avcC;
  return undefined; 
};

const readFileAsArrayBuffer = (
  file: File, 
  onProgress?: (percent: number) => void
): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress((event.loaded / event.total) * 100);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

const calculateRMS = (data: Float32Array) => {
  let sum = 0;
  const step = 4; 
  for (let i = 0; i < data.length; i += step) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / (data.length / step));
};

const createVolumeTimeline = (
  data: Float32Array, 
  sampleRate: number, 
  resolutionSeconds: number
): VolumePoint[] => {
  const timeline: VolumePoint[] = [];
  const samplesPerPoint = Math.floor(sampleRate * resolutionSeconds);
  
  for (let i = 0; i < data.length; i += samplesPerPoint) {
    const chunk = data.slice(i, i + samplesPerPoint);
    const rms = calculateRMS(chunk);
    timeline.push({
      time: i / sampleRate,
      maxVolume: rms
    });
  }
  return timeline;
};

const analyzeVolumeTimeline = (
  timeline: VolumePoint[],
  settings: ProcessingSettings
): AudioSegment[] => {
  const { thresholdDb, minSilenceDuration, padding } = settings;
  const thresholdAmp = Math.pow(10, thresholdDb / 20); 
  
  const keepSegments: AudioSegment[] = [];
  
  let currentSegment: { start: number, end: number } | null = null;
  let silenceStartTime: number | null = null;

  for (let i = 0; i < timeline.length; i++) {
    const point = timeline[i];
    const isLoud = point.maxVolume > thresholdAmp;

    if (isLoud) {
      silenceStartTime = null; 
      
      if (!currentSegment) {
        currentSegment = { start: Math.max(0, point.time - padding), end: point.time };
      } else {
        currentSegment.end = point.time;
      }
    } else {
      if (silenceStartTime === null) {
        silenceStartTime = point.time;
      }

      const currentSilenceDuration = point.time - silenceStartTime;
      
      if (currentSegment && currentSilenceDuration > minSilenceDuration) {
        currentSegment.end = Math.min(timeline[timeline.length-1].time, silenceStartTime + padding);
        
        keepSegments.push({
          start: currentSegment.start,
          end: currentSegment.end,
          duration: currentSegment.end - currentSegment.start
        });
        currentSegment = null;
      }
    }
  }

  if (currentSegment) {
    currentSegment.end = timeline[timeline.length - 1].time; 
    keepSegments.push({
      start: currentSegment.start,
      end: currentSegment.end,
      duration: currentSegment.end - currentSegment.start
    });
  }

  // Merge Overlaps
  const mergedSegments: AudioSegment[] = [];
  if (keepSegments.length > 0) {
    let current = keepSegments[0];
    for (let i = 1; i < keepSegments.length; i++) {
      const next = keepSegments[i];
      if (current.end >= next.start) {
        current.end = Math.max(current.end, next.end);
        current.duration = current.end - current.start;
      } else {
        mergedSegments.push(current);
        current = next;
      }
    }
    mergedSegments.push(current);
  }

  return mergedSegments;
};