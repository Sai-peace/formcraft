"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import PreviewDrawer from "@/components/PreviewDrawer";
import { parseOauMatric } from "@/lib/departments";
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
  Eye,
  GraduationCap,
  Printer,
  Trash2,
  Copy,
  Code2,
} from "lucide-react";
import ShareModal from "@/components/ShareModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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

type BuilderQuestionType = QuestionField["type"] | "matric_number";

type BuilderQuestion = Omit<QuestionField, "type"> & {
  type: BuilderQuestionType;
};

interface FormData {
  id: string;
  title: string;
  description?: string | null;
  fields: string;
  published: boolean;
  theme?: string | null;
  collectEmail?: boolean;
  limitOnePerStudent?: boolean;
  webhookUrl?: string | null;
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
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const [form, setForm] = useState<FormData | null>(null);
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
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

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const saveForm = async (
    updatedQuestions: BuilderQuestion[] = questions,
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
          limitOnePerStudent: updatedMeta.limitOnePerStudent ?? false,
          webhookUrl: updatedMeta.webhookUrl ?? null,
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
        window.setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save form:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublishStatus = async () => {
    if (!form) return;
    const updated = { ...form, published: !form.published };
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
      setResponses(Array.isArray(data) ? (data as RawResponse[]) : []);
    } catch (error) {
      console.error("Failed to fetch responses:", error);
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  const deleteSingleResponse = async (responseId: string) => {
    if (!confirm("Delete this submission record?")) return;
    try {
      const res = await fetch(`/api/forms/${formId}/responses/${responseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setResponses((prev) => prev.filter((r) => r.id !== responseId));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const clearAllResponses = async () => {
    if (
      !confirm(
        "Are you sure you want to permanently delete ALL recorded responses? This cannot be undone.",
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/forms/${formId}/responses`, {
        method: "DELETE",
      });
      if (res.ok) {
        setResponses([]);
        setAiInsights(null);
      }
    } catch (err) {
      console.error("Clear all failed:", err);
    }
  };

  const generateAiInsights = async () => {
    setGeneratingAi(true);
    setAiError(null);

    try {
      const res = await fetch(`/api/forms/${formId}/ai-insights`, {
        method: "POST",
      });

      const rawText = await res.text();
      let data: unknown = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("Server took too long to respond. Please try again.");
      }

      const parsedData =
        typeof data === "object" && data !== null
          ? (data as { error?: string; insights?: AiInsightsData })
          : {};

      if (!res.ok) {
        setAiError(parsedData.error || "Failed to generate AI insights.");
        return;
      }

      setAiInsights(parsedData.insights ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to communicate with AI synthesizer.";
      setAiError(message);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  useEffect(() => {
    let ignore = false;
    async function loadForm() {
      try {
        const res = await fetch(`/api/forms/${formId}`, { cache: "no-store" });
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
            Array.isArray(parsed) ? (parsed as BuilderQuestion[]) : [],
          );
        } catch {
          setQuestions([]);
        }
      } catch (error) {
        console.error("Failed to load form:", error);
      }
    }

    void loadForm();
    return () => {
      ignore = true;
    };
  }, [formId, router]);

  // Live Response Auto-Polling: every 15s when active on the responses tab
  useEffect(() => {
    if (activeTab !== "responses") return;
    const initialFetch = setTimeout(() => {
      void fetchResponses();
    }, 0);

    const interval = setInterval(() => {
      void fetchResponses();
    }, 15000);

    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [activeTab, formId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(questions, oldIndex, newIndex);
    setQuestions(reordered);
    void saveForm(reordered);
  };

  const addQuestion = (type: BuilderQuestionType = "multiple_choice") => {
    const newQuestion: BuilderQuestion = {
      id: `q-${Date.now()}`,
      title:
        type === "matric_number" ? "OAU Matric Number" : "Untitled Question",
      type,
      options: ["multiple_choice", "checkbox", "dropdown"].includes(type)
        ? ["Option 1"]
        : undefined,
      required: false,
    };
    const updated = [...questions, newQuestion];
    setQuestions(updated);
    void saveForm(updated);
  };

  const updateQuestion = (updatedQuestion: BuilderQuestion) => {
    const updated = questions.map((q) =>
      q.id === updatedQuestion.id ? updatedQuestion : q,
    );
    setQuestions(updated);
    void saveForm(updated);
  };

  const duplicateQuestion = (question: BuilderQuestion) => {
    const copy: BuilderQuestion = {
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
    const updated = questions.filter((q) => q.id !== id);
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
        const parsed =
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
        if (Array.isArray(value)) return escapeCSV(value.join(", "));
        if (value !== null && typeof value === "object")
          return escapeCSV(JSON.stringify(value));
        return escapeCSV(value ?? "");
      });

      return [
        escapeCSV(response.id),
        escapeCSV(new Date(response.createdAt).toLocaleString()),
        ...rowAnswers,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(form?.title || "form").replace(/[^a-z0-9]/gi, "_").toLowerCase()}_responses.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parsedResponses = useMemo(() => {
    return responses.map((response) => {
      try {
        const parsed =
          typeof response.answers === "string"
            ? JSON.parse(response.answers)
            : response.answers;
        return {
          ...response,
          data:
            parsed && typeof parsed === "object" && !Array.isArray(parsed)
              ? (parsed as AnswersMap)
              : ({} as AnswersMap),
        };
      } catch {
        return { ...response, data: {} as AnswersMap };
      }
    });
  }, [responses]);

  // Department Breakdown Calculation for Matric Number Fields
  const departmentBreakdown = useMemo(() => {
    const matricQuestion = questions.find((q) => q.type === "matric_number");
    if (!matricQuestion) return null;

    const counts: Record<string, number> = {};
    let totalMatrics = 0;

    parsedResponses.forEach((r) => {
      const val = r.data[matricQuestion.id];
      if (typeof val === "string" && val.trim().length > 0) {
        const parsed = parseOauMatric(val);
        const deptName = parsed ? parsed.department : "Unrecognized / Other";
        counts[deptName] = (counts[deptName] || 0) + 1;
        totalMatrics++;
      }
    });

    if (totalMatrics === 0) return null;

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / totalMatrics) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [questions, parsedResponses]);

  if (!form) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Loading workspace...
          </p>
        </div>
      </main>
    );
  }

  const responseCount =
    responses.length > 0 ? responses.length : (form._count?.responses ?? 0);

  const googleAppsScriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Headers setup if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Response ID", "Answers (JSON)"]);
    }
    
    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.responseId || "",
      JSON.stringify(data.answers || {})
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="min-h-screen bg-slate-950 print:bg-white text-slate-100 print:text-slate-950 antialiased selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 pointer-events-none z-0 print:hidden">
        <div className="absolute -top-32 left-1/3 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      <header className="sticky top-0 z-40 bg-slate-900/70 border-b border-slate-800/80 backdrop-blur-xl print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition shrink-0 cursor-pointer"
                title="Return to Dashboard"
              >
                <ArrowLeft size={18} />
              </button>

              <input
                type="text"
                value={form.title}
                onChange={(event) => {
                  const updated = { ...form, title: event.target.value };
                  setForm(updated);
                  void saveForm(questions, updated);
                }}
                className="font-bold text-white text-sm sm:text-base bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none pb-0.5 w-44 sm:w-72 transition truncate"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs text-slate-400">
                {isSaving ? (
                  "Saving..."
                ) : savedSuccess ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
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
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Share2 size={14} />
                Share
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

              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition cursor-pointer"
              >
                <Eye size={14} />
                <span>Preview</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("builder")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === "builder"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Edit3 size={13} />
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
              <BarChart3 size={13} />
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
              <Sliders size={13} />
              Rules & Settings
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6 print:max-w-full print:p-0">
        {activeTab === "builder" && (
          <div className="space-y-5">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
              <input
                type="text"
                value={form.title}
                onChange={(event) => {
                  const updated = { ...form, title: event.target.value };
                  setForm(updated);
                  void saveForm(questions, updated);
                }}
                placeholder="Form Title"
                className="w-full text-2xl font-extrabold text-white border-b border-transparent hover:border-slate-800 focus:border-indigo-500 bg-transparent outline-none pb-1 transition mb-3"
              />

              <textarea
                value={form.description || ""}
                onChange={(event) => {
                  const updated = { ...form, description: event.target.value };
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
                      question={question as QuestionField}
                      onUpdate={
                        updateQuestion as (question: QuestionField) => void
                      }
                      onDelete={deleteQuestion}
                      onDuplicate={
                        duplicateQuestion as (question: QuestionField) => void
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
              <button
                type="button"
                onClick={() => addQuestion("multiple_choice")}
                className="py-4 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/80 rounded-2xl text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                Add Question Card
              </button>

              <button
                type="button"
                onClick={() => addQuestion("matric_number")}
                className="py-4 border border-indigo-500/30 hover:border-indigo-500 bg-indigo-950/20 hover:bg-indigo-950/40 rounded-2xl text-indigo-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                Add OAU Matric Number Field
              </button>
            </div>
          </div>
        )}

        {activeTab === "responses" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-xl print:border-slate-300 print:bg-white print:text-slate-950">
              <div>
                <h3 className="text-base font-bold text-white print:text-slate-950">
                  {responses.length}{" "}
                  {responses.length === 1 ? "Response" : "Responses"} Recorded
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse print:hidden" />
                  <p className="text-xs text-slate-400 print:text-slate-600">
                    Auto-updating live sync
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap print:hidden">
                <button
                  type="button"
                  onClick={() => void generateAiInsights()}
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
                  onClick={handlePrintReport}
                  disabled={responses.length === 0}
                  className="p-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Print or Save PDF Report"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => void fetchResponses()}
                  disabled={loadingResponses}
                  title="Refresh responses"
                  className="p-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingResponses ? "animate-spin" : ""}`}
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

                {responses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void clearAllResponses()}
                    className="p-2 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-medium transition cursor-pointer"
                    title="Purge all responses"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* OAU Department Breakdown Card */}
            {departmentBreakdown && departmentBreakdown.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl print:border-slate-300 print:bg-white print:text-slate-950">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800 print:border-slate-200 pb-3">
                  <GraduationCap className="h-4 w-4 text-indigo-400 print:text-indigo-700" />
                  <h4 className="text-sm font-semibold text-white print:text-slate-950">
                    OAU Department Distribution
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {departmentBreakdown.map((dept) => (
                    <div
                      key={dept.name}
                      className="p-3 rounded-2xl bg-slate-950/50 print:bg-slate-50 border border-slate-800/80 print:border-slate-200 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-medium text-slate-200 print:text-slate-800 truncate">
                          {dept.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {dept.count} students
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold text-indigo-400 print:text-indigo-700">
                        {dept.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiError && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs print:hidden">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{aiError}</span>
              </div>
            )}

            {aiInsights && (
              <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-slate-900/90 p-6 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden print:border-slate-300 print:bg-white print:text-slate-950 print:shadow-none">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-600/30 border border-purple-500/30 text-purple-300 flex items-center justify-center print:border-slate-300 print:text-purple-700">
                      <BrainCircuit className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="font-bold text-white print:text-slate-950 text-sm">
                        AI Executive Synthesis
                      </h4>
                      <p className="text-[11px] text-slate-400 print:text-slate-600">
                        Synthesized across {responses.length} responses with
                        Gemini
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      aiInsights.sentiment === "Positive"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 print:text-emerald-700"
                        : aiInsights.sentiment === "Negative"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20 print:text-rose-700"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20 print:text-amber-700"
                    }`}
                  >
                    {aiInsights.sentiment} Sentiment
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-200 print:text-slate-800 mb-5 bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-2xl p-4">
                  {aiInsights.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 print:text-purple-700 mb-2.5">
                      <TrendingUp className="h-3.5 w-3.5 text-purple-400 print:text-purple-700" />
                      <span>Consensus & Trends</span>
                    </div>

                    <ul className="space-y-2">
                      {aiInsights.keyFindings.map((finding, fIdx) => (
                        <li
                          key={fIdx}
                          className="text-xs text-slate-400 print:text-slate-700 flex items-start gap-2"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 print:bg-purple-700 mt-1.5 shrink-0" />
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/50 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 print:text-indigo-700 mb-2.5">
                      <Lightbulb className="h-3.5 w-3.5 text-indigo-400 print:text-indigo-700" />
                      <span>Actionable Next Steps</span>
                    </div>

                    <ul className="space-y-2">
                      {aiInsights.recommendations.map((rec, rIdx) => (
                        <li
                          key={rIdx}
                          className="text-xs text-slate-400 print:text-slate-700 flex items-start gap-2"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 print:bg-indigo-700 mt-1.5 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {loadingResponses && responses.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs print:hidden">
                Fetching response records...
              </div>
            ) : responses.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center print:border-slate-300 print:text-slate-950">
                <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="font-semibold text-white print:text-slate-950 text-sm">
                  Waiting for responses
                </h4>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
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
                    (question.options || []).forEach(
                      (opt) => (counts[opt] = 0),
                    );

                    parsedResponses.forEach((response) => {
                      const answer = response.data[question.id];
                      if (Array.isArray(answer)) {
                        answer.forEach((value) => {
                          const key = String(value);
                          if (counts[key] !== undefined) counts[key]++;
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
                      (a, b) => a + b,
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
                      const dashArray = `${percent * 2.512} ${251.2 - percent * 2.512}`;
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
                        className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm print:border-slate-300 print:bg-white print:break-inside-avoid"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-200 pb-3 mb-5">
                          <span className="text-sm font-semibold text-white print:text-slate-950">
                            {index + 1}. {question.title}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-400 uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 print:border-slate-300 print:text-indigo-700">
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
                                  className="text-slate-800 print:text-slate-200"
                                  strokeWidth="12"
                                  stroke="currentColor"
                                  fill="transparent"
                                />
                                {totalVotes > 0 &&
                                  segments.map((seg, sIdx) => (
                                    <circle
                                      key={sIdx}
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
                                <span className="text-xl font-extrabold text-white print:text-slate-950 font-mono">
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
                                className="p-3 rounded-2xl bg-slate-950/60 print:bg-slate-50 border border-slate-800/80 print:border-slate-200"
                              >
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: seg.color }}
                                    />
                                    <span className="font-medium text-slate-200 print:text-slate-800">
                                      {seg.opt}
                                    </span>
                                  </div>
                                  <span className="font-mono font-semibold text-slate-300 print:text-slate-700">
                                    {seg.count} ({seg.percent}%)
                                  </span>
                                </div>

                                <div className="w-full h-2 bg-slate-800 print:bg-slate-200 rounded-full overflow-hidden">
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

                  // Textual responses with individual deletion
                  const textRecords = parsedResponses
                    .map((r) => ({
                      id: r.id,
                      val: r.data[question.id],
                      createdAt: r.createdAt,
                    }))
                    .filter(
                      (rec) =>
                        rec.val !== undefined &&
                        rec.val !== null &&
                        rec.val !== "",
                    );

                  return (
                    <div
                      key={question.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm print:border-slate-300 print:bg-white print:break-inside-avoid"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-200 pb-3 mb-4">
                        <span className="text-xs font-semibold text-white print:text-slate-950">
                          {index + 1}. {question.title}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-400 uppercase print:text-indigo-700">
                          {question.type.replace("_", " ")}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-xl p-2.5 text-center">
                          <div className="text-[10px] uppercase font-semibold text-slate-500">
                            Total Entries
                          </div>
                          <div className="text-sm font-bold text-white print:text-slate-950 mt-0.5">
                            {textRecords.length}
                          </div>
                        </div>

                        <div className="bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-xl p-2.5 text-center">
                          <div className="text-[10px] uppercase font-semibold text-slate-500">
                            Unique Answers
                          </div>
                          <div className="text-sm font-bold text-indigo-400 print:text-indigo-700 mt-0.5">
                            {
                              new Set(textRecords.map((r) => String(r.val)))
                                .size
                            }
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {textRecords.length === 0 ? (
                          <div className="text-xs text-slate-500 italic">
                            No responses recorded for this question.
                          </div>
                        ) : (
                          textRecords.map((item, recIdx) => (
                            <div
                              key={item.id}
                              className="text-xs text-slate-300 print:text-slate-800 bg-slate-950/50 print:bg-slate-50 border border-slate-800/80 print:border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3"
                            >
                              <span className="break-words flex-1">
                                {typeof item.val === "object"
                                  ? JSON.stringify(item.val)
                                  : String(item.val)}
                              </span>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-slate-500 font-mono">
                                  #{recIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void deleteSingleResponse(item.id)
                                  }
                                  className="text-slate-600 hover:text-rose-400 p-1 transition cursor-pointer print:hidden"
                                  title="Delete response"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
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
                {THEME_OPTIONS.map((th) => {
                  const isSelected = (form.theme || "indigo") === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        const updated = { ...form, theme: th.id };
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
                        style={{ backgroundColor: th.color }}
                      />
                      <span className="flex-1 text-xs font-semibold text-slate-200">
                        {th.name}
                      </span>
                      {isSelected && (
                        <span className="text-indigo-400 text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

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
                  onChange={(e) => {
                    const updated = { ...form, published: e.target.checked };
                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Maximum Submissions
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="No limit"
                  value={form.maxSubmissions ?? ""}
                  onChange={(e) => {
                    const val =
                      e.target.value === ""
                        ? null
                        : Math.max(0, parseInt(e.target.value, 10) || 0);
                    const updated = { ...form, maxSubmissions: val };
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
                <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    const updated = { ...form, deadline: val };
                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <h3 className="font-bold text-white text-base">
                Campus Security & Anti-Duplicate
              </h3>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    Require Email Identification
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Require respondents to enter their @student.oauife.edu.ng
                    address.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.collectEmail || false}
                  onChange={(e) => {
                    const updated = { ...form, collectEmail: e.target.checked };
                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>

              <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    Strict: One Response Per Student (Email & Matric)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Automatically rejects duplicate submissions sharing the same
                    student email OR matric number.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.limitOnePerStudent || false}
                  onChange={(e) => {
                    const updated = {
                      ...form,
                      limitOnePerStudent: e.target.checked,
                      collectEmail: e.target.checked ? true : form.collectEmail,
                    };
                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">
                    Live Webhook & Google Sheets Dispatch
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Forward submissions instantly to Google Sheets or Make.com
                    webhooks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScriptModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
                >
                  <Code2 size={13} />
                  <span>Google Apps Script</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Webhook Target URL
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/... or https://hook.eu1.make.com/..."
                  value={form.webhookUrl || ""}
                  onChange={(e) => {
                    const updated = { ...form, webhookUrl: e.target.value };
                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-5">
              <h3 className="font-bold text-white text-base">
                Post-Submission Experience
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Custom Thank You Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Thank you for submitting your response!"
                  value={form.customMessage || ""}
                  onChange={(e) => {
                    const updated = { ...form, customMessage: e.target.value };
                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Redirect URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://yourwebsite.com/thank-you"
                  value={form.redirectUrl || ""}
                  onChange={(e) => {
                    const updated = { ...form, redirectUrl: e.target.value };
                    setForm(updated);
                    void saveForm(questions, updated);
                  }}
                  className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Google Apps Script Modal */}
      {showScriptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 size={16} className="text-indigo-400" />
                Google Apps Script Webhook
              </h3>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Open your Google Sheet &gt; <strong>Extensions</strong> &gt;{" "}
              <strong>Apps Script</strong>. Paste this code, click{" "}
              <strong>Deploy &gt; New deployment &gt; Web app</strong> (Access:
              Anyone), and paste the Web App URL into the Webhook Target URL
              input.
            </p>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-56">
              {googleAppsScriptCode}
            </pre>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(googleAppsScriptCode);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 2000);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                {copiedScript ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedScript ? "Copied!" : "Copy Script"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        formId={formId}
        formTitle={form.title}
      />

      <PreviewDrawer
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        formTitle={form.title}
        formDescription={form?.description ?? ""}
        questions={questions}
        formId={formId}
      />
    </div>
  );
}
