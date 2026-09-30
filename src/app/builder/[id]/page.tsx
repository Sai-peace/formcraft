"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Plus,
  Sliders,
  BarChart3,
  Edit3,
  Download,
  RefreshCw,
  Palette,
} from "lucide-react";
import { Share2 } from "lucide-react";
import ShareModal from "@/components/ShareModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableQuestionCard, {
  QuestionField,
} from "@/components/SortableQuestionCard";

const THEME_OPTIONS = [
  {
    id: "indigo",
    name: "Royal Indigo",
    color: "#4f46e5",
    bg: "bg-indigo-600",
    border: "border-indigo-600",
    light: "bg-indigo-50",
  },
  {
    id: "emerald",
    name: "Emerald Forest",
    color: "#059669",
    bg: "bg-emerald-600",
    border: "border-emerald-600",
    light: "bg-emerald-50",
  },
  {
    id: "violet",
    name: "Deep Violet",
    color: "#7c3aed",
    bg: "bg-violet-600",
    border: "border-violet-600",
    light: "bg-violet-50",
  },
  {
    id: "amber",
    name: "Warm Amber",
    color: "#d97706",
    bg: "bg-amber-600",
    border: "border-amber-600",
    light: "bg-amber-50",
  },
  {
    id: "rose",
    name: "Crimson Rose",
    color: "#e11d48",
    bg: "bg-rose-600",
    border: "border-rose-600",
    light: "bg-rose-50",
  },
  {
    id: "slate",
    name: "Minimal Slate",
    color: "#1e293b",
    bg: "bg-slate-800",
    border: "border-slate-800",
    light: "bg-slate-100",
  },
];

interface FormData {
  id: string;
  title: string;
  description?: string | null;
  fields: string;
  published: boolean;
  theme?: string | null;
  collectEmail?: boolean;
  maxSubmissions?: number | null;
  deadline?: string | null;
  customMessage?: string | null;
  redirectUrl?: string | null;
  notifyEmail?: boolean;
  _count?: {
    responses: number;
  };
}

interface RawResponse {
  id: string;
  answers: string;
  createdAt: string;
}

type AnswerValue = string | string[] | number | boolean | null | undefined;

type AnswersMap = Record<string, AnswerValue>;

