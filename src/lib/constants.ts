import type { AnalysisPreset, ModelCapability } from "@/types";

export const ANALYSIS_PRESETS: AnalysisPreset[] = [
  {
    id: "describe",
    label: "Describe",
    prompt: "Describe this image in detail. What do you see?",
    icon: "eye",
    description: "Get a detailed description of the image",
  },
  {
    id: "ocr",
    label: "Read Text",
    prompt:
      "Extract and transcribe all text visible in this image. Preserve the layout and formatting as much as possible.",
    icon: "file-text",
    description: "Extract text from screenshots, documents, photos",
  },
  {
    id: "objects",
    label: "Detect Objects",
    prompt:
      "Identify and list all distinct objects visible in this image. For each object, describe its position and any notable characteristics.",
    icon: "scan",
    description: "Find and list all objects in the image",
  },
  {
    id: "document",
    label: "Analyze Document",
    prompt:
      "Analyze this document image. Extract the key information, summarize the content, and identify the document type (invoice, receipt, letter, form, etc.).",
    icon: "file-search",
    description: "Understand invoices, receipts, forms, letters",
  },
  {
    id: "identify",
    label: "What's This?",
    prompt:
      "What is this? Identify what's shown in the image and provide relevant context, facts, or information about it.",
    icon: "help-circle",
    description: "Identify anything — plants, products, landmarks",
  },
  {
    id: "code",
    label: "Read Code",
    prompt:
      "Extract the code shown in this image. Identify the programming language, transcribe the code accurately, and briefly explain what it does.",
    icon: "code",
    description: "Extract and explain code from screenshots",
  },
];

export const DEFAULT_SYSTEM_PROMPT = `You are DataMug, an expert AI vision assistant. You analyze images with precision and detail. 
- Be thorough but concise in your analysis
- Use markdown formatting for structured responses
- When reading text/code from images, preserve formatting
- If you're unsure about something, say so rather than guessing
- Provide actionable insights when appropriate`;

/**
 * Map model names to known capabilities.
 * Helps the UI tag models with vision support, size, etc.
 */
export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  "llava": {
    vision: true,
    label: "LLaVA",
    description: "General-purpose vision model, fast",
    sizeTag: "~4.7 GB",
  },
  "llama3.2-vision": {
    vision: true,
    label: "Llama 3.2 Vision",
    description: "Advanced multimodal reasoning, 128K context",
    sizeTag: "~7.9 GB",
  },
  "qwen2.5vl": {
    vision: true,
    label: "Qwen 2.5 VL",
    description: "Best for OCR, documents, charts, structured data",
    sizeTag: "~6 GB",
  },
  "minicpm-v": {
    vision: true,
    label: "MiniCPM-V",
    description: "Lightweight, fast, good OCR",
    sizeTag: "~5.5 GB",
  },
  "llava-llama3": {
    vision: true,
    label: "LLaVA Llama3",
    description: "Vision built on Llama 3 backbone",
    sizeTag: "~5 GB",
  },
  "moondream": {
    vision: true,
    label: "Moondream",
    description: "Tiny vision model, very fast",
    sizeTag: "~1.7 GB",
  },
  "bakllava": {
    vision: true,
    label: "BakLLaVA",
    description: "Mistral-based vision model",
    sizeTag: "~4.7 GB",
  },
};

/**
 * Check if a model name matches a known vision model.
 */
export function isVisionModel(modelName: string): boolean {
  const name = modelName.toLowerCase();
  const visionKeywords = [
    "llava",
    "vision",
    "qwen2.5vl",
    "minicpm-v",
    "moondream",
    "bakllava",
  ];
  return visionKeywords.some((kw) => name.includes(kw));
}

/**
 * Get capabilities for a model, with fallback.
 */
export function getModelCapabilities(modelName: string): ModelCapability | null {
  const name = modelName.toLowerCase();
  for (const [key, cap] of Object.entries(MODEL_CAPABILITIES)) {
    if (name.includes(key)) return cap;
  }
  return null;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format file size in human-readable form.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} GB`;
}
