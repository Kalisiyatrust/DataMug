"use client";

import { useState, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle, ChevronDown } from "lucide-react";

interface CSVImportModalProps {
  onClose: () => void;
  onImport: (data: {
    rows: Record<string, string>[];
    mapping: Record<string, string>;
    brand: string;
  }) => void;
}

const CONTACT_FIELDS = [
  { key: "name", label: "Full Name", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email", required: false },
  { key: "company", label: "Company", required: false },
  { key: "stage", label: "Stage", required: false },
  { key: "tags", label: "Tags", required: false },
  { key: "notes", label: "Notes", required: false },
  { key: "score", label: "Lead Score", required: false },
  { key: "skip", label: "— Skip column —", required: false },
];

const BRANDS = ["Kalisiya", "Eloi", "DataMug"];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parse = (line: string): string[] => {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  };
  const headers = parse(lines[0]);
  const rows = lines.slice(1).filter((l) => l.trim()).map(parse);
  return { headers, rows };
}

function autoMap(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
  headers.forEach((h) => {
    const n = normalize(h);
    if (n.includes("name") || n.includes("fullname")) mapping[h] = "name";
    else if (n.includes("phone") || n.includes("mobile") || n.includes("tel"))
      mapping[h] = "phone";
    else if (n.includes("email") || n.includes("mail")) mapping[h] = "email";
    else if (n.includes("company") || n.includes("org") || n.includes("business"))
      mapping[h] = "company";
    else if (n.includes("stage") || n.includes("status")) mapping[h] = "stage";
    else if (n.includes("tag")) mapping[h] = "tags";
    else if (n.includes("note") || n.includes("comment")) mapping[h] = "notes";
    else if (n.includes("score") || n.includes("rating")) mapping[h] = "score";
    else mapping[h] = "skip";
  });
  return mapping;
}

export function CSVImportModal({ onClose, onImport }: CSVImportModalProps) {
  const [step, setStep] = useState<"upload" | "map" | "confirm">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [brand, setBrand] = useState("Kalisiya");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) {
        setError("Could not parse CSV. Please check the file.");
        return;
      }
      setHeaders(headers);
      setRows(rows);
      setMapping(autoMap(headers));
      setError("");
      setStep("map");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const mappedRows = rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      const field = mapping[h];
      if (field && field !== "skip") {
        obj[field] = row[i] ?? "";
      }
    });
    return obj;
  });

  const hasRequired =
    Object.values(mapping).includes("name") &&
    Object.values(mapping).includes("phone");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Import Contacts
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {step === "upload" && "Upload a CSV file"}
              {step === "map" && `Map ${headers.length} columns — ${rows.length} rows found`}
              {step === "confirm" && `Review ${mappedRows.length} contacts before import`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={18} className="text-stone-500" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex px-6 py-3 gap-2 border-b border-stone-100 dark:border-stone-800">
          {(["upload", "map", "confirm"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : i < ["upload", "map", "confirm"].indexOf(step)
                    ? "bg-green-500 text-white"
                    : "bg-stone-200 dark:bg-stone-700 text-stone-500"
                }`}
              >
                {i < ["upload", "map", "confirm"].indexOf(step) ? (
                  <CheckCircle size={12} />
                ) : (
                  i + 1
                )}
              </div>
              <span className="text-xs text-stone-600 dark:text-stone-400 capitalize">
                {s}
              </span>
              {i < 2 && (
                <div className="w-6 h-px bg-stone-200 dark:bg-stone-700 ml-1" />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Upload Step */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
              >
                <Upload
                  size={28}
                  className="mx-auto mb-3 text-stone-400 dark:text-stone-500"
                />
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Drop your CSV here or click to browse
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                  Supports .csv files only
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              <div className="p-4 rounded-lg bg-stone-50 dark:bg-stone-800 text-xs text-stone-500 dark:text-stone-400">
                <p className="font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Expected columns (any order):
                </p>
                <p>Name, Phone, Email, Company, Stage, Tags, Notes, Score</p>
              </div>
            </div>
          )}

          {/* Map Step */}
          {step === "map" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Assign to Brand
                </label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {BRANDS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Column Mapping
                </p>
                {headers.map((h) => (
                  <div
                    key={h}
                    className="grid grid-cols-2 gap-3 items-center p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700"
                  >
                    <div>
                      <p className="text-xs font-mono text-stone-600 dark:text-stone-400">
                        {h}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                        e.g. {rows[0]?.[headers.indexOf(h)] ?? "—"}
                      </p>
                    </div>
                    <div className="relative">
                      <select
                        value={mapping[h] || "skip"}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [h]: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        {CONTACT_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                            {f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={12}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {!hasRequired && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle size={16} className="text-yellow-500 flex-shrink-0" />
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Map at least Name and Phone to continue
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confirm Step */}
          {step === "confirm" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  Ready to import <strong>{mappedRows.length}</strong> contacts to{" "}
                  <strong>{brand}</strong>
                </p>
              </div>

              {/* Preview table */}
              <div className="rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-stone-50 dark:bg-stone-800">
                        {Object.values(mapping)
                          .filter((v) => v !== "skip")
                          .filter((v, i, arr) => arr.indexOf(v) === i)
                          .map((field) => (
                            <th
                              key={field}
                              className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-400 capitalize"
                            >
                              {field}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mappedRows.slice(0, 5).map((row, i) => (
                        <tr
                          key={i}
                          className="border-t border-stone-100 dark:border-stone-800"
                        >
                          {Object.values(mapping)
                            .filter((v) => v !== "skip")
                            .filter((v, i, arr) => arr.indexOf(v) === i)
                            .map((field) => (
                              <td
                                key={field}
                                className="px-3 py-2 text-stone-700 dark:text-stone-300 max-w-[120px] truncate"
                              >
                                {row[field] || "—"}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mappedRows.length > 5 && (
                  <div className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border-t border-stone-100 dark:border-stone-700 text-xs text-stone-400">
                    + {mappedRows.length - 5} more rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
          <button
            onClick={() => {
              if (step === "map") setStep("upload");
              else if (step === "confirm") setStep("map");
              else onClose();
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            {step === "upload" ? "Cancel" : "Back"}
          </button>
          <button
            onClick={() => {
              if (step === "upload") return;
              if (step === "map") {
                if (hasRequired) setStep("confirm");
              } else {
                onImport({ rows: mappedRows, mapping, brand });
                onClose();
              }
            }}
            disabled={step === "upload" || (step === "map" && !hasRequired)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {step === "confirm" ? `Import ${mappedRows.length} Contacts` : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
