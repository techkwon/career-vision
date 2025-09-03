
export enum AppStatus {
  IDLE,
  PROCESSING,
  SUCCESS,
  ERROR,
}

export interface GenerationResult {
  image: string;
  title: string;
  description: string;
}
