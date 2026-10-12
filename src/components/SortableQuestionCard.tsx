"use client";

import React, { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Mail,
  GripVertical,
  Trash2,
  Copy,
  Plus,
  X,
  Type,
  List,
  CheckSquare,
  ChevronDown,
  Calendar,
  UploadCloud,
  GraduationCap,
} from "lucide-react";

export type QuestionType =
  | "short_answer"
  | "email"
  | "matric_number"
  | "multiple_choice"
  | "checkbox"
  | "dropdown"
  | "date"
  | "file_upload";

export interface QuestionField {
  id: string;
  title: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
}

interface QuestionCardProps {
  question: QuestionField;
  onUpdate: (updated: QuestionField) => void;
  onDelete: (id: string) => void;
  onDuplicate: (question: QuestionField) => void;
}

interface QuestionTypeOption {
  value: QuestionType;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
}

const OPTION_QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "checkbox",
  "dropdown",
];

const QUESTION_TYPES: QuestionTypeOption[] = [
  {
    value: "short_answer",
    label: "Short Answer",
    icon: Type,
  },
  {
    value: "email",
    label: "Email Address",
    icon: Mail,
  },
  {
    value: "matric_number",
    label: "OAU Matric Number",
    icon: GraduationCap,
  },
  {
    value: "multiple_choice",
    label: "Multiple Choice",
    icon: List,
  },
  {
    value: "checkbox",
    label: "Checkboxes",
    icon: CheckSquare,
  },
  {
    value: "dropdown",
    label: "Dropdown",
    icon: ChevronDown,
  },
  {
    value: "date",
    label: "Date Selector",
    icon: Calendar,
  },
  {
    value: "file_upload",
    label: "File Upload",
    icon: UploadCloud,
  },
];

