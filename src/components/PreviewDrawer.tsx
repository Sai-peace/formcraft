"use client";

import { useState } from "react";
import {
  X,
  Smartphone,
  Monitor,
  ExternalLink,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

interface Question {
  id: string;
  title: string;
  type: string;
  options?: string[];
  required?: boolean;
}

interface PreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  formTitle: string;
  formDescription: string;
  questions: Question[];
  formId: string;
}

export default function PreviewDrawer({
  isOpen,
  onClose,
  formTitle,
  formDescription,
  questions,
  formId,
}: PreviewDrawerProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm transition-all"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-slate-950 border-l border-slate-800 flex flex-col h-full shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-white">
              Live Form Simulator
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              read-only preview
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Toggles */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  device === "desktop"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Desktop View"
              >
                <Monitor size={14} />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  device === "mobile"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Mobile View"
              >
                <Smartphone size={14} />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            <a
              href={`/f/${formId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Open respondent page in new tab"
            >
              <ExternalLink size={16} />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-start justify-center bg-slate-900/40">
          <div
            className={`w-full transition-all duration-300 ${
              device === "mobile"
                ? "max-w-sm rounded-[36px] border-4 border-slate-700 bg-slate-900 p-6 shadow-2xl my-4"
                : "max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl"
            }`}
          >
            {/* Header info */}
            <div className="border-b border-slate-800 pb-5 mb-6">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                Questionnaire
              </span>
              <h1 className="text-xl font-bold text-white mt-3">
                {formTitle || "Untitled Form"}
              </h1>
              {formDescription && (
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {formDescription}
                </p>
              )}
            </div>

            {/* Questions list */}
            <div className="space-y-6">
              {questions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No questions added to this form yet.
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <label className="text-xs font-semibold text-slate-200">
                        {idx + 1}. {q.title}
                        {q.required && (
                          <span className="text-rose-400 ml-1">*</span>
                        )}
                      </label>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {q.type.replace("_", " ")}
                      </span>
                    </div>

                    {/* Short Answer / Matric / Email */}
                    {["short_answer", "email", "matric_number"].includes(
                      q.type,
                    ) && (
                      <input
                        type="text"
                        disabled
                        placeholder={
                          q.type === "matric_number"
                            ? "e.g. CSC/2021/045"
                            : q.type === "email"
                              ? "student@student.oauife.edu.ng"
                              : "Respondent answer here..."
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 cursor-not-allowed"
                      />
                    )}

                    {/* Date */}
                    {q.type === "date" && (
                      <input
                        type="date"
                        disabled
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                      />
                    )}

                    {/* Multiple Choice */}
                    {q.type === "multiple_choice" && (
                      <div className="space-y-2">
                        {(q.options || ["Option 1", "Option 2"]).map(
                          (opt, oIdx) => (
                            <div
                              key={oIdx}
                              className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/50 border border-slate-800/50 text-xs text-slate-300"
                            >
                              <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center shrink-0" />
                              <span>{opt}</span>
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {/* Checkbox */}
                    {q.type === "checkbox" && (
                      <div className="space-y-2">
                        {(q.options || ["Option 1", "Option 2"]).map(
                          (opt, oIdx) => (
                            <div
                              key={oIdx}
                              className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/50 border border-slate-800/50 text-xs text-slate-300"
                            >
                              <div className="w-3.5 h-3.5 rounded-md border border-slate-600 shrink-0" />
                              <span>{opt}</span>
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {/* Dropdown */}
                    {q.type === "dropdown" && (
                      <div className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-500 flex justify-between items-center">
                        <span>Select an option...</span>
                        <ChevronRight
                          size={14}
                          className="rotate-90 text-slate-600"
                        />
                      </div>
                    )}

                    {/* File Upload */}
                    {q.type === "file_upload" && (
                      <div className="border border-dashed border-slate-800 rounded-lg p-4 text-center text-xs text-slate-500 bg-slate-900/30">
                        Upload file (max 5MB)
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                disabled
                className="px-5 py-2.5 bg-indigo-600/50 text-indigo-200 text-xs font-semibold rounded-xl cursor-not-allowed opacity-75"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
