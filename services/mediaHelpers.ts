export const getVideoResolution = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    // Ses dosyaları için varsayılan çözünürlük
    if (file.type.startsWith('audio/')) {
      resolve({ width: 1920, height: 1080 });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      // Metadata yüklendiğinde boyutları al
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      URL.revokeObjectURL(video.src);
      
      if (width && height) {
        resolve({ width, height });
      } else {
        // Fallback
        resolve({ width: 1920, height: 1080 });
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ width: 1920, height: 1080 }); // Hata durumunda varsayılan
    };

    video.src = URL.createObjectURL(file);
  });
};