export default function SortableQuestionCard({
  question,
  onUpdate,
  onDelete,
  onDuplicate,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question.id,
  });

  const [theme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";

    return localStorage.getItem("oau_faas_theme") === "light" ? "light" : "dark";
  });

  const isDark = theme === "dark";

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const handleTitleChange = (value: string) => {
    onUpdate({
      ...question,
      title: value,
    });
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as QuestionType;
    const needsOptions = OPTION_QUESTION_TYPES.includes(type);

    let options = question.options;

    if (needsOptions && (!options || options.length === 0)) {
      options = ["Option 1"];
    }

    if (!needsOptions) {
      options = undefined;
    }

    onUpdate({
      ...question,
      type,
      options,
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...(question.options || [])];
    updatedOptions[index] = value;
    onUpdate({
      ...question,
      options: updatedOptions,
    });
  };

  const addOption = () => {
    const options = question.options || [];
    onUpdate({
      ...question,
      options: [...options, `Option ${options.length + 1}`],
    });
  };

  const removeOption = (index: number) => {
    const options = (question.options || []).filter(
      (_, optionIndex) => optionIndex !== index,
    );
    onUpdate({
      ...question,
      options,
    });
  };

  const selectedType = QUESTION_TYPES.find(
    (item) => item.value === question.type,
  );

  const SelectedIcon = selectedType?.icon || Type;
  const hasOptions = OPTION_QUESTION_TYPES.includes(question.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-3xl backdrop-blur-xl transition-all ${
        isDark
          ? "bg-slate-900/70 border-slate-800"
          : "bg-[#FAF8F3] border-[#E0D8C8] shadow-sm"
      } ${isDragging ? "shadow-2xl ring-1 ring-indigo-500/20" : ""}`}
    >
      {/* Card Header & Content */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className={`mt-1.5 p-1.5 rounded-lg transition cursor-grab active:cursor-grabbing touch-none ${
              isDark
                ? "text-slate-600 hover:text-slate-300 hover:bg-slate-800"
                : "text-stone-400 hover:text-stone-700 hover:bg-[#EFEAE0]"
            }`}
            title="Drag to reorder"
            aria-label="Drag to reorder question"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Question Type Selector Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
              <div className="relative inline-flex items-center w-fit">
                <SelectedIcon className="absolute left-2.5 w-3.5 h-3.5 text-indigo-500 pointer-events-none" />

                <select
                  value={question.type}
                  onChange={handleTypeChange}
                  className={`appearance-none pl-8 pr-8 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-full border outline-none cursor-pointer ${
                    isDark
                      ? "text-indigo-300 bg-indigo-500/10 border-indigo-500/20 focus:border-indigo-500/50"
                      : "text-indigo-900 bg-indigo-50 border-indigo-200 focus:border-indigo-400"
                  }`}
                  aria-label="Question type"
                >
                  {QUESTION_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                      className={
                        isDark
                          ? "bg-slate-900 text-slate-200"
                          : "bg-white text-stone-900"
                      }
                    >
                      {type.label}
                    </option>
                  ))}
                </select>

                <ChevronDown className="absolute right-2.5 w-3 h-3 text-indigo-500 pointer-events-none" />
              </div>

              <span
                className={`hidden sm:block text-[10px] ${isDark ? "text-slate-500" : "text-stone-400"}`}
              >
                {selectedType?.label || "Question"}
              </span>
            </div>

            {/* Question Title Input */}
            <input
              type="text"
              value={question.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Enter question text..."
              className={`w-full text-base font-bold border-b pb-1.5 outline-none transition bg-transparent ${
                isDark
                  ? "text-white placeholder:text-slate-500 border-transparent hover:border-slate-800 focus:border-indigo-500"
                  : "text-[#111827] placeholder:text-stone-400 border-transparent hover:border-stone-300 focus:border-indigo-500"
              }`}
            />

            {/* Short Answer Preview */}
            {question.type === "short_answer" && (
              <div className="mt-4">
                <div
                  className={`w-full px-3.5 py-3 rounded-xl border text-xs ${
                    isDark
                      ? "border-slate-800 bg-slate-950/50 text-slate-500"
                      : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-400"
                  }`}
                >
                  Respondent short answer text entry...
                </div>
              </div>
            )}

            {question.type === "matric_number" && (
              <div className="mt-4">
                <div
                  className={`w-full px-3.5 py-3 rounded-xl border text-xs font-mono uppercase ${
                    isDark
                      ? "border-slate-800 bg-slate-950/50 text-slate-500"
                      : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-400"
                  }`}
                >
                  e.g. EEG/2021/104
                </div>
              </div>
            )}

            {/* Email Preview */}
            {question.type === "email" && (
              <div className="mt-4">
                <div
                  className={`flex items-center gap-2 w-full px-3.5 py-3 rounded-xl border text-xs ${
                    isDark
                      ? "border-slate-800 bg-slate-950/50 text-slate-500"
                      : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-400"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  name@student.oauife.edu.ng
                </div>
              </div>
            )}

            {/* Date Selector Preview */}
            {question.type === "date" && (
              <div className="mt-4">
                <div
                  className={`flex items-center gap-2 w-full px-3.5 py-3 rounded-xl border text-xs ${
                    isDark
                      ? "border-slate-800 bg-slate-950/50 text-slate-500"
                      : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-400"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  DD / MM / YYYY
                </div>
              </div>
            )}

            {/* File Upload Preview */}
            {question.type === "file_upload" && (
              <div
                className={`mt-4 border border-dashed rounded-xl p-5 text-center ${
                  isDark
                    ? "border-slate-800 bg-slate-950/50"
                    : "border-[#DFD7C7] bg-[#FFFFFF]"
                }`}
              >
                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p
                  className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-stone-700"}`}
                >
                  Respondents will attach files directly
                </p>
                <p
                  className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-stone-400"}`}
                >
                  Supports documents, images, and attachments (up to 10MB)
                </p>
              </div>
            )}

            {/* Multiple Choice / Checkbox / Dropdown Options */}
            {hasOptions && (
              <div className="mt-4 space-y-2.5">
                {(question.options || []).map((option, index) => (
                  <div
                    key={`${question.id}-option-${index}`}
                    className="flex items-center gap-2.5"
                  >
                    <span
                      className={`w-5 text-center text-xs font-semibold shrink-0 ${
                        isDark ? "text-slate-500" : "text-stone-400"
                      }`}
                    >
                      {question.type === "checkbox"
                        ? "☐"
                        : question.type === "multiple_choice"
                          ? "○"
                          : `${index + 1}.`}
                    </span>

                    <input
                      type="text"
                      value={option}
                      onChange={(event) =>
                        handleOptionChange(index, event.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      className={`flex-1 min-w-0 text-xs font-medium rounded-xl px-3.5 py-2.5 border outline-none transition ${
                        isDark
                          ? "text-slate-100 placeholder:text-slate-500 bg-slate-950/60 hover:bg-slate-950 focus:bg-slate-950 border-slate-800 hover:border-slate-700 focus:border-indigo-500"
                          : "text-stone-900 placeholder:text-stone-400 bg-[#FFFFFF] hover:bg-white focus:bg-white border-[#DFD7C7] hover:border-stone-400 focus:border-indigo-500 shadow-sm"
                      }`}
                    />

                    {(question.options || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                          isDark
                            ? "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                            : "text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                        title="Remove option"
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addOption}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-600 px-2 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Option
                </button>
              </div>
            )}
          </div>

          {/* Card Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onDuplicate(question)}
              title="Duplicate Question"
              aria-label="Duplicate Question"
              className={`p-2 rounded-xl transition cursor-pointer ${
                isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-stone-400 hover:text-stone-700 hover:bg-[#EFEAE0]"
              }`}
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(question.id)}
              title="Delete Question"
              aria-label="Delete Question"
              className={`p-2 rounded-xl transition cursor-pointer ${
                isDark
                  ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  : "text-stone-400 hover:text-rose-600 hover:bg-rose-50"
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Footer: Required Toggle */}
      <div
        className={`border-t px-5 sm:px-6 py-3 flex items-center justify-between ${
          isDark ? "border-slate-800/80" : "border-[#E0D8C8]"
        }`}
      >
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(event) => {
              onUpdate({
                ...question,
                required: event.target.checked,
              });
            }}
            className={`rounded cursor-pointer h-4 w-4 ${
              isDark
                ? "border-slate-700 bg-slate-950 text-indigo-600"
                : "border-[#DFD7C7] bg-white text-indigo-600"
            }`}
          />

          <span
            className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-stone-600"}`}
          >
            Required question
          </span>
        </label>

        <span
          className={`text-[10px] font-semibold ${isDark ? "text-slate-500" : "text-stone-400"}`}
        >
          {selectedType?.label || "Question"}
        </span>
      </div>
    </div>
  );
}
