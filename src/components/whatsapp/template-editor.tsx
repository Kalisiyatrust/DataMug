"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface TemplateEditorProps {
  initialName?: string;
  initialBody?: string;
  initialCategory?: string;
  initialBrand?: string;
  onSave?: (data: {
    name: string;
    body: string;
    category: string;
    brand: string;
  }) => void;
  onCancel?: () => void;
}

const VARIABLES = [
  "{{name}}",
  "{{company}}",
  "{{phone}}",
  "{{email}}",
  "{{stage}}",
  "{{date}}",
  "{{agent_name}}",
];

const CATEGORIES = [
  "Marketing",
  "Utility",
  "Authentication",
  "Follow-up",
  "Welcome",
  "Reminder",
];

const BRANDS = ["Kalisiya", "Eloi", "DataMug"];

function renderPreview(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

const SAMPLE_VALUES: Record<string, string> = {
  name: "Sarah Chen",
  company: "Acme Corp",
  phone: "+44 7700 900123",
  email: "sarah@acmecorp.com",
  stage: "Qualified",
  date: new Date().toLocaleDateString("en-GB"),
  agent_name: "Alex",
};

export function TemplateEditor({
  initialName = "",
  initialBody = "",
  initialCategory = "Marketing",
  initialBrand = "Kalisiya",
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const [name, setName] = useState(initialName);
  const [body, setBody] = useState(initialBody);
  const [category, setCategory] = useState(initialCategory);
  const [brand, setBrand] = useState(initialBrand);

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById("template-body") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.slice(0, start) + variable + body.slice(end);
      setBody(newBody);
      // Restore focus after state update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setBody((prev) => prev + variable);
    }
  };

  const preview = renderPreview(body, SAMPLE_VALUES);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Template Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Welcome Message"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Brand
            </label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
            >
              {BRANDS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Message Body
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <Plus size={10} />
                {v}
              </button>
            ))}
          </div>
          <textarea
            id="template-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            placeholder="Hi {{name}}, thank you for your interest in..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors resize-none font-mono"
          />
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            {body.length} characters
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => onSave?.({ name, body, category, brand })}
            disabled={!name.trim() || !body.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Template
          </button>
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
          Live Preview
        </label>
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-4 h-full min-h-[300px]">
          {/* Phone mockup */}
          <div className="max-w-[280px] mx-auto">
            <div className="bg-green-600 text-white text-xs font-medium px-3 py-2 rounded-t-xl flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-white text-xs">
                W
              </div>
              WhatsApp Preview
            </div>
            <div className="bg-[#e5ddd5] dark:bg-stone-700 p-3 rounded-b-xl min-h-[200px]">
              {preview ? (
                <div className="flex justify-end">
                  <div className="max-w-[90%] bg-[#dcf8c6] dark:bg-green-800 rounded-lg rounded-br-sm px-3 py-2 shadow-sm">
                    <p className="text-sm text-stone-800 dark:text-stone-100 whitespace-pre-wrap break-words leading-relaxed">
                      {preview}
                    </p>
                    <p className="text-right text-xs text-stone-500 dark:text-stone-400 mt-1">
                      {new Date().toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-xs text-stone-400">
                  Preview will appear here
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-stone-400 dark:text-stone-500 text-center mt-3">
            Sample data: {SAMPLE_VALUES.name}, {SAMPLE_VALUES.company}
          </p>
        </div>
      </div>
    </div>
  );
}
