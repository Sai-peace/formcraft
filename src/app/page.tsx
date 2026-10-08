"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  BarChart3,
  Layers,
  Trash2,
  Copy,
  Check,
  Search,
  LogOut,
  ArrowRight,
  ChevronDown,
  Shield,
  Sparkles,
  Zap,
  School,
  BrainCircuit,
  TrendingUp,
  X,
  Wand2,
  AlertCircle,
  FileCheck2,
  GraduationCap,
  Sun,
  Moon,
} from "lucide-react";

interface FormItem {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  published: boolean;
  _count?: {
    responses: number;
  };
}

interface Template {
  title: string;
  desc: string;
  icon: typeof Plus;
  accent: string;
  badge: string;
}

interface FaqItem {
  q: string;
  a: string;
}

interface CreateFormResponse {
  id?: string;
}

interface AiGenerateResponse {
  formId?: string;
  error?: string;
}

const AI_SUGGESTED_PROMPTS = [
  "Create a 5-question SIWES industrial training evaluation survey for engineering students",
  "Design a semester course & lecturer review form with rating scales and qualitative feedback",
  "Build a departmental dues clearance verification questionnaire with matric number validation",
  "Draft an academic research survey assessing campus library and hostel study habits",
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [forms, setForms] = useState<FormItem[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Dashboard-specific interactive states
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const savedTheme = localStorage.getItem("oau_faas_theme");
    return savedTheme === "light" ? "light" : "dark";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("oau_faas_theme", nextTheme);
  };

  useEffect(() => {
    let ignore = false;

    async function loadForms() {
      if (!session) {
        setForms([]);
        setLoadingForms(false);
        return;
      }

      setLoadingForms(true);

      try {
        const res = await fetch("/api/forms");

        if (!res.ok) {
          throw new Error("Failed to fetch forms");
        }

        const data: FormItem[] = await res.json();

        if (!ignore) {
          setForms(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch forms:", error);

        if (!ignore) {
          setForms([]);
        }
      } finally {
        if (!ignore) {
          setLoadingForms(false);
        }
      }
    }

    void loadForms();

    return () => {
      ignore = true;
    };
  }, [session]);

  const createForm = async (templateName = "Blank Form") => {
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template: templateName,
        }),
      });

      if (!res.ok) {
        console.error("Failed to create form");
        return;
      }

      const newForm: CreateFormResponse = await res.json();

      if (newForm.id) {
        router.push(`/builder/${newForm.id}`);
      }
    } catch (error) {
      console.error("Error creating form:", error);
    }
  };

  const handleAiGenerate = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    if (!aiPrompt.trim() || isGeneratingAi) {
      return;
    }

    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const res = await fetch("/api/forms/ai-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
        }),
      });

      const data: AiGenerateResponse = await res.json();

      if (!res.ok) {
        setAiError(data.error || "Failed to generate form. Please try again.");
        return;
      }

      if (data.formId) {
        setIsAiModalOpen(false);
        setAiPrompt("");
        router.push(`/builder/${data.formId}`);
      } else {
        setAiError("Did not receive a valid form identifier.");
      }
    } catch (error) {
      console.error("AI Generation error:", error);

      setAiError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during generation.",
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const deleteForm = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this form?")) {
      return;
    }

    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Failed to delete form");
        return;
      }

      setForms((prev) => prev.filter((form) => form.id !== id));
    } catch (error) {
      console.error("Error deleting form:", error);
    }
  };

  const copyShareLink = async (id: string) => {
    const url = `${window.location.origin}/f/${id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);

      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const faqs: FaqItem[] = [
    {
      q: "What is OAU FaaS?",
      a: "OAU FaaS (Forms as a Service) is an institutional platform designed specifically for Obafemi Awolowo University. It provides standardized data gathering, academic reviews, course evaluations, and departmental administrative workflows backed by verified university accounts.",
    },
    {
      q: "Who is eligible to create and administer forms?",
      a: "Form creation is strictly authenticated for members of Obafemi Awolowo University. You must authenticate using your official university Google account (@student.oauife.edu.ng for students or @oauife.edu.ng for academic and administrative staff).",
    },
    {
      q: "Can respondents without university credentials submit answers?",
      a: "Yes. Public forms can be answered by anyone when general responses are permitted. However, when 'Require Official OAU Email' is toggled, submissions are cryptographically restricted to verified OAU campus addresses.",
    },
    {
      q: "How does the platform handle data export for research and departmental records?",
      a: "All response tables support direct CSV exportation, aggregate frequency charts, and automated executive summarization for departmental boards and academic theses.",
    },
  ];

  const templates: Template[] = [
    {
      title: "Blank Canvas",
      desc: "Architect custom questions and validation logic from the ground up.",
      icon: Plus,
      accent: "from-indigo-600 to-indigo-700",
      badge: "Standard",
    },
    {
      title: "Course & Lecturer Evaluation",
      desc: "Standardized linear scales and qualitative metrics for semester faculty reviews.",
      icon: School,
      accent: "from-blue-600 to-indigo-600",
      badge: "Academic",
    },
    {
      title: "Departmental Clearance Verification",
      desc: "Collect student matric numbers, dues receipts, and graduation credentials.",
      icon: FileCheck2,
      accent: "from-emerald-600 to-teal-600",
      badge: "Administrative",
    },
    {
      title: "FYP Supervisor Review",
      desc: "Structured milestone questionnaires for undergraduate dissertation progress.",
      icon: GraduationCap,
      accent: "from-amber-600 to-orange-600",
      badge: "Research",
    },
  ];

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold shadow-xl shadow-indigo-600/30">
            FaaS
          </div>

          <p className="mt-5 text-base font-semibold text-slate-200">
            Loading OAU Forms as a Service...
          </p>

          <div className="mx-auto mt-4 h-1.5 w-36 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // AUTHENTICATED DASHBOARD WORKSPACE VIEW
  // ==========================================
  if (session) {
    const isDark = theme === "dark";

    const filteredForms = forms.filter((form) =>
      form.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const totalSubmissions = forms.reduce(
      (total, form) => total + (form._count?.responses ?? 0),
      0,
    );

    return (
      <main
        className={`min-h-screen overflow-x-hidden transition-colors duration-200 ${
          isDark ? "bg-slate-950 text-white" : "bg-[#F5F2EB] text-[#1F2937]"
        }`}
      >
        {/* Navigation Header */}
        <header
          className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-200 ${
            isDark
              ? "border-slate-800/80 bg-slate-950/80"
              : "border-[#E3DDCF] bg-[#FAF8F3]/90"
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3.5 sm:px-6">
            {/* Logo with Exit Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsExitModalOpen(true)}
              className="group flex min-w-0 shrink-0 cursor-pointer items-center gap-3 transition-opacity hover:opacity-90"
              title="Return to Home"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-black tracking-wider text-white shadow-md shadow-indigo-600/30">
                FaaS
              </div>

              <div className="hidden min-w-0 text-left sm:block">
                <span
                  className={`block text-base font-bold tracking-tight ${
                    isDark ? "text-white" : "text-[#111827]"
                  }`}
                >
                  OAU FaaS
                </span>
                <span
                  className={`block text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    isDark ? "text-slate-400" : "text-stone-500"
                  }`}
                >
                  Forms as a Service
                </span>
              </div>
            </button>

            {/* Search Input */}
            <div className="relative ml-auto hidden min-w-0 max-w-md flex-1 md:block">
              <Search
                className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  isDark ? "text-slate-500" : "text-stone-400"
                }`}
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search questionnaires by title..."
                className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-xs outline-none transition ${
                  isDark
                    ? "border-slate-800 bg-slate-900/90 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-900 placeholder:text-stone-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20"
                }`}
              />
            </div>

            {/* Right Action Bar */}
            <div className="flex shrink-0 items-center gap-2.5">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title={
                  isDark
                    ? "Switch to Warm Light Mode"
                    : "Switch to Midnight Dark Mode"
                }
                className={`flex cursor-pointer items-center justify-center rounded-xl border p-2.5 transition ${
                  isDark
                    ? "border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800"
                    : "border-[#DFD7C7] bg-[#FFFFFF] text-indigo-900 hover:bg-[#EFEAE0]"
                }`}
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAiError(null);
                  setIsAiModalOpen(true);
                }}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold shadow-sm transition ${
                  isDark
                    ? "border-purple-500/30 bg-purple-600/10 text-purple-300 hover:bg-purple-600/20 hover:text-white"
                    : "border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100"
                }`}
              >
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">AI Architect</span>
                <span className="sm:hidden">AI</span>
              </button>

              <button
                type="button"
                onClick={() => void createForm()}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create New Form</span>
                <span className="sm:hidden">New</span>
              </button>

              <div
                className={`hidden h-7 w-px sm:block ${
                  isDark ? "bg-slate-800" : "bg-[#DFD7C7]"
                }`}
              />

              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                    isDark
                      ? "border-slate-700 bg-slate-800 text-slate-200"
                      : "border-stone-300 bg-stone-200 text-stone-800"
                  }`}
                >
                  {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}

              {/* Explicit Log Out Button */}
              <button
                type="button"
                onClick={() => void signOut()}
                className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  isDark
                    ? "border-slate-800 bg-slate-900 text-slate-300 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                    : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                }`}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Welcome Header */}
          <section className="mb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  Institutional Portal
                </p>

                <h1
                  className={`mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl ${
                    isDark ? "text-white" : "text-[#111827]"
                  }`}
                >
                  Welcome back,{" "}
                  <span
                    className={isDark ? "text-indigo-300" : "text-indigo-700"}
                  >
                    {session.user?.name?.split(" ")[0] || "Scholar"}
                  </span>
                </h1>

                <p
                  className={`mt-2 max-w-2xl text-sm leading-6 ${
                    isDark ? "text-slate-400" : "text-stone-600"
                  }`}
                >
                  Manage active forms, analyze response distributions, and
                  generate institutional questionnaires.
                </p>
              </div>

              <div
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 ${
                  isDark
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-emerald-600/30 bg-emerald-50 text-emerald-800"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold">
                  OAU Verified Access
                </span>
              </div>
            </div>
          </section>

          {/* Metric Stats */}
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div
              className={`rounded-2xl border p-5 transition ${
                isDark
                  ? "border-slate-800 bg-slate-900/60"
                  : "border-[#E0D8C8] bg-[#FAF8F3] shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isDark ? "text-slate-400" : "text-stone-500"
                  }`}
                >
                  Active Forms
                </p>
                <FileText className="h-5 w-5 text-indigo-500" />
              </div>
              <p
                className={`mt-4 text-3xl font-extrabold ${
                  isDark ? "text-white" : "text-[#111827]"
                }`}
              >
                {forms.length}
              </p>
              <p
                className={`mt-1 text-xs ${
                  isDark ? "text-slate-500" : "text-stone-500"
                }`}
              >
                Total questionnaires created
              </p>
            </div>

            <div
              className={`rounded-2xl border p-5 transition ${
                isDark
                  ? "border-slate-800 bg-slate-900/60"
                  : "border-[#E0D8C8] bg-[#FAF8F3] shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isDark ? "text-slate-400" : "text-stone-500"
                  }`}
                >
                  Submissions
                </p>
                <BarChart3 className="h-5 w-5 text-emerald-500" />
              </div>
              <p
                className={`mt-4 text-3xl font-extrabold ${
                  isDark ? "text-white" : "text-[#111827]"
                }`}
              >
                {totalSubmissions}
              </p>
              <p
                className={`mt-1 text-xs ${
                  isDark ? "text-slate-500" : "text-stone-500"
                }`}
              >
                Collected responses
              </p>
            </div>
          </section>

          {/* Academic Form Templates */}
          <section className="mt-12">
            <h2
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              Institutional Templates
            </h2>
            <p
              className={`mt-1 text-sm ${
                isDark ? "text-slate-400" : "text-stone-600"
              }`}
            >
              Pre-configured questionnaire templates with OAU department and
              matric number fields.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {templates.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => void createForm(tpl.title)}
                    className={`group flex flex-col justify-between rounded-2xl border p-6 text-left transition hover:shadow-lg ${
                      isDark
                        ? "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
                        : "border-[#E0D8C8] bg-[#FAF8F3] hover:border-indigo-300 hover:bg-[#FFFFFF]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tpl.accent} text-white shadow-md`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                            isDark
                              ? "border-slate-700 bg-slate-800/80 text-slate-300"
                              : "border-[#DFD7C7] bg-[#EFEAE0] text-stone-700"
                          }`}
                        >
                          {tpl.badge}
                        </span>
                      </div>
                      <h3
                        className={`mt-5 text-base font-bold ${
                          isDark ? "text-white" : "text-[#111827]"
                        }`}
                      >
                        {tpl.title}
                      </h3>
                      <p
                        className={`mt-2 text-xs leading-5 ${
                          isDark ? "text-slate-400" : "text-stone-600"
                        }`}
                      >
                        {tpl.desc}
                      </p>
                    </div>

                    <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 transition group-hover:text-indigo-600">
                      Instantiate Form
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Active Forms Table/List */}
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-[#111827]"
                  }`}
                >
                  Deployed Questionnaires
                </h2>
                <p
                  className={`mt-1 text-sm ${
                    isDark ? "text-slate-400" : "text-stone-600"
                  }`}
                >
                  Manage form state, copy public respondent URLs, and evaluate
                  responses.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void createForm()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                New Form
              </button>
            </div>

            <div className="mt-6">
              {loadingForms ? (
                <div
                  className={`rounded-2xl border p-12 text-center text-sm ${
                    isDark
                      ? "border-slate-800 bg-slate-900/50 text-slate-400"
                      : "border-[#E0D8C8] bg-[#FAF8F3] text-stone-600"
                  }`}
                >
                  Fetching questionnaires...
                </div>
              ) : filteredForms.length === 0 ? (
                <div
                  className={`rounded-2xl border border-dashed p-12 text-center ${
                    isDark
                      ? "border-slate-800 bg-slate-900/30"
                      : "border-[#DFD7C7] bg-[#FAF8F3]"
                  }`}
                >
                  <p
                    className={`text-base font-semibold ${
                      isDark ? "text-slate-300" : "text-stone-800"
                    }`}
                  >
                    No forms deployed yet
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      isDark ? "text-slate-500" : "text-stone-500"
                    }`}
                  >
                    Create a form to begin collecting responses.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredForms.map((form) => (
                    <article
                      key={form.id}
                      className={`flex flex-col gap-4 rounded-2xl border p-5 transition sm:flex-row sm:items-center sm:justify-between ${
                        isDark
                          ? "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                          : "border-[#E0D8C8] bg-[#FAF8F3] hover:border-stone-400"
                      }`}
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => router.push(`/builder/${form.id}`)}
                          className={`cursor-pointer text-left text-base font-bold transition hover:text-indigo-500 ${
                            isDark ? "text-white" : "text-[#111827]"
                          }`}
                        >
                          {form.title}
                        </button>
                        <p
                          className={`mt-1 text-xs ${
                            isDark ? "text-slate-400" : "text-stone-600"
                          }`}
                        >
                          {form._count?.responses ?? 0} responses • Created{" "}
                          {new Date(form.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/builder/${form.id}`)}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                            isDark
                              ? "border-slate-800 bg-slate-800/80 text-slate-200 hover:bg-slate-800"
                              : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-700 hover:bg-[#EFEAE0]"
                          }`}
                        >
                          <BarChart3 className="h-4 w-4" />
                          Manage & Builder
                        </button>

                        <button
                          type="button"
                          onClick={() => void copyShareLink(form.id)}
                          className={`rounded-xl border p-2 transition ${
                            isDark
                              ? "border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                              : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-700 hover:bg-[#EFEAE0]"
                          }`}
                          title="Copy Link"
                        >
                          {copiedId === form.id ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>

                        <Link
                          href={`/f/${form.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`rounded-xl border p-2 transition ${
                            isDark
                              ? "border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                              : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-700 hover:bg-[#EFEAE0]"
                          }`}
                          title="View Public Form"
                        >
                          <ArrowRight className="h-4 w-4 -rotate-45" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => void deleteForm(form.id)}
                          className={`rounded-xl border p-2 transition ${
                            isDark
                              ? "border-slate-800 bg-slate-800/80 text-rose-400 hover:bg-rose-500/10"
                              : "border-[#DFD7C7] bg-[#FFFFFF] text-rose-600 hover:bg-rose-50"
                          }`}
                          title="Delete Form"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* LOGO-CLICK EXIT CONFIRMATION MODAL */}
        {isExitModalOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsExitModalOpen(false);
            }}
          >
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl transition ${
                isDark
                  ? "border-slate-800 bg-slate-900 text-white"
                  : "border-[#DFD7C7] bg-[#FAF8F3] text-stone-900"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <AlertCircle className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-lg font-bold">Return to Public Home?</h3>
              <p
                className={`mt-2 text-xs leading-relaxed ${
                  isDark ? "text-slate-400" : "text-stone-600"
                }`}
              >
                You are about to navigate back to the OAU FaaS landing page. Do
                you want to sign out of your session before leaving your
                workspace?
              </p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsExitModalOpen(false)}
                  className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                    isDark
                      ? "border-slate-800 text-slate-300 hover:bg-slate-800"
                      : "border-[#DFD7C7] text-stone-700 hover:bg-[#EFEAE0]"
                  }`}
                >
                  Stay in Workspace
                </button>

                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-rose-500"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log Out & Return
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI GENERATOR MODAL */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
            <div
              className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${
                isDark
                  ? "border-purple-500/20 bg-slate-900 text-white"
                  : "border-purple-200 bg-[#FAF8F3] text-stone-900"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-4 ${
                  isDark ? "border-slate-800" : "border-[#E0D8C8]"
                }`}
              >
                <h3 className="text-base font-bold">AI Form Architect</h3>
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => void handleAiGenerate(e)} className="mt-4">
                {aiError && (
                  <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {aiError}
                  </div>
                )}

                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe your questionnaire topic, target audience, and required fields..."
                  rows={4}
                  className={`w-full rounded-2xl border p-3 text-xs outline-none focus:border-purple-500 ${
                    isDark
                      ? "border-slate-800 bg-slate-950 text-white"
                      : "border-[#DFD7C7] bg-[#FFFFFF] text-stone-900"
                  }`}
                />

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className={`rounded-xl border px-4 py-2 text-xs font-semibold ${
                      isDark
                        ? "border-slate-800 text-slate-400 hover:bg-slate-800"
                        : "border-[#DFD7C7] text-stone-600 hover:bg-[#EFEAE0]"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingAi || !aiPrompt.trim()}
                    className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                  >
                    {isGeneratingAi ? "Architecting..." : "Generate Form"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ==========================================
  // UNAUTHENTICATED PUBLIC LANDING PAGE VIEW
  // ==========================================
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      {/* Background Ambience */}
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute right-0 top-1/3 h-[450px] w-[500px] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 sm:py-5">
          <Link
            href="/"
            className="flex items-center gap-3 transition hover:opacity-95"
            aria-label="OAU FaaS Home"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-black tracking-wider text-white shadow-lg shadow-indigo-600/30">
              FaaS
            </div>

            <div className="text-left">
              <span className="block text-lg font-extrabold tracking-tight text-white sm:text-xl">
                OAU FaaS
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Forms as a Service
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void signIn("google")}
              className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            >
              Institutional Login
            </button>

            <button
              type="button"
              onClick={() => void signIn("google")}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-20 text-center sm:px-8 sm:pb-28 sm:pt-28">
        <div className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
          <School className="h-4 w-4 text-indigo-400" />
          <span>Obafemi Awolowo University Institutional Infrastructure</span>
        </div>

        <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Standardized Forms as a Service for{" "}
          <span className="text-indigo-400">Great Ife</span>
        </h1>

        <p className="mx-auto mt-7 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-xl sm:leading-8">
          An institutional platform for course evaluations, departmental
          clearances, academic surveys, and administrative polling—enforcing
          verified university credentials and automated record aggregation.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => void signIn("google")}
            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/30 transition hover:scale-[1.02] hover:bg-indigo-500 sm:w-auto"
          >
            Authenticate with OAU Generic Email
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-xs font-medium text-slate-400 sm:text-sm">
          Strictly gated to verified{" "}
          <span className="font-semibold text-slate-200">
            @student.oauife.edu.ng
          </span>{" "}
          and{" "}
          <span className="font-semibold text-slate-200">@oauife.edu.ng</span>{" "}
          accounts.
        </p>
      </section>

      {/* Architectural Capabilities */}
      <section className="relative z-10 border-y border-slate-800/80 bg-slate-900/40 px-6 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400">
              Institutional Capabilities
            </p>

            <h2 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              Engineered for Academic Rigor and Campus Workflows
            </h2>

            <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
              Replacing fragmented third-party forms with authenticated,
              domain-locked institutional data services.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 transition hover:border-slate-700">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                <Shield className="h-6 w-6" />
              </div>

              <h3 className="mt-6 text-xl font-bold text-white">
                Domain-Locked Authentication
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Guarantees one-respondent integrity across course reviews,
                departmental elections, and clearance surveys by restricting
                submissions strictly to verified university addresses.
              </p>

              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-300">
                @student.oauife.edu.ng / @oauife.edu.ng
              </div>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 transition hover:border-slate-700">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <BarChart3 className="h-6 w-6" />
              </div>

              <h3 className="mt-6 text-xl font-bold text-white">
                Direct Tabular & Visual Analytics
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Eliminate spreadsheet parsing delays. Gain direct access to
                distribution charts, linear scale ratings, and instant CSV
                exports formatted for faculty boards and departmental
                supervisors.
              </p>

              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                Automated statistical aggregation
              </div>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 transition hover:border-slate-700">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                <BrainCircuit className="h-6 w-6" />
              </div>

              <h3 className="mt-6 text-xl font-bold text-white">
                Gemini Qualitative Synthesizer
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Synthesizes open-ended student reviews, recommendations, and
                industrial training feedback into structured executive summaries
                with cached database performance.
              </p>

              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-purple-400">
                <Sparkles className="h-4 w-4" />
                Cached Institutional Intelligence
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="relative z-10 px-6 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400">
              Institutional Documentation
            </p>

            <h2 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
              Platform Architecture & Access FAQ
            </h2>

            <p className="mt-3 text-base text-slate-400">
              Answers to structural questions regarding OAU Forms as a Service
              deployment.
            </p>
          </div>

          <div className="mt-10 divide-y divide-slate-800 rounded-3xl border border-slate-800 bg-slate-900/60 p-2">
            {faqs.map((faq, idx) => (
              <div key={faq.q}>
                <button
                  type="button"
                  onClick={() =>
                    setActiveFaq((current) => (current === idx ? null : idx))
                  }
                  aria-expanded={activeFaq === idx}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left text-sm font-bold text-slate-200 transition hover:text-white sm:text-base"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                      activeFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {activeFaq === idx && (
                  <div className="px-5 pb-6 text-sm leading-relaxed text-slate-400 sm:text-base">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 px-6 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-black text-white">
              FaaS
            </div>

            <div>
              <p className="text-base font-bold text-slate-200">
                OAU FaaS • Obafemi Awolowo University
              </p>
              <p className="text-xs text-slate-400">
                Institutional Forms as a Service for faculties, departments, and
                academic research.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void signIn("google")}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white sm:w-auto"
          >
            Institutional Access
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </main>
  );
}
