import { AudioSegment, ProcessingSettings } from '../types';

export const extractAudioAndDetectSilence = async (
  file: File,
  settings: ProcessingSettings,
  onProgress: (msg: string) => void
): Promise<AudioSegment[]> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  onProgress("Dosya belleğe yükleniyor...");
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress("Ses verisi çözümleniyor (bu işlem dosya boyutuna göre sürebilir)...");
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  onProgress("Ses genliği analiz ediliyor...");
  const rawData = audioBuffer.getChannelData(0); // Analiz için ilk kanalı kullan
  const sampleRate = audioBuffer.sampleRate;
  
  const segments = detectNonSilentSegments(rawData, sampleRate, settings);
  
  // Temizlik
  audioContext.close();
  
  return segments;
};

const detectNonSilentSegments = (
  data: Float32Array,
  sampleRate: number,
  settings: ProcessingSettings
): AudioSegment[] => {
  const { thresholdDb, minSilenceDuration, padding } = settings;
  const threshold = Math.pow(10, thresholdDb / 20); // dB'yi genliğe çevir
  const minSilenceSamples = minSilenceDuration * sampleRate;
  
  const keepSegments: AudioSegment[] = [];
  
  // RMS hesaplaması için pencere boyutu (1024 sample)
  const windowSize = 1024;
  
  const ranges: {start: number, end: number, type: 'sound' | 'silence'}[] = [];
  let currentRangeStart = 0;
  let currentType: 'sound' | 'silence' = 'silence'; // İlk başta sessizlik varsayalım
  
  for (let i = 0; i < data.length; i += windowSize) {
    let sum = 0;
    const end = Math.min(i + windowSize, data.length);
    for (let j = i; j < end; j++) {
      sum += data[j] * data[j];
    }
    const rms = Math.sqrt(sum / (end - i));
    
    const isSound = rms > threshold;
    
    if (isSound && currentType === 'silence') {
      // Sese geçiş
      ranges.push({ start: currentRangeStart, end: i, type: 'silence' });
      currentRangeStart = i;
      currentType = 'sound';
    } else if (!isSound && currentType === 'sound') {
      // Sessizliğe geçiş
      ranges.push({ start: currentRangeStart, end: i, type: 'sound' });
      currentRangeStart = i;
      currentType = 'silence';
    }
  }
  // Son aralığı ekle
  ranges.push({ start: currentRangeStart, end: data.length, type: currentType });

  // 2. Çok kısa sessizlikleri filtrele (onları ses olarak kabul et)
  const consolidatedRanges: {start: number, end: number, type: 'sound' | 'silence'}[] = [];
  
  for (const r of ranges) {
    const durationSamples = r.end - r.start;
    
    if (r.type === 'silence' && durationSamples < minSilenceSamples) {
      // Sessizlik çok kısa, sese çevir
      r.type = 'sound';
    }
    
    // Öncekiyle birleştir
    if (consolidatedRanges.length > 0 && consolidatedRanges[consolidatedRanges.length - 1].type === r.type) {
      consolidatedRanges[consolidatedRanges.length - 1].end = r.end;
    } else {
      consolidatedRanges.push(r);
    }
  }

  // 3. Zaman Segmentlerine Dönüştür ve Padding Ekle
  const finalKeepSegments: AudioSegment[] = [];
  
  for (const r of consolidatedRanges) {
    if (r.type === 'sound') {
      // Padding uygula
      let startSample = Math.max(0, r.start - (padding * sampleRate));
      let endSample = Math.min(data.length, r.end + (padding * sampleRate));
      
      const startTime = startSample / sampleRate;
      const endTime = endSample / sampleRate;
      
      // Padding yüzünden oluşan çakışmaları birleştir
      if (finalKeepSegments.length > 0) {
        const last = finalKeepSegments[finalKeepSegments.length - 1];
        if (startTime <= last.end) {
          last.end = Math.max(last.end, endTime);
          last.duration = last.end - last.start;
          continue;
        }
      }
      
      finalKeepSegments.push({
        start: startTime,
        end: endTime,
        duration: endTime - startTime
      });
    }
  }

  return finalKeepSegments;
};