export default function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const formId = resolvedParams.id;
  const router = useRouter();

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [form, setForm] = useState<FormData | null>(null);
  const [questions, setQuestions] = useState<QuestionField[]>([]);
  const [activeTab, setActiveTab] = useState<
    "builder" | "responses" | "settings"
  >("builder");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [responses, setResponses] = useState<RawResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const saveForm = async (
    updatedQuestions: QuestionField[] = questions,
    updatedMeta: FormData | null = form,
  ) => {
    if (!updatedMeta) return;

    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: updatedMeta.title,
          description: updatedMeta.description,
          published: updatedMeta.published,
          theme: updatedMeta.theme || "indigo",
          collectEmail: updatedMeta.collectEmail ?? false,
          maxSubmissions: updatedMeta.maxSubmissions ?? null,
          deadline: updatedMeta.deadline ?? null,
          customMessage: updatedMeta.customMessage ?? null,
          redirectUrl: updatedMeta.redirectUrl ?? null,
          notifyEmail: updatedMeta.notifyEmail ?? false,
          fields: updatedQuestions,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);

        window.setTimeout(() => {
          setSavedSuccess(false);
        }, 2000);
      } else {
        console.error("Failed to save form:", await res.text().catch(() => ""));
      }
    } catch (error) {
      console.error("Failed to save form:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublishStatus = async () => {
    if (!form) return;

    const updated = {
      ...form,
      published: !form.published,
    };

    setForm(updated);
    await saveForm(questions, updated);
  };

  const fetchResponses = async () => {
    setLoadingResponses(true);

    try {
      const res = await fetch(`/api/forms/${formId}/responses`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setResponses([]);
        return;
      }

      const data = await res.json();

      setResponses(Array.isArray(data) ? (data as RawResponse[]) : []);
    } catch (error) {
      console.error("Failed to fetch responses:", error);
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadForm() {
      try {
        const res = await fetch(`/api/forms/${formId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          router.push("/");
          return;
        }

        const data = (await res.json()) as FormData;

        if (ignore) return;

        setForm(data);

        try {
          const parsed = JSON.parse(data.fields || "[]");

          setQuestions(
            Array.isArray(parsed) ? (parsed as QuestionField[]) : [],
          );
        } catch {
          setQuestions([]);
        }
      } catch (error) {
        console.error("Failed to load form:", error);
      }
    }

    loadForm();

    return () => {
      ignore = true;
    };
  }, [formId, router]);

  useEffect(() => {
    if (activeTab !== "responses") return;

    let ignore = false;

    const loadResponses = async () => {
      setLoadingResponses(true);

      try {
        const res = await fetch(`/api/forms/${formId}/responses`, {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!ignore) setResponses([]);
          return;
        }

        const data = await res.json();

        if (!ignore) {
          setResponses(Array.isArray(data) ? (data as RawResponse[]) : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to fetch responses:", error);
          setResponses([]);
        }
      } finally {
        if (!ignore) setLoadingResponses(false);
      }
    };

    void loadResponses();

    return () => {
      ignore = true;
    };
  }, [activeTab, formId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = questions.findIndex(
      (question) => question.id === active.id,
    );

    const newIndex = questions.findIndex((question) => question.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(questions, oldIndex, newIndex);

    setQuestions(reordered);
    void saveForm(reordered);
  };

  const addQuestion = () => {
    const newQuestion: QuestionField = {
      id: `q-${Date.now()}`,
      title: "Untitled Question",
      type: "multiple_choice",
      options: ["Option 1"],
      required: false,
    };

    const updated = [...questions, newQuestion];

    setQuestions(updated);
    void saveForm(updated);
  };

  const updateQuestion = (updatedQuestion: QuestionField) => {
    const updated = questions.map((question) =>
      question.id === updatedQuestion.id ? updatedQuestion : question,
    );

    setQuestions(updated);
    void saveForm(updated);
  };

  const duplicateQuestion = (question: QuestionField) => {
    const copy: QuestionField = {
      ...question,
      id: `q-${Date.now()}`,
      title: `${question.title} (Copy)`,
      options: question.options ? [...question.options] : undefined,
    };

    const updated = [...questions, copy];

    setQuestions(updated);
    void saveForm(updated);
  };

  const deleteQuestion = (id: string) => {
    const updated = questions.filter((question) => question.id !== id);

    setQuestions(updated);
    void saveForm(updated);
  };

  const exportToCSV = () => {
    if (responses.length === 0) return;

    const escapeCSV = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);

      return `"${text.replace(/"/g, '""')}"`;
    };

    const headers = [
      escapeCSV("Submission ID"),
      escapeCSV("Submitted At"),
      ...questions.map((question) => escapeCSV(question.title)),
    ];

    const rows = responses.map((response) => {
      let answersMap: AnswersMap = {};

      try {
        answersMap =
          typeof response.answers === "string"
            ? (JSON.parse(response.answers) as AnswersMap)
            : {};
      } catch {
        answersMap = {};
      }

      const rowAnswers = questions.map((question) => {
        const value = answersMap[question.id];

        if (Array.isArray(value)) {
          return escapeCSV(value.join(", "));
        }

        if (value !== null && typeof value === "object") {
          return escapeCSV(JSON.stringify(value));
        }

        return escapeCSV(value ?? "");
      });

      return [
        escapeCSV(response.id),
        escapeCSV(new Date(response.createdAt).toLocaleString()),
        ...rowAnswers,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `${(form?.title || "form")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_responses.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  if (!form) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm">Loading workspace...</p>
        </div>
      </main>
    );
  }

  const parsedResponses = responses.map((response) => {
    try {
      const parsed =
        typeof response.answers === "string"
          ? JSON.parse(response.answers)
          : response.answers;

      return {
        ...response,
        data:
          parsed && typeof parsed === "object"
            ? (parsed as AnswersMap)
            : ({} as AnswersMap),
      };
    } catch {
      return {
        ...response,
        data: {} as AnswersMap,
      };
    }
  });

  const responseCount =
    responses.length > 0 ? responses.length : (form._count?.responses ?? 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition shrink-0 cursor-pointer"
                title="Return to Dashboard"
                aria-label="Return to Dashboard"
              >
                <ArrowLeft size={18} />
              </button>

              <input
                type="text"
                value={form.title}
                onChange={(event) => {
                  const updated = {
                    ...form,
                    title: event.target.value,
                  };

                  setForm(updated);
                  void saveForm(questions, updated);
                }}
                className="font-semibold text-slate-900 text-sm sm:text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 outline-none pb-0.5 w-44 sm:w-72 transition truncate"
                aria-label="Form title"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs text-slate-400">
                {isSaving ? (
                  "Saving..."
                ) : savedSuccess ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Check size={13} />
                    Saved
                  </span>
                ) : (
                  "All changes saved"
                )}
              </span>

              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-sm"
              >
                <Share2 size={14} />
                Share
              </button>

              <button
                type="button"
                onClick={() => void togglePublishStatus()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                {form.published ? "Unpublish Form" : "Publish Form"}
              </button>

              <a
                href={`/f/${formId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"
              >
                View Form
              </a>
            </div>
          </div>

          <div className="flex items-center gap-1 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("builder")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === "builder"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 size={13} />
              Builder
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("responses")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === "responses"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={13} />
              Responses ({responseCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === "settings"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders size={13} />
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "builder" && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <input
                type="text"
                value={form.title}
                onChange={(event) => {
                  const updated = {
                    ...form,
                    title: event.target.value,
                  };

                  setForm(updated);
                  void saveForm(questions, updated);
                }}
                placeholder="Form Title"
                className="w-full text-xl font-bold text-slate-900 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none pb-1 transition mb-2"
              />

              <textarea
                value={form.description || ""}
                onChange={(event) => {
                  const updated = {
                    ...form,
                    description: event.target.value,
                  };

                  setForm(updated);
                  void saveForm(questions, updated);
                }}
                placeholder="Form description or instructions for respondents..."
                rows={2}
                className="w-full text-xs text-slate-600 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none transition resize-none"
              />
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((question) => question.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {questions.map((question) => (
                    <SortableQuestionCard
                      key={question.id}
                      question={question}
                      onUpdate={updateQuestion}
                      onDelete={deleteQuestion}
                      onDuplicate={duplicateQuestion}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              type="button"
              onClick={addQuestion}
              className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 rounded-xl text-slate-600 hover:text-indigo-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        )}

        {activeTab === "responses" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {responses.length}{" "}
                  {responses.length === 1 ? "Response" : "Responses"}
                </h3>

                <p className="text-xs text-slate-500">
                  Live submission records & analytics
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchResponses()}
                  disabled={loadingResponses}
                  title="Refresh responses"
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      loadingResponses ? "animate-spin" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={exportToCSV}
                  disabled={responses.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>

            {loadingResponses ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                Fetching response records...
              </div>
            ) : responses.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />

                <h4 className="font-semibold text-slate-800 text-sm">
                  Waiting for responses
                </h4>

                <p className="text-xs text-slate-400 mt-1">
                  Share your public form link with respondents to begin
                  collecting data.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {questions.map((question, index) => {
                  const hasOptions = [
                    "multiple_choice",
                    "checkbox",
                    "dropdown",
                  ].includes(question.type);

                  if (hasOptions) {
                    const counts: Record<string, number> = {};

                    (question.options || []).forEach((option) => {
                      counts[option] = 0;
                    });

                    parsedResponses.forEach((response) => {
                      const answer = response.data[question.id];

                      if (Array.isArray(answer)) {
                        answer.forEach((value) => {
                          const key = String(value);

                          if (counts[key] !== undefined) {
                            counts[key]++;
                          }
                        });
                      } else if (
                        answer !== undefined &&
                        answer !== null &&
                        counts[String(answer)] !== undefined
                      ) {
                        counts[String(answer)]++;
                      }
                    });

                    return (
                      <div
                        key={question.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <span className="text-xs font-semibold text-slate-800">
                            {index + 1}. {question.title}
                          </span>

                          <span className="text-[11px] font-mono text-slate-400 uppercase">
                            {question.type.replace("_", " ")}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {(question.options || []).map((option) => {
                            const count = counts[option] || 0;

                            const percent =
                              responses.length > 0
                                ? Math.round((count / responses.length) * 100)
                                : 0;

                            return (
                              <div
                                key={option}
                                className="p-3 rounded-lg bg-slate-50 border border-slate-100"
                              >
                                <div className="flex justify-between text-xs font-medium text-slate-800 mb-1.5">
                                  <span>{option}</span>

                                  <span className="text-indigo-600 font-semibold font-mono">
                                    {count} {count === 1 ? "vote" : "votes"} (
                                    {percent}
                                    %)
                                  </span>
                                </div>

                                <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${percent}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  const textAnswers = parsedResponses
                    .map((response) => response.data[question.id])
                    .filter(
                      (value) =>
                        value !== undefined && value !== null && value !== "",
                    )
                    .map((value) =>
                      Array.isArray(value)
                        ? value.join(", ")
                        : typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value),
                    );

                  const completionRate =
                    responses.length > 0
                      ? Math.round(
                          (textAnswers.length / responses.length) * 100,
                        )
                      : 0;

                  const uniqueAnswers = new Set(textAnswers).size;

                  return (
                    <div
                      key={question.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <span className="text-xs font-semibold text-slate-800">
                          {index + 1}. {question.title}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400 uppercase">
                          {question.type.replace("_", " ")}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
                          <div className="text-[10px] uppercase font-semibold text-slate-400">
                            Total Entries
                          </div>

                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {textAnswers.length}
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
                          <div className="text-[10px] uppercase font-semibold text-slate-400">
                            Unique Answers
                          </div>

                          <div className="text-sm font-bold text-indigo-600 mt-0.5">
                            {uniqueAnswers}
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
                          <div className="text-[10px] uppercase font-semibold text-slate-400">
                            Response Rate
                          </div>

                          <div className="text-sm font-bold text-emerald-600 mt-0.5">
                            {completionRate}%
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {textAnswers.length === 0 ? (
                          <div className="text-xs text-slate-400 italic">
                            No responses recorded for this question.
                          </div>
                        ) : (
                          textAnswers.map((text, responseIndex) => (
                            <div
                              key={`${question.id}-${responseIndex}`}
                              className="text-xs text-slate-700 bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex items-center justify-between gap-3"
                            >
                              <span className="break-words">{text}</span>

                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                #{responseIndex + 1}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Visual Theme */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">
                  Respondent Color Theme
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Choose the brand color used for accents, top border strips,
                  radio buttons, and submit buttons on the public respondent
                  view.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {THEME_OPTIONS.map((th) => {
                  const isSelected = (form.theme || "indigo") === th.id;

                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...form,
                          theme: th.id,
                        };

                        setForm(updated);
                        void saveForm(questions, updated);
                      }}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer text-left ${
                        isSelected
                          ? "border-slate-800 bg-slate-50 ring-2 ring-slate-800/10 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-slate-200 shrink-0"
                        style={{
                          backgroundColor: th.color,
                        }}
                      />

                      <span className="flex-1">
                        <span className="block text-sm font-medium text-slate-700">
                          {th.name}
                        </span>
                      </span>

                      {isSelected && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submission Limits & Deadlines */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">
                  Submission Limits & Deadlines
                </h3>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-800">
                    Accept Submissions
                  </h4>

                  <p className="text-xs text-slate-400">
                    Master switch to open or close this form.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => {
                    const updated = {
                      ...form,
                      published: e.target.checked,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Maximum Submissions
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="No limit"
                  value={
                    form.maxSubmissions === null ||
                    form.maxSubmissions === undefined
                      ? ""
                      : form.maxSubmissions
                  }
                  onChange={(e) => {
                    const val =
                      e.target.value === ""
                        ? null
                        : Math.max(0, parseInt(e.target.value, 10) || 0);

                    const updated = {
                      ...form,
                      maxSubmissions: val,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-600 transition"
                />

                <p className="text-[11px] text-slate-400 mt-1">
                  Leave empty to allow unlimited submissions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Submission Deadline
                </label>

                <input
                  type="datetime-local"
                  value={
                    form.deadline
                      ? new Date(form.deadline).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null;

                    const updated = {
                      ...form,
                      deadline: val,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-600 transition"
                />

                <p className="text-[11px] text-slate-400 mt-1">
                  Leave empty if the form should remain open indefinitely.
                </p>
              </div>
            </div>

            {/* Post-Submission Experience */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">
                  Post-Submission Experience
                </h3>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Custom Thank You Message
                </label>

                <textarea
                  rows={4}
                  placeholder="Thank you for submitting your response!"
                  value={form.customMessage || ""}
                  onChange={(e) => {
                    const updated = {
                      ...form,
                      customMessage: e.target.value,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-600 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Redirect URL (Optional)
                </label>

                <input
                  type="url"
                  placeholder="https://yourwebsite.com/thank-you"
                  value={form.redirectUrl || ""}
                  onChange={(e) => {
                    const updated = {
                      ...form,
                      redirectUrl: e.target.value,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-600 transition"
                />

                <p className="text-[11px] text-slate-400 mt-1">
                  If set, respondents will automatically be forwarded to this
                  link after submitting.
                </p>
              </div>
            </div>

            {/* Collect Email Setting */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-800">
                    Collect Email Addresses
                  </h4>

                  <p className="text-xs text-slate-400">
                    Require respondents to provide their email address before
                    answering.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.collectEmail || false}
                  onChange={(e) => {
                    const updated = {
                      ...form,
                      collectEmail: e.target.checked,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>
            </div>

            {/* Notification Alerts */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">
                Notification Alerts
              </h3>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-800">
                    Email Alerts
                  </h4>

                  <p className="text-xs text-slate-400">
                    Receive an email alert each time a response is recorded.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.notifyEmail || false}
                  onChange={(e) => {
                    const updated = {
                      ...form,
                      notifyEmail: e.target.checked,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        formId={formId}
        formTitle={form.title}
      />
    </div>
  );
}
