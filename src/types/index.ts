export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image?: string; // base64 data URL
  timestamp: number;
}

export interface AnalysisPreset {
  id: string;
  label: string;
  prompt: string;
  icon: string;
}

export interface OllamaModel {
  id: string;
  name: string;
  size?: number;
  modified_at?: string;
}

export interface VisionRequest {
  messages: Message[];
  model?: string;
  image?: string; // base64 string (without data URL prefix)
}

export interface StreamChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string | null;
  }>;
}
