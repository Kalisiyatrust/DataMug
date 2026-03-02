export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image?: string;   // base64 data URL — legacy single-image field, kept for backward compat
  images?: string[]; // base64 data URLs — multi-image support (up to 4)
  timestamp: number;
}

export interface AnalysisPreset {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  description?: string;
}

export interface OllamaModel {
  id: string;
  name: string;
  size?: number;
  modified_at?: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface ModelCapability {
  vision: boolean;
  label: string;
  description: string;
  sizeTag: string;
}

export interface VisionRequest {
  messages: Message[];
  model?: string;
  image?: string;    // legacy single-image — kept for backward compat
  images?: string[]; // multi-image array; takes precedence over `image` when present
}

export interface StreamChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string | null;
  }>;
}

/**
 * Exported thread format for import/export.
 */
export interface ExportedThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  model?: string;
  pinned?: boolean;
}

export interface ExportData {
  version: number;
  exportedAt: number;
  app: "DataMug";
  threads: ExportedThread[];
}
