import React, { useRef, useState } from 'react';
import { Upload, FileVideo } from 'lucide-react';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        onFileSelected(file);
      } else {
        alert("Lütfen bir video veya ses dosyası yükleyin.");
      }
    }
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed border-gray-600 bg-gray-800/50' : 
          isDragging ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-600 hover:border-cyan-500 hover:bg-slate-800'}
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept="video/*,audio/*"
        className="hidden"
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center space-y-4 text-center p-6">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-gray-400'}`}>
          {isDragging ? <FileVideo size={32} /> : <Upload size={32} />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {isDragging ? 'Videoyu buraya bırakın' : 'Yüklemek için tıklayın veya sürükleyin'}
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            MP4, MOV, MKV desteklenir. <br/>
            <span className="text-xs text-yellow-500/80 mt-1 block">Not: Büyük dosyalar tamamen tarayıcınızda, yerel olarak işlenir.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DropZone;
