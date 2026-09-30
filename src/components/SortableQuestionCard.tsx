"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Mail } from "lucide-react";
import {
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
} from "lucide-react";

export type QuestionType =
  | "short_answer"
  | "email"
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleTitleChange = (val: string) => {
    onUpdate({
      ...question,
      title: val,
    });
  };

  const handleTypeChange = (type: QuestionType) => {
    let options = question.options;

    if (
      ["multiple_choice", "checkbox", "dropdown"].includes(type) &&
      (!options || options.length === 0)
    ) {
      options = ["Option 1"];
    }

    if (!["multiple_choice", "checkbox", "dropdown"].includes(type)) {
      options = undefined;
    }

    onUpdate({
      ...question,
      type,
      options,
    });
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...(question.options || [])];

    updated[idx] = val;

    onUpdate({
      ...question,
      options: updated,
    });
  };

  const addOption = () => {
    const opts = question.options || [];

    onUpdate({
      ...question,
      options: [...opts, `Option ${opts.length + 1}`],
    });
  };

  const removeOption = (idx: number) => {
    const opts = (question.options || []).filter((_, i) => i !== idx);

    onUpdate({
      ...question,
      options: opts,
    });
  };

  const questionTypes: QuestionTypeOption[] = [
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

  const selectedType = questionTypes.find(
    (item) => item.value === question.type,
  );

  const SelectedIcon = selectedType?.icon || Type;

  const optionQuestionTypes: QuestionType[] = [
    "multiple_choice",
    "checkbox",
    "dropdown",
  ];

  const hasOptions = optionQuestionTypes.includes(question.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-xl shadow-sm transition ${
        isDragging ? "border-indigo-400 shadow-lg" : "border-slate-200"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 p-1 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing rounded transition touch-none"
          title="Drag to reorder"
          aria-label="Drag to reorder question"
        >
          <GripVertical size={18} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Question Type */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <SelectedIcon size={14} className="text-indigo-600" />

              <span>{selectedType?.label || "Question"}</span>
            </div>

            <select
              value={question.type}
              onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 transition cursor-pointer"
              aria-label="Question type"
            >
              {questionTypes.map((type) => {
                const Icon = type.icon;

                return (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Question Title */}
          <input
            type="text"
            value={question.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter question text..."
            className="w-full text-sm font-medium text-slate-800 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 pb-1 outline-none transition bg-transparent"
          />

          {/* Short Answer Preview */}
          {question.type === "short_answer" && (
            <div className="mt-4">
              <div className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-400 bg-slate-50">
                Respondent short answer text entry...
              </div>
            </div>
          )}

          {question.type === "email" && (
            <div className="mt-4">
              <div className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-400 bg-slate-50">
                Respondent email address...
              </div>
            </div>
          )}

          {/* Date Preview */}
          {question.type === "date" && (
            <div className="mt-4">
              <div className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-400 bg-slate-50 flex items-center justify-between">
                <span>DD / MM / YYYY</span>
                <Calendar size={15} className="text-slate-400" />
              </div>
            </div>
          )}

          {/* File Upload Preview */}
          {question.type === "file_upload" && (
            <div className="mt-4 border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <UploadCloud size={18} className="text-slate-400" />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-700">
                    Respondents will be prompted to upload files
                  </p>

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports documents, images, and attachments (up to 10MB)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Multiple Choice / Checkbox / Dropdown Options */}
          {hasOptions && (
            <div className="mt-4 space-y-2">
              {(question.options || []).map((opt, idx) => (
                <div
                  key={`${question.id}-option-${idx}`}
                  className="flex items-center gap-2"
                >
                  <span className="w-6 text-center text-sm text-slate-400 shrink-0">
                    {question.type === "checkbox"
                      ? "☐"
                      : question.type === "multiple_choice"
                        ? "○"
                        : `${idx + 1}.`}
                  </span>

                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 text-xs text-slate-700 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-2 py-1.5 outline-none transition"
                  />

                  {(question.options || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="p-1 text-slate-300 hover:text-rose-500 rounded transition"
                      title="Remove option"
                      aria-label={`Remove option ${idx + 1}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-1 px-1 py-1 rounded transition"
              >
                <Plus size={14} />
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
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition"
          >
            <Copy size={15} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(question.id)}
            title="Delete Question"
            aria-label="Delete Question"
            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Card Footer */}
      <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-end">
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => {
              onUpdate({
                ...question,
                required: e.target.checked,
              });
            }}
            className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
          />
          Required
        </label>
      </div>
    </div>
  );
}
