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
  "Build a departmental dinner RSVP questionnaire with food preferences and matric number verification",
  "Draft an academic research survey assessing campus Wi-Fi reliability and hostel library study habits",
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
          : "An unexpected error occurred during synthesis.",
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
      q: "Who is eligible to create and manage forms on FormCraft?",
      a: "FormCraft is exclusively locked to Obafemi Awolowo University students and researchers. You must sign in with your official @student.oauife.edu.ng generic student email.",
    },
    {
      q: "Do respondents need an OAU account to fill forms?",
      a: "No. Anyone you share the public respondent link with can fill it out seamlessly from any device without needing an account.",
    },
    {
      q: "Will I get notified when someone submits an answer?",
      a: "Yes. Every submission automatically triggers an email notification to your registered inbox when email notifications are configured.",
    },
    {
      q: "Can I export survey findings for my thesis or course project?",
      a: "FormCraft supports CSV export and response summaries, depending on the features enabled in your account.",
    },
  ];

  const templates: Template[] = [
    {
      title: "Blank Canvas",
      desc: "Build question architecture from scratch with complete control.",
      icon: Plus,
      accent: "from-indigo-500 to-indigo-600",
      badge: "Essential",
    },
    {
      title: "Course & Lecturer Evaluation",
      desc: "Curated linear rating scales for semester academic feedback.",
      icon: School,
      accent: "from-purple-500 to-indigo-500",
      badge: "OAU Special",
    },
    {
      title: "Student Event RSVP",
      desc: "Department dinner, symposium headcounts & entry badges.",
      icon: Layers,
      accent: "from-amber-500 to-rose-500",
      badge: "Popular",
    },
    {
      title: "Project Research Survey",
      desc: "Structured multiple-choice grids built for thesis data collection.",
      icon: BarChart3,
      accent: "from-emerald-500 to-teal-500",
      badge: "Academic",
    },
  ];

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold shadow-xl shadow-indigo-600/20">
            FC
          </div>

          <p className="mt-5 text-sm font-semibold text-slate-200">
            Initializing FormCraft...
          </p>

          <div className="mx-auto mt-4 h-1 w-32 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
          </div>
        </div>
      </main>
    );
  }

  if (session) {
    const filteredForms = forms.filter((form) =>
      form.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const totalSubmissions = forms.reduce(
      (total, form) => total + (form._count?.responses ?? 0),
      0,
    );

    return (
      <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-600/5 blur-3xl" />
        </div>

        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="group flex min-w-0 shrink-0 cursor-pointer items-center gap-2.5"
              aria-label="Go to FormCraft home"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-lg shadow-indigo-600/20">
                FC
              </div>

              <div className="hidden min-w-0 text-left sm:block">
                <span className="block text-sm font-bold text-white">
                  FormCraft
                </span>
                <span className="block text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  OAU Edition
                </span>
              </div>
            </button>

            <div className="relative ml-auto hidden min-w-0 max-w-sm flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search your questionnaires..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-xs text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAiError(null);
                  setIsAiModalOpen(true);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-600/10 px-3 py-2.5 text-xs font-semibold text-purple-300 shadow-md transition hover:bg-purple-600/20 hover:text-white"
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI Architect</span>
                <span className="sm:hidden">AI</span>
              </button>

              <button
                type="button"
                onClick={() => void createForm()}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 sm:px-3.5"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create New Form</span>
                <span className="sm:hidden">New</span>
              </button>

              <div className="hidden h-8 w-px bg-slate-800 sm:block" />

              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-slate-200">
                  {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}

              <button
                type="button"
                onClick={() => void signOut()}
                title="Sign Out"
                aria-label="Sign Out"
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-900 px-3 py-2 md:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search your questionnaires..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-xs text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10">
          <section className="mb-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
                  Workspace
                </p>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Welcome back,{" "}
                  <span className="text-indigo-300">
                    {session.user?.name?.split(" ")[0] || "Creator"}
                  </span>
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Build, deploy, and analyze questionnaires for your OAU
                  academic workflows.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/40" />
                <span className="text-[11px] font-medium text-emerald-300">
                  OAU account verified
                </span>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Total Forms
                </p>
                <FileText className="h-4 w-4 text-indigo-400" />
              </div>

              <p className="mt-3 text-2xl font-bold text-white">
                {forms.length}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Your questionnaires
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Submissions
                </p>
                <BarChart3 className="h-4 w-4 text-emerald-400" />
              </div>

              <p className="mt-3 text-2xl font-bold text-white">
                {totalSubmissions}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Responses collected
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Domain Gate
                </p>
                <Shield className="h-4 w-4 text-cyan-400" />
              </div>

              <p className="mt-3 truncate text-sm font-bold text-white">
                @student.oauife.edu.ng
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Institutional access
              </p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-purple-400">
                  AI Synthesizer
                </p>
                <BrainCircuit className="h-4 w-4 text-purple-400" />
              </div>

              <p className="mt-3 text-sm font-bold text-white">
                Active (3.8-Flash)
              </p>

              <p className="mt-1 text-[11px] text-purple-300/60">
                Gemini generation ready
              </p>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-indigo-950/30 p-5 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Prompt-to-Form Engine
                </div>

                <h2 className="mt-4 text-xl font-bold text-white sm:text-2xl">
                  Design Entire Questionnaires with One Prompt
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Type what you want to evaluate—course review, SIWES logbook
                  feedback, or student voting—and let Gemini architect the
                  fields, options, and logic instantly.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAiError(null);
                  setIsAiModalOpen(true);
                }}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:scale-[1.02] hover:from-purple-500 hover:to-indigo-500"
              >
                <Wand2 className="h-4 w-4" />
                Open AI Form Generator
              </button>
            </div>
          </section>

          <section className="mt-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
                  Quick Start
                </p>

                <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                  Launch with a Specialized Preset
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Pre-configured fields optimized for Great Ife student surveys
                  and campus research.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {templates.map((tpl) => {
                const Icon = tpl.icon;

                return (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => void createForm(tpl.title)}
                    className="group relative flex min-h-[210px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-black/10"
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tpl.accent}`}
                    />

                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tpl.accent} text-white shadow-lg`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          {tpl.badge}
                        </span>
                      </div>

                      <h3 className="mt-5 text-sm font-bold text-white">
                        {tpl.title}
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {tpl.desc}
                      </p>
                    </div>

                    <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition group-hover:text-indigo-200">
                      Use Template
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
                  Workspace
                </p>

                <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                  Your Deployed Questionnaires
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Manage active forms, view submission tallies, and access
                  respondent links.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void createForm()}
                className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                New Form
              </button>
            </div>

            <div className="mt-5">
              {loadingForms ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-12 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />

                  <p className="mt-4 text-xs font-medium text-slate-400">
                    Fetching campus questionnaires...
                  </p>
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-slate-500">
                    {searchQuery ? (
                      <Search className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-200">
                    {searchQuery
                      ? "No matching forms found"
                      : "No questionnaires deployed yet"}
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
                    {searchQuery
                      ? `No forms matched "${searchQuery}". Clear your search query to see all records.`
                      : "Create your first questionnaire to start collecting campus responses and live statistics."}
                  </p>

                  {!searchQuery && (
                    <button
                      type="button"
                      onClick={() => void createForm()}
                      className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Blank Form
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredForms.map((form) => (
                    <article
                      key={form.id}
                      className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700 hover:bg-slate-900/80 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/builder/${form.id}`)
                                }
                                className="block max-w-full cursor-pointer truncate text-left text-sm font-semibold text-white transition-colors hover:text-indigo-400"
                              >
                                {form.title}
                              </button>

                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                <span
                                  className={`rounded-full px-2 py-0.5 font-semibold ${
                                    form.published
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : "bg-amber-500/10 text-amber-400"
                                  }`}
                                >
                                  {form.published ? "Live" : "Draft"}
                                </span>

                                <span>
                                  {form._count?.responses ?? 0}{" "}
                                  {(form._count?.responses ?? 0) === 1
                                    ? "response"
                                    : "responses"}
                                </span>

                                <span>•</span>

                                <span>
                                  {new Date(
                                    form.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {form.description && (
                            <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500 lg:pl-[52px]">
                              {form.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/builder/${form.id}`)}
                            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white sm:flex-none"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Manage & Builder
                          </button>

                          <button
                            type="button"
                            onClick={() => void copyShareLink(form.id)}
                            title="Copy Public Link"
                            aria-label={`Copy public link for ${form.title}`}
                            className="cursor-pointer rounded-xl border border-slate-800 bg-slate-800/60 p-2.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                          >
                            {copiedId === form.id ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          <Link
                            href={`/f/${form.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Public Form"
                            aria-label={`Open public form for ${form.title}`}
                            className="cursor-pointer rounded-xl border border-slate-800 bg-slate-800/60 p-2.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                          >
                            <ArrowRight className="h-4 w-4 -rotate-45" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => void deleteForm(form.id)}
                            title="Delete Questionnaire"
                            aria-label={`Delete ${form.title}`}
                            className="cursor-pointer rounded-xl border border-slate-800 bg-slate-800/60 p-2.5 text-slate-400 transition hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {isAiModalOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isGeneratingAi) {
                setIsAiModalOpen(false);
              }
            }}
          >
            <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-purple-500/20 bg-slate-900 shadow-2xl shadow-purple-950/40">
              <div className="border-b border-slate-800 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
                        <Wand2 className="h-4 w-4" />
                      </div>

                      <div>
                        <h2 className="text-sm font-bold text-white sm:text-base">
                          Generate Form with AI
                        </h2>

                        <p className="mt-0.5 text-[10px] text-purple-300">
                          Powered by Gemini 3.8-Flash
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                    disabled={isGeneratingAi}
                    aria-label="Close AI generator"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <form
                onSubmit={(event) => void handleAiGenerate(event)}
                className="p-5 sm:p-6"
              >
                {aiError && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="ai-prompt"
                    className="mb-2 block text-[11px] font-semibold text-slate-300"
                  >
                    Describe your survey or questionnaire
                  </label>

                  <textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    placeholder="e.g. Create a 5-question evaluation survey for OAU computer engineering students on their industrial training experience..."
                    required
                    disabled={isGeneratingAi}
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs text-white outline-none transition placeholder:text-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 disabled:opacity-50"
                  />
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-semibold text-slate-400">
                    Or select an OAU preset starter:
                  </p>

                  <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    {AI_SUGGESTED_PROMPTS.map((promptText, idx) => (
                      <button
                        key={`${idx}-${promptText}`}
                        type="button"
                        onClick={() => setAiPrompt(promptText)}
                        disabled={isGeneratingAi}
                        className="block w-full cursor-pointer truncate rounded-xl border border-slate-800 bg-slate-950/40 p-2 text-left text-[11px] text-slate-300 transition hover:border-purple-500/30 hover:bg-purple-950/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    disabled={isGeneratingAi}
                    className="cursor-pointer rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isGeneratingAi || !aiPrompt.trim()}
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:from-purple-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Wand2
                      className={`h-3.5 w-3.5 ${
                        isGeneratingAi ? "animate-spin" : ""
                      }`}
                    />

                    <span>
                      {isGeneratingAi
                        ? "Architecting Form..."
                        : "Generate & Open Builder"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[450px] w-[450px] rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-cyan-600/5 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-4 sm:px-6 sm:py-5">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-lg shadow-indigo-600/20">
              FC
            </div>

            <div className="min-w-0 text-left">
              <span className="block text-sm font-bold text-white sm:text-base">
                FormCraft
              </span>

              <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:block">
                OAU Student SaaS
              </span>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => void signIn("google")}
              className="cursor-pointer rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white sm:px-3.5"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => void signIn("google")}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 sm:px-4"
            >
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
        <div className="mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3.5 py-2 text-[11px] font-medium text-indigo-300 sm:text-xs">
          <School className="h-3.5 w-3.5 shrink-0" />
          <span>Configured for Obafemi Awolowo University</span>
        </div>

        <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white sm:mt-8 sm:text-5xl sm:leading-[1.12] lg:text-7xl">
          The Intelligent Form Suite Built for{" "}
          <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
            Campus Speed
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base sm:leading-8">
          Replace flat questionnaires with adaptive question logic, real-time
          response analytics, and automated submission alerts to your verified
          OAU student account.
        </p>

        <button
          type="button"
          onClick={() => void signIn("google")}
          className="mt-8 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-600/30 transition hover:scale-[1.02] hover:bg-indigo-500 sm:mx-auto sm:w-auto"
        >
          Launch FormCraft Free
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Requires official{" "}
          <span className="text-slate-300">@student.oauife.edu.ng</span> login.
        </p>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Fast Form Creation",
              text: "Build and publish in minutes",
            },
            {
              icon: TrendingUp,
              title: "Live Insights",
              text: "Understand responses quickly",
            },
            {
              icon: Shield,
              title: "OAU Access",
              text: "Designed for the OAU community",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200">
                    {item.title}
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    {item.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 border-y border-slate-800/70 bg-slate-900/30 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
              Built for better workflows
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              Architected to Surpass Conventional Forms
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
              Engineered with deep visual clarity, intelligent metrics, and zero
              administrative bloat.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            <article className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7 md:col-span-2">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-white sm:text-xl">
                    Live Graphical Visualizations
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Tired of raw spreadsheets? FormCraft turns responses into
                    distribution charts, linear scale averages, and clear
                    response tallies.
                  </p>
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        Onboarding Satisfaction
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">
                        Sample analytics preview
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                      92% Positive
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    {[
                      {
                        label: "Excellent",
                        value: 62,
                        color: "bg-indigo-500",
                      },
                      {
                        label: "Good",
                        value: 30,
                        color: "bg-purple-500",
                      },
                      {
                        label: "Fair",
                        value: 8,
                        color: "bg-slate-600",
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="mb-1.5 flex justify-between gap-3 text-[11px]">
                          <span className="text-slate-400">{item.label}</span>
                          <span className="text-slate-300">{item.value}%</span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
                    <span className="text-[10px] text-slate-500">
                      142 Respondent Inputs
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Live Syncing
                    </span>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
                <BrainCircuit className="h-5 w-5" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-white">
                AI Executive Synthesizer
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Transform qualitative feedback into concise sentiment breakdowns
                and executive summaries when AI analysis is enabled.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[10px] font-medium text-purple-300">
                <Sparkles className="h-3.5 w-3.5" />
                AI-assisted analysis
              </div>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <Shield className="h-5 w-5" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-white">
                Institutional Security
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Institutional sign-in helps keep form ownership tied to verified
                OAU accounts.
              </p>

              <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <School className="h-4 w-4 shrink-0 text-emerald-400" />

                <span className="break-all text-[11px] text-slate-300">
                  @student.oauife.edu.ng
                </span>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7 md:col-span-2">
              <div className="grid gap-6 md:grid-cols-2 md:items-center">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                    <Zap className="h-5 w-5" />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-white">
                    Step-by-Step Focus Mode
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Keep respondents focused with a clean, one-question-at-a-
                    time experience where supported by your form layout.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-medium text-slate-500">
                      QUESTION 03 OF 08
                    </span>

                    <span className="text-[10px] text-indigo-300">38%</span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-[38%] rounded-full bg-indigo-500" />
                  </div>

                  <p className="mt-5 text-sm font-semibold leading-6 text-white">
                    How would you describe your experience?
                  </p>

                  <div className="mt-4 space-y-2">
                    {["Excellent", "Good", "Fair"].map((option, index) => (
                      <div
                        key={option}
                        className={`rounded-xl border px-3 py-2.5 text-xs ${
                          index === 0
                            ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-200"
                            : "border-slate-800 bg-slate-900/70 text-slate-400"
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
              Need to know
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              Frequently Asked Questions
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Key questions regarding FormCraft capabilities and student access.
            </p>
          </div>

          <div className="mt-8 divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            {faqs.map((faq, idx) => (
              <div key={faq.q}>
                <button
                  type="button"
                  onClick={() =>
                    setActiveFaq((current) => (current === idx ? null : idx))
                  }
                  aria-expanded={activeFaq === idx}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 p-4 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-900 hover:text-white sm:p-5 sm:text-sm"
                >
                  <span>{faq.q}</span>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                      activeFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {activeFaq === idx && (
                  <div className="px-4 pb-5 text-xs leading-6 text-slate-400 sm:px-5 sm:text-sm">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-800 bg-slate-950/80 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white">
              FC
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                FormCraft • Obafemi Awolowo University
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                © {new Date().getFullYear()} FormCraft. Engineered for academic
                research and survey workflows.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void signIn("google")}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white sm:w-auto"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </main>
  );
}
