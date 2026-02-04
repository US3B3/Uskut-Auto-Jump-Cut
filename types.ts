export interface AudioSegment {
  start: number; // seconds
  end: number;   // seconds
  duration: number; // seconds
}

export interface ProcessingSettings {
  thresholdDb: number;
  minSilenceDuration: number; // seconds
  padding: number; // seconds
}

export interface VideoResolution {
  width: number;
  height: number;
  label?: string;
}

export enum ProcessingStatus {
  IDLE,
  EXTRACTING_AUDIO,
  ANALYZING,
  COMPLETED,
  ERROR
}

export interface AnalysisResult {
  segments: AudioSegment[]; // The "Keep" segments
  originalDuration: number;
  newDuration: number;
  cutCount: number;
  resolution: VideoResolution;
}