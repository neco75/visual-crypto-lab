export interface ProcessedShare {
  id: number;
  data: ImageData;
  color: string; // Hex code for border/identifying
}

export interface CryptoSettings {
  shareCount: number;
  isColor: boolean;
  resolutionMultiplier: number; // 1 or 2 (2x2 expansion)
}

export enum ProcessingStatus {
  IDLE,
  PROCESSING,
  COMPLETE,
  ERROR
}