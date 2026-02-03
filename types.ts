
export enum AudienceType {
  KINDERGARTEN = 'kindergarten',
  PRIMARY_SCHOOL = 'primary_school',
  MIDDLE_SCHOOL = 'middle_school',
  ADULT = 'adult',
  SENIOR = 'senior'
}

export interface ComicPanel {
  imageUrl: string;
  description: string;
}

export interface VisualBible {
  styleDescription: string;
  characterDescription: string;
  colorPalette: string;
}

export interface IdiomContent {
  idiom: string;
  explanation: string;
  origin: string;
  story: string;
  panels: ComicPanel[];
  visualBible: VisualBible;
  audioBase64?: string;
  videoUrl?: string;
  videoPrompt?: string;
}

export interface GenerationState {
  loading: boolean;
  step: string;
  progress: number;
  error: string | null;
  videoGenerating: boolean;
}
