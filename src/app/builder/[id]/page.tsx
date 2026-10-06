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
  Share2,
  Bot,
  BrainCircuit,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
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
  { id: "indigo", name: "Royal Indigo", color: "#4f46e5" },
  { id: "emerald", name: "Emerald Forest", color: "#059669" },
  { id: "violet", name: "Deep Violet", color: "#7c3aed" },
  { id: "amber", name: "Warm Amber", color: "#d97706" },
  { id: "rose", name: "Crimson Rose", color: "#e11d48" },
  { id: "slate", name: "Minimal Slate", color: "#1e293b" },
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

interface ParsedResponse extends RawResponse {
  data: AnswersMap;
}

interface AiInsightsData {
  summary: string;
  sentiment: "Positive" | "Neutral" | "Negative" | "Mixed";
  keyFindings: string[];
  recommendations: string[];
}

type AnswerValue =
  | string
  | string[]
  | number
  | boolean
  | Record<string, unknown>
  | null
  | undefined;

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

  const [aiInsights, setAiInsights] = useState<AiInsightsData | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

      if (!res.ok) {
        console.error("Failed to save form:", await res.text());
        return;
      }

      setSavedSuccess(true);

      window.setTimeout(() => {
        setSavedSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to save form:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublishStatus = async () => {
    if (!form) return;

    const updated: FormData = {
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

      const data: unknown = await res.json();

      setResponses(
        Array.isArray(data)
          ? data.filter(
              (item): item is RawResponse =>
                typeof item === "object" &&
                item !== null &&
                "id" in item &&
                "answers" in item &&
                "createdAt" in item,
            )
          : [],
      );
    } catch (error) {
      console.error("Failed to fetch responses:", error);
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  const generateAiInsights = async () => {
    setGeneratingAi(true);
    setAiError(null);

    try {
      const res = await fetch(`/api/forms/${formId}/ai-insights`, {
        method: "POST",
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to generate AI insights.";

        setAiError(message);
        return;
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "insights" in data &&
        typeof data.insights === "object" &&
        data.insights !== null
      ) {
        const insights = data.insights as AiInsightsData;
        setAiInsights(insights);
      } else {
        setAiError("The AI response was invalid.");
      }
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "Failed to communicate with AI synthesizer.",
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadForm = async () => {
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
          const parsed: unknown = JSON.parse(data.fields || "[]");

          setQuestions(
            Array.isArray(parsed) ? (parsed as QuestionField[]) : [],
          );
        } catch {
          setQuestions([]);
        }
      } catch (error) {
        console.error("Failed to load form:", error);

        if (!ignore) {
          router.push("/");
        }
      }
    };

    void loadForm();

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

        const data: unknown = await res.json();

        if (!ignore) {
          setResponses(
            Array.isArray(data)
              ? data.filter(
                  (item): item is RawResponse =>
                    typeof item === "object" &&
                    item !== null &&
                    "id" in item &&
                    "answers" in item &&
                    "createdAt" in item,
                )
              : [],
          );
        }
      } catch (error) {
        console.error("Failed to load responses:", error);

        if (!ignore) {
          setResponses([]);
        }
      } finally {
        if (!ignore) {
          setLoadingResponses(false);
        }
      }
    };

    void loadResponses();

    return () => {
      ignore = true;
    };
  }, [activeTab, formId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex(
      (question) => question.id === active.id,
    );

    const newIndex = questions.findIndex((question) => question.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

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

    const escapeCSV = (value: unknown): string => {
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
        const parsed: unknown =
          typeof response.answers === "string"
            ? JSON.parse(response.answers)
            : response.answers;

        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          answersMap = parsed as AnswersMap;
        }
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const parsedResponses: ParsedResponse[] = responses.map((response) => {
    try {
      const parsed: unknown =
        typeof response.answers === "string"
          ? JSON.parse(response.answers)
          : response.answers;

      return {
        ...response,
        data:
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as AnswersMap)
            : {},
      };
    } catch {
      return {
        ...response,
        data: {},
      };
    }
  });

  const responseCount =
    responses.length > 0 ? responses.length : (form._count?.responses ?? 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition shrink-0 cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0 flex-1">
              <input
                value={form.title}
                onChange={(event) => {
                  const updated: FormData = {
                    ...form,
                    title: event.target.value,
                  };

                  setForm(updated);
                  void saveForm(questions, updated);
                }}
                className="font-bold text-white text-sm sm:text-base bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none pb-0.5 w-44 sm:w-72 transition truncate"
              />
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              {isSaving ? (
                <span className="text-slate-500">Saving...</span>
              ) : savedSuccess ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </span>
              ) : (
                <span className="text-slate-500">All changes saved</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              type="button"
              onClick={() => void togglePublishStatus()}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition cursor-pointer ${
                form.published
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {form.published ? "Active (Live)" : "Draft Mode"}
            </button>

            <a
              href={`/f/${formId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Form
            </a>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("builder")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === "builder"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Question Architecture
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("responses")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === "responses"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Responses ({responseCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === "settings"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Rules & Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* BUILDER TAB */}
        {activeTab === "builder" && (
          <div className="space-y-5">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-xl">
              <input
                value={form.title}
                onChange={(event) => {
                  const updated: FormData = {
                    ...form,
                    title: event.target.value,
                  };

                  setForm(updated);
                  void saveForm(questions, updated);
                }}
                placeholder="Form Title"
                className="w-full text-2xl font-extrabold text-white border-b border-transparent hover:border-slate-800 focus:border-indigo-500 bg-transparent outline-none pb-1 transition mb-3"
              />

              <textarea
                value={form.description || ""}
                onChange={(event) => {
                  const updated: FormData = {
                    ...form,
                    description: event.target.value,
                  };

                  setForm(updated);
                  void saveForm(questions, updated);
                }}
                placeholder="Form description or instructions for respondents..."
                rows={2}
                className="w-full text-xs text-slate-400 border-b border-transparent hover:border-slate-800 focus:border-indigo-500 bg-transparent outline-none transition resize-none"
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
              className="w-full py-4 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/80 rounded-2xl text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              Add Question Card
            </button>
          </div>
        )}

        {/* RESPONSES TAB */}
        {activeTab === "responses" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-xl">
              <div>
                <h3 className="text-base font-bold text-white">
                  {responses.length}{" "}
                  {responses.length === 1 ? "Response" : "Responses"} Recorded
                </h3>

                <p className="text-xs text-slate-400 mt-0.5">
                  Live submission feed and synthesis
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={generateAiInsights}
                  disabled={generatingAi || responses.length === 0}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Bot
                    className={`w-4 h-4 ${generatingAi ? "animate-spin" : ""}`}
                  />

                  <span>
                    {generatingAi
                      ? "Synthesizing with Gemini..."
                      : "AI Executive Summary"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void fetchResponses()}
                  disabled={loadingResponses}
                  title="Refresh responses"
                  className="p-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      loadingResponses ? "animate-spin" : ""
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={exportToCSV}
                  disabled={responses.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {aiError && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{aiError}</span>
              </div>
            )}

            {aiInsights && (
              <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-slate-900/90 p-6 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-600/30 border border-purple-500/30 text-purple-300 flex items-center justify-center">
                      <BrainCircuit className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm">
                        AI Executive Synthesis
                      </h4>

                      <p className="text-[11px] text-slate-400">
                        Synthesized across {responses.length} responses with
                        Gemini
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      aiInsights.sentiment === "Positive"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : aiInsights.sentiment === "Negative"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : aiInsights.sentiment === "Mixed"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {aiInsights.sentiment} Sentiment
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-200 mb-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                  {aiInsights.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 mb-2.5">
                      <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                      <span>Consensus & Trends</span>
                    </div>

                    <ul className="space-y-2">
                      {aiInsights.keyFindings.map((finding, index) => (
                        <li
                          key={`${finding}-${index}`}
                          className="text-xs text-slate-400 flex items-start gap-2"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 mb-2.5">
                      <Lightbulb className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Actionable Next Steps</span>
                    </div>

                    <ul className="space-y-2">
                      {aiInsights.recommendations.map(
                        (recommendation, index) => (
                          <li
                            key={`${recommendation}-${index}`}
                            className="text-xs text-slate-400 flex items-start gap-2"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            <span>{recommendation}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {loadingResponses ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                Fetching response records...
              </div>
            ) : responses.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center">
                <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />

                <h4 className="font-semibold text-white text-sm">
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

                    const totalVotes = Object.values(counts).reduce(
                      (sum, count) => sum + count,
                      0,
                    );

                    const paletteColors = [
                      "#6366f1",
                      "#8b5cf6",
                      "#ec4899",
                      "#10b981",
                      "#f59e0b",
                      "#06b6d4",
                    ];

                    let cumulativeAngle = 0;

                    const segments = (question.options || []).map((opt, i) => {
                      const count = counts[opt] || 0;

                      const percent =
                        totalVotes > 0 ? (count / totalVotes) * 100 : 0;

                      const dashLength = percent * 2.512;

                      const dashArray = `${dashLength} ${251.2 - dashLength}`;

                      const dashOffset = -cumulativeAngle * 2.512;

                      cumulativeAngle += percent;

                      return {
                        opt,
                        count,
                        percent: Math.round(percent),
                        color: paletteColors[i % paletteColors.length],
                        dashArray,
                        dashOffset,
                      };
                    });

                    return (
                      <div
                        key={question.id}
                        className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5 gap-3">
                          <span className="text-sm font-semibold text-white">
                            {index + 1}. {question.title}
                          </span>

                          <span className="text-[10px] font-mono text-indigo-400 uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 whitespace-nowrap">
                            {question.type.replace("_", " ")}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                          <div className="flex flex-col items-center justify-center p-3 relative">
                            <div className="relative w-36 h-36">
                              <svg
                                className="w-full h-full -rotate-90"
                                viewBox="0 0 100 100"
                              >
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  className="text-slate-800"
                                  strokeWidth="12"
                                  stroke="currentColor"
                                  fill="transparent"
                                />

                                {totalVotes > 0 &&
                                  segments.map((seg) => (
                                    <circle
                                      key={seg.opt}
                                      cx="50"
                                      cy="50"
                                      r="40"
                                      stroke={seg.color}
                                      strokeWidth="12"
                                      strokeDasharray={seg.dashArray}
                                      strokeDashoffset={seg.dashOffset}
                                      fill="transparent"
                                      className="transition-all duration-700"
                                    />
                                  ))}
                              </svg>

                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-xl font-extrabold text-white font-mono">
                                  {totalVotes}
                                </span>

                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                                  Votes
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-3">
                            {segments.map((seg) => (
                              <div
                                key={seg.opt}
                                className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                              >
                                <div className="flex items-center justify-between text-xs mb-1.5 gap-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full shrink-0"
                                      style={{
                                        backgroundColor: seg.color,
                                      }}
                                    />

                                    <span className="font-medium text-slate-200 truncate">
                                      {seg.opt}
                                    </span>
                                  </div>

                                  <span className="font-mono font-semibold text-slate-300 shrink-0">
                                    {seg.count} ({seg.percent}%)
                                  </span>
                                </div>

                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${seg.percent}%`,
                                      backgroundColor: seg.color,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
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

                  return (
                    <div
                      key={question.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-3">
                        <span className="text-xs font-semibold text-white">
                          {index + 1}. {question.title}
                        </span>

                        <span className="text-[10px] font-mono text-indigo-400 uppercase whitespace-nowrap">
                          {question.type.replace("_", " ")}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                          <div className="text-[10px] uppercase font-semibold text-slate-500">
                            Total Entries
                          </div>

                          <div className="text-sm font-bold text-white mt-0.5">
                            {textAnswers.length}
                          </div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                          <div className="text-[10px] uppercase font-semibold text-slate-500">
                            Unique Answers
                          </div>

                          <div className="text-sm font-bold text-indigo-400 mt-0.5">
                            {new Set(textAnswers).size}
                          </div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                          <div className="text-[10px] uppercase font-semibold text-slate-500">
                            Response Rate
                          </div>

                          <div className="text-sm font-bold text-emerald-400 mt-0.5">
                            {completionRate}%
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {textAnswers.length === 0 ? (
                          <div className="text-xs text-slate-500 italic">
                            No responses recorded for this question.
                          </div>
                        ) : (
                          textAnswers.map((text, responseIndex) => (
                            <div
                              key={`${question.id}-${responseIndex}`}
                              className="text-xs text-slate-300 bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between gap-3"
                            >
                              <span className="break-words">{text}</span>

                              <span className="text-[10px] text-slate-500 font-mono shrink-0">
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

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Visual Theme */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <div>
                <h3 className="font-bold text-white text-base">
                  Respondent Color Theme
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Choose the brand accent color used on public respondent views.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = (form.theme || "indigo") === theme.id;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        const updated: FormData = {
                          ...form,
                          theme: theme.id,
                        };

                        setForm(updated);
                        void saveForm(questions, updated);
                      }}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition cursor-pointer text-left ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 shadow-sm"
                          : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-slate-700 shrink-0"
                        style={{
                          backgroundColor: theme.color,
                        }}
                      />

                      <span className="flex-1 text-xs font-semibold text-slate-200">
                        {theme.name}
                      </span>

                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submission Limits & Deadlines */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-5">
              <h3 className="font-bold text-white text-base">
                Submission Limits & Deadlines
              </h3>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    Accept Submissions
                  </h4>

                  <p className="text-[11px] text-slate-400">
                    Master switch to open or close this form.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => {
                    const updated: FormData = {
                      ...form,
                      published: event.target.checked,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>

              <div>
                <label
                  htmlFor="max-submissions"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Maximum Submissions
                </label>

                <input
                  id="max-submissions"
                  type="number"
                  min="0"
                  placeholder="No limit"
                  value={
                    form.maxSubmissions === null ||
                    form.maxSubmissions === undefined
                      ? ""
                      : form.maxSubmissions
                  }
                  onChange={(event) => {
                    const val =
                      event.target.value === ""
                        ? null
                        : Math.max(0, parseInt(event.target.value, 10) || 0);

                    const updated: FormData = {
                      ...form,
                      maxSubmissions: val,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition"
                />

                <p className="text-[11px] text-slate-500 mt-1">
                  Leave empty to allow unlimited submissions.
                </p>
              </div>

              <div>
                <label
                  htmlFor="submission-deadline"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Submission Deadline
                </label>

                <input
                  id="submission-deadline"
                  type="datetime-local"
                  value={
                    form.deadline
                      ? new Date(form.deadline).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(event) => {
                    const val = event.target.value
                      ? new Date(event.target.value).toISOString()
                      : null;

                    const updated: FormData = {
                      ...form,
                      deadline: val,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Post-Submission Experience */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-5">
              <h3 className="font-bold text-white text-base">
                Post-Submission Experience
              </h3>

              <div>
                <label
                  htmlFor="custom-message"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Custom Thank You Message
                </label>

                <textarea
                  id="custom-message"
                  rows={3}
                  placeholder="Thank you for submitting your response!"
                  value={form.customMessage || ""}
                  onChange={(event) => {
                    const updated: FormData = {
                      ...form,
                      customMessage: event.target.value,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="redirect-url"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Redirect URL (Optional)
                </label>

                <input
                  id="redirect-url"
                  type="url"
                  placeholder="https://yourwebsite.com/thank-you"
                  value={form.redirectUrl || ""}
                  onChange={(event) => {
                    const updated: FormData = {
                      ...form,
                      redirectUrl: event.target.value,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Collect Email & Alerts */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    Collect Email Addresses
                  </h4>

                  <p className="text-[11px] text-slate-400">
                    Require respondents to provide an email before answering.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.collectEmail || false}
                  onChange={(event) => {
                    const updated: FormData = {
                      ...form,
                      collectEmail: event.target.checked,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>

              <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    Email Submission Alerts
                  </h4>

                  <p className="text-[11px] text-slate-400">
                    Receive an email each time a response is submitted.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.notifyEmail || false}
                  onChange={(event) => {
                    const updated: FormData = {
                      ...form,
                      notifyEmail: event.target.checked,
                    };

                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
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
