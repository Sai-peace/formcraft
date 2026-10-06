"use client";

import React from "react";
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
      className={`bg-slate-900/70 border border-slate-800 rounded-3xl backdrop-blur-xl transition-shadow ${
        isDragging
          ? "shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/20"
          : "shadow-sm"
      }`}
    >
      {/* Card Header & Content */}
      <div className="p-5 sm:p-6">
        {/* Card Header */}
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-1.5 p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition cursor-grab active:cursor-grabbing touch-none"
            title="Drag to reorder"
            aria-label="Drag to reorder question"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Question Type Selector Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
              <div className="relative inline-flex items-center w-fit">
                <SelectedIcon className="absolute left-2.5 w-3.5 h-3.5 text-indigo-400 pointer-events-none" />

                <select
                  value={question.type}
                  onChange={handleTypeChange}
                  className="appearance-none pl-8 pr-8 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full outline-none focus:border-indigo-500/50 cursor-pointer"
                  aria-label="Question type"
                >
                  {QUESTION_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                      className="bg-slate-900 text-slate-200"
                    >
                      {type.label}
                    </option>
                  ))}
                </select>

                <ChevronDown className="absolute right-2.5 w-3 h-3 text-indigo-400 pointer-events-none" />
              </div>

              <span className="hidden sm:block text-[10px] text-slate-600">
                {selectedType?.label || "Question"}
              </span>
            </div>

            {/* Question Title Input */}
            <input
              type="text"
              value={question.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Enter question text..."
              className="w-full text-sm font-semibold text-white placeholder:text-slate-500 border-b border-transparent hover:border-slate-800 focus:border-indigo-500 pb-1.5 outline-none transition bg-transparent"
            />

            {/* Short Answer Preview */}
            {question.type === "short_answer" && (
              <div className="mt-4">
                <div className="w-full px-3 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-xs text-slate-600">
                  Respondent short answer text entry...
                </div>
              </div>
            )}

            {/* Email Preview */}
            {question.type === "email" && (
              <div className="mt-4">
                <div className="flex items-center gap-2 w-full px-3 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-xs text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  name@student.oauife.edu.ng
                </div>
              </div>
            )}

            {/* Date Selector Preview */}
            {question.type === "date" && (
              <div className="mt-4">
                <div className="flex items-center gap-2 w-full px-3 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-xs text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  DD / MM / YYYY
                </div>
              </div>
            )}

            {/* File Upload Preview */}
            {question.type === "file_upload" && (
              <div className="mt-4 border border-dashed border-slate-800 bg-slate-950/50 rounded-xl p-5 text-center">
                <UploadCloud className="w-6 h-6 text-slate-500 mx-auto mb-2" />

                <p className="text-xs text-slate-400">
                  Respondents will attach files directly
                </p>

                <p className="text-[10px] text-slate-600 mt-1">
                  Supports documents, images, and attachments (up to 10MB)
                </p>
              </div>
            )}

            {/* Multiple Choice / Checkbox / Dropdown Options */}
            {hasOptions && (
              <div className="mt-4 space-y-2">
                {(question.options || []).map((option, index) => (
                  <div
                    key={`${question.id}-option-${index}`}
                    className="flex items-center gap-2"
                  >
                    <span className="w-5 text-center text-slate-500 text-sm shrink-0">
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
                      className="flex-1 min-w-0 text-xs text-slate-200 placeholder:text-slate-500 bg-slate-950/60 hover:bg-slate-950 focus:bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 outline-none transition"
                    />

                    {(question.options || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer shrink-0"
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
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 px-2 py-1.5 rounded-lg hover:bg-indigo-500/10 transition cursor-pointer"
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
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(question.id)}
              title="Delete Question"
              aria-label="Delete Question"
              className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Footer: Required Toggle */}
      <div className="border-t border-slate-800/80 px-5 sm:px-6 py-3 flex items-center justify-between">
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
            className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
          />

          <span className="text-[11px] font-medium text-slate-400">
            Required question
          </span>
        </label>

        <span className="text-[10px] text-slate-600">
          {selectedType?.label || "Question"}
        </span>
      </div>
    </div>
  );
}
