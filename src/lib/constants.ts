import type { AnalysisPreset } from "@/types";

export const ANALYSIS_PRESETS: AnalysisPreset[] = [
  {
    id: "describe",
    label: "Describe",
    prompt: "Describe this image in detail. What do you see?",
    icon: "eye",
  },
  {
    id: "ocr",
    label: "Read Text",
    prompt:
      "Extract and transcribe all text visible in this image. Preserve the layout and formatting as much as possible.",
    icon: "file-text",
  },
  {
    id: "objects",
    label: "Detect Objects",
    prompt:
      "Identify and list all distinct objects visible in this image. For each object, describe its position and any notable characteristics.",
    icon: "scan",
  },
  {
    id: "document",
    label: "Analyze Document",
    prompt:
      "Analyze this document image. Extract the key information, summarize the content, and identify the document type (invoice, receipt, letter, form, etc.).",
    icon: "file-search",
  },
  {
    id: "compare",
    label: "What's This?",
    prompt:
      "What is this? Identify what's shown in the image and provide relevant context, facts, or information about it.",
    icon: "help-circle",
  },
  {
    id: "code",
    label: "Read Code",
    prompt:
      "Extract the code shown in this image. Identify the programming language, transcribe the code accurately, and briefly explain what it does.",
    icon: "code",
  },
];

export const DEFAULT_SYSTEM_PROMPT = `You are DataMug, an expert AI vision assistant. You analyze images with precision and detail. 
- Be thorough but concise in your analysis
- Use markdown formatting for structured responses
- When reading text/code from images, preserve formatting
- If you're unsure about something, say so rather than guessing
- Provide actionable insights when appropriate`;

export const MAX_IMAGE_SIZE = parseInt(
  process.env.MAX_IMAGE_SIZE || "10485760",
  10
); // 10MB default

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
