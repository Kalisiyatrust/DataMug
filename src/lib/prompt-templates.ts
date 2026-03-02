/**
 * User-customizable prompt templates system.
 * Stored in localStorage with categories, CRUD, and reordering.
 */

export interface PromptTemplate {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  category: TemplateCategory;
  description: string;
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

export type TemplateCategory =
  | "ocr"
  | "analysis"
  | "creative"
  | "technical"
  | "custom";

export const CATEGORY_META: Record<
  TemplateCategory,
  { label: string; icon: string; color: string }
> = {
  ocr: { label: "OCR & Text", icon: "file-text", color: "#3b82f6" },
  analysis: { label: "Analysis", icon: "scan", color: "#8b5cf6" },
  creative: { label: "Creative", icon: "sparkles", color: "#f59e0b" },
  technical: { label: "Technical", icon: "code", color: "#10b981" },
  custom: { label: "Custom", icon: "star", color: "#ec4899" },
};

const STORAGE_KEY = "datamug-templates";

function genId(): string {
  return `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Built-in templates that ship with the app.
 */
export const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  {
    id: "builtin-describe",
    label: "Describe",
    prompt: "Describe this image in detail. What do you see?",
    icon: "eye",
    category: "analysis",
    description: "Get a detailed description of the image",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-ocr",
    label: "Read Text",
    prompt:
      "Extract and transcribe all text visible in this image. Preserve the layout and formatting as much as possible.",
    icon: "file-text",
    category: "ocr",
    description: "Extract text from screenshots, documents, photos",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-objects",
    label: "Detect Objects",
    prompt:
      "Identify and list all distinct objects visible in this image. For each object, describe its position and any notable characteristics.",
    icon: "scan",
    category: "analysis",
    description: "Find and list all objects in the image",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-document",
    label: "Analyze Document",
    prompt:
      "Analyze this document image. Extract the key information, summarize the content, and identify the document type (invoice, receipt, letter, form, etc.).",
    icon: "file-search",
    category: "ocr",
    description: "Understand invoices, receipts, forms, letters",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-identify",
    label: "What's This?",
    prompt:
      "What is this? Identify what's shown in the image and provide relevant context, facts, or information about it.",
    icon: "help-circle",
    category: "analysis",
    description: "Identify anything — plants, products, landmarks",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-code",
    label: "Read Code",
    prompt:
      "Extract the code shown in this image. Identify the programming language, transcribe the code accurately, and briefly explain what it does.",
    icon: "code",
    category: "technical",
    description: "Extract and explain code from screenshots",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-table",
    label: "Extract Table",
    prompt:
      "Extract the table or structured data from this image. Output it as a clean markdown table. Preserve all values accurately.",
    icon: "table",
    category: "ocr",
    description: "Convert tables in images to structured data",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-caption",
    label: "Caption",
    prompt:
      "Write a concise, engaging caption for this image suitable for social media. Keep it under 280 characters.",
    icon: "message-square",
    category: "creative",
    description: "Generate social media captions",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-alt-text",
    label: "Alt Text",
    prompt:
      "Write descriptive alt text for this image that would be useful for screen readers. Be concise but thorough enough for accessibility.",
    icon: "accessibility",
    category: "creative",
    description: "Generate accessible alt text",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-debug-ui",
    label: "Debug UI",
    prompt:
      "Analyze this screenshot of a user interface. Identify any visual bugs, alignment issues, accessibility problems, or design inconsistencies. Suggest specific fixes.",
    icon: "bug",
    category: "technical",
    description: "Find UI bugs and design issues",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-diagram",
    label: "Read Diagram",
    prompt:
      "Analyze this diagram or flowchart. Describe the structure, nodes, connections, and what process or concept it represents.",
    icon: "git-branch",
    category: "technical",
    description: "Interpret flowcharts, diagrams, architectures",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
  {
    id: "builtin-math",
    label: "Solve Math",
    prompt:
      "Read the math problem or equation in this image. Solve it step by step, showing your work clearly.",
    icon: "calculator",
    category: "technical",
    description: "Read and solve math from images",
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
    usageCount: 0,
  },
];

/**
 * Load all templates: built-in + user custom.
 */
export function getTemplates(): PromptTemplate[] {
  if (typeof window === "undefined") return BUILT_IN_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return BUILT_IN_TEMPLATES;
    const custom: PromptTemplate[] = JSON.parse(raw);
    return [...BUILT_IN_TEMPLATES, ...custom];
  } catch {
    return BUILT_IN_TEMPLATES;
  }
}

/**
 * Get only user-created templates.
 */
export function getCustomTemplates(): PromptTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save a new custom template.
 */
export function createTemplate(
  data: Pick<PromptTemplate, "label" | "prompt" | "icon" | "category" | "description">
): PromptTemplate {
  const template: PromptTemplate = {
    id: genId(),
    ...data,
    isBuiltIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  };
  const custom = getCustomTemplates();
  custom.push(template);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  return template;
}

/**
 * Update a custom template (cannot update built-in ones).
 */
export function updateTemplate(
  id: string,
  data: Partial<Pick<PromptTemplate, "label" | "prompt" | "icon" | "category" | "description">>
): PromptTemplate | null {
  const custom = getCustomTemplates();
  const index = custom.findIndex((t) => t.id === id);
  if (index < 0) return null;
  custom[index] = { ...custom[index], ...data, updatedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  return custom[index];
}

/**
 * Delete a custom template.
 */
export function deleteTemplate(id: string): boolean {
  const custom = getCustomTemplates();
  const filtered = custom.filter((t) => t.id !== id);
  if (filtered.length === custom.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Increment usage count for a template (for sorting by popularity).
 */
export function trackTemplateUsage(id: string): void {
  // For built-in templates, track usage in a separate key
  if (id.startsWith("builtin-")) {
    const key = "datamug-template-usage";
    try {
      const raw = localStorage.getItem(key);
      const usage: Record<string, number> = raw ? JSON.parse(raw) : {};
      usage[id] = (usage[id] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(usage));
    } catch {
      // ignore
    }
    return;
  }

  const custom = getCustomTemplates();
  const index = custom.findIndex((t) => t.id === id);
  if (index >= 0) {
    custom[index].usageCount++;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  }
}

/**
 * Get templates grouped by category.
 */
export function getTemplatesByCategory(): Record<TemplateCategory, PromptTemplate[]> {
  const all = getTemplates();
  const grouped: Record<TemplateCategory, PromptTemplate[]> = {
    ocr: [],
    analysis: [],
    creative: [],
    technical: [],
    custom: [],
  };
  for (const t of all) {
    const cat = t.isBuiltIn ? t.category : "custom";
    if (grouped[cat]) {
      grouped[cat].push(t);
    } else {
      grouped.custom.push(t);
    }
  }
  return grouped;
}
