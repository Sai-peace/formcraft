"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Paperclip,
  ArrowRight,
  ArrowLeft,
  LayoutList,
  Sparkles,
  School,
  CornerDownLeft,
} from "lucide-react";
import { QuestionField } from "@/components/SortableQuestionCard";

interface PublicForm {
  id: string;
  title: string;
  description?: string | null;
  customMessage?: string | null;
  fields: string;
  published: boolean;
  theme?: string | null;
  collectEmail?: boolean;
}

interface UploadedFile {
  name: string;
  url: string;
  size: number;
}

type AnswerValue = string | string[] | UploadedFile | null | undefined;

type Answers = Record<string, AnswerValue>;

type PublicQuestion = Omit<QuestionField, "type"> & {
  type: QuestionField["type"] | "email";
};

interface ThemePalette {
  primary: string;
  hover: string;
  light: string;
  ring: string;
}

const THEME_PALETTES: Record<string, ThemePalette> = {
  indigo: {
    primary: "#4f46e5",
    hover: "#4338ca",
    light: "#eef2ff",
    ring: "rgba(79, 70, 229, 0.25)",
  },
  emerald: {
    primary: "#059669",
    hover: "#047857",
    light: "#ecfdf5",
    ring: "rgba(5, 150, 105, 0.25)",
  },
  violet: {
    primary: "#7c3aed",
    hover: "#6d28d9",
    light: "#f5f3ff",
    ring: "rgba(124, 58, 237, 0.25)",
  },
  amber: {
    primary: "#d97706",
    hover: "#b45309",
    light: "#fffbeb",
    ring: "rgba(217, 119, 6, 0.25)",
  },
  rose: {
    primary: "#e11d48",
    hover: "#be123c",
    light: "#fff1f2",
    ring: "rgba(225, 29, 72, 0.25)",
  },
  slate: {
    primary: "#1e293b",
    hover: "#0f172a",
    light: "#f1f5f9",
    ring: "rgba(30, 41, 59, 0.25)",
  },
};

export default function PublicFormPage() {
  const params = useParams();

  const [respondentEmail, setRespondentEmail] = useState("");

  const formId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [form, setForm] = useState<PublicForm | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"focus" | "classic">("focus");
  const [activeStep, setActiveStep] = useState(0);

  const handleInputChange = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => {
      if (value === null || value === undefined) {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      }

      return {
        ...prev,
        [questionId]: value,
      };
    });
  };

  const handleCheckboxChange = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId])
        ? (prev[questionId] as string[])
        : [];

      const updated = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];

      return {
        ...prev,
        [questionId]: updated,
      };
    });
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    setUploadingField(questionId);
    setErrorMsg(null);

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File size cannot exceed 10MB.");
      setUploadingField(null);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      let data: {
        name?: string;
        url?: string;
        size?: number;
        error?: string;
      };

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to upload file. Please try again.");
        return;
      }

      if (!data.url) {
        setErrorMsg("The uploaded file did not return a valid URL.");
        return;
      }

      handleInputChange(questionId, {
        name: data.name || file.name,
        url: data.url,
        size: data.size || file.size,
      });
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg("Error uploading file. Please try again.");
    } finally {
      setUploadingField(null);
    }
  };

  useEffect(() => {
    if (!formId) {
      queueMicrotask(() => {
        setLoading(false);
        setErrorMsg("Invalid form link.");
      });

      return;
    }

    let ignore = false;

    async function loadForm() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/forms/${formId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          if (!ignore) {
            setErrorMsg("Form not found or unavailable.");
          }
          return;
        }

        const data = (await res.json()) as PublicForm;

        if (ignore) return;

        if (!data || typeof data !== "object") {
          setErrorMsg("Invalid form data.");
          return;
        }

        setForm(data);

        try {
          const parsedFields = JSON.parse(data.fields || "[]");

          if (Array.isArray(parsedFields)) {
            setQuestions(parsedFields as PublicQuestion[]);
          } else {
            setQuestions([]);
            setErrorMsg("This form contains invalid question data.");
          }
        } catch (error) {
          console.error("Error parsing form fields:", error);
          setQuestions([]);
          setErrorMsg("This form contains invalid question data.");
        }
      } catch (err) {
        console.error("Error loading form:", err);

        if (!ignore) {
          setErrorMsg(
            "Failed to load form. Please check your internet connection.",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadForm();

    return () => {
      ignore = true;
    };
  }, [formId]);

  const totalSteps = useMemo(() => {
    return (form?.collectEmail ? 1 : 0) + questions.length;
  }, [form?.collectEmail, questions.length]);

  const activeTheme =
    THEME_PALETTES[form?.theme || "indigo"] || THEME_PALETTES.indigo;

  const validateCurrentStep = (stepIndex: number): boolean => {
    setErrorMsg(null);

    if (form?.collectEmail && stepIndex === 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const email = respondentEmail.trim();

      if (!email || !emailRegex.test(email)) {
        setErrorMsg("Please enter a valid email address to continue.");
        return false;
      }

      return true;
    }

    const questionIndex = form?.collectEmail ? stepIndex - 1 : stepIndex;

    const currentQ = questions[questionIndex];

    if (!currentQ) return true;

    const val = answers[currentQ.id];

    if (currentQ.required) {
      const empty =
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "") ||
        (Array.isArray(val) && val.length === 0);

      if (empty) {
        setErrorMsg("Please answer this question to proceed.");
        return false;
      }
    }

    if (
      currentQ.type === "email" &&
      typeof val === "string" &&
      val.trim() !== ""
    ) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(val.trim())) {
        setErrorMsg("Please enter a valid email address.");
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep(activeStep)) return;

    if (activeStep < totalSteps - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);

    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const triggerSubmit = async () => {
    if (submitting) return;

    setErrorMsg(null);

    if (form?.collectEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const email = respondentEmail.trim();

      if (!email || !emailRegex.test(email)) {
        setErrorMsg("Please enter a valid email address.");
        return;
      }
    }

    for (const q of questions) {
      const val = answers[q.id];

      if (q.required) {
        const empty =
          val === undefined ||
          val === null ||
          (typeof val === "string" && val.trim() === "") ||
          (Array.isArray(val) && val.length === 0);

        if (empty) {
          setErrorMsg(`Please answer required question: "${q.title}"`);
          return;
        }
      }

      if (q.type === "email" && typeof val === "string" && val.trim() !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(val.trim())) {
          setErrorMsg(`Please enter a valid email address for "${q.title}".`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const submissionAnswers: Answers = {
        ...answers,
      };

      if (form?.collectEmail) {
        submissionAnswers.respondent_email = respondentEmail.trim();
      }

      const res = await fetch(`/api/forms/${formId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: submissionAnswers,
        }),
      });

      let data: {
        success?: boolean;
        responseId?: string;
        redirectUrl?: string | null;
        customMessage?: string | null;
        error?: string;
      };

      try {
        data = await res.json();
      } catch {
        data = {
          error: "The server returned an invalid response.",
        };
      }

      if (!res.ok) {
        setErrorMsg(data.error || "Submission failed.");
        return;
      }

      if (data.redirectUrl) {
        try {
          const redirectUrl = new URL(data.redirectUrl, window.location.origin);

          if (
            redirectUrl.protocol === "http:" ||
            redirectUrl.protocol === "https:"
          ) {
            window.location.href = redirectUrl.toString();
            return;
          }

          setErrorMsg("Invalid redirect URL.");
          return;
        } catch {
          setErrorMsg("Invalid redirect URL.");
          return;
        }
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting response:", err);
      setErrorMsg("An unexpected error occurred while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (viewMode !== "focus" || submitted || loading || totalSteps === 0) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;

      const target = e.target as HTMLElement;

      if (target.tagName.toLowerCase() === "textarea") {
        return;
      }

      e.preventDefault();

      if (activeStep === totalSteps - 1) {
        void triggerSubmit();
      } else {
        handleNextStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    viewMode,
    activeStep,
    totalSteps,
    submitted,
    loading,
    answers,
    respondentEmail,
  ]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
            <Sparkles className="h-7 w-7 animate-pulse text-indigo-400" />
          </div>

          <p className="text-sm font-medium text-slate-300">
            Loading questionnaire...
          </p>
        </div>
      </main>
    );
  }

  if (errorMsg && !form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <AlertCircle className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-bold">Form Unavailable</h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">{errorMsg}</p>
        </div>
      </main>
    );
  }

  if (!form) return null;

  if (!form.published) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <AlertCircle className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-bold">Questionnaire Closed</h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            This questionnaire is no longer accepting submissions.
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{
              backgroundColor: activeTheme.light,
              color: activeTheme.primary,
            }}
          >
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <p
            className="mt-6 text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: activeTheme.primary }}
          >
            Submission Confirmed
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">
            Response Recorded
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">
            {form.customMessage ||
              `Thank you! Your response to "${form.title}" has been successfully saved.`}
          </p>

          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setRespondentEmail("");
              setErrorMsg(null);
              setActiveStep(0);
              setSubmitted(false);
            }}
            style={{ color: activeTheme.primary }}
            className="mt-6 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold hover:underline"
          >
            Submit another response
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </main>
    );
  }

  const isFocusEmailStep = Boolean(form.collectEmail) && activeStep === 0;

  const currentFocusQ = form.collectEmail
    ? questions[activeStep - 1]
    : questions[activeStep];

  const progressPercent =
    totalSteps > 0 ? Math.round(((activeStep + 1) / totalSteps) * 100) : 0;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-15rem] h-[35rem] w-[35rem] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-[-15rem] left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: activeTheme.primary }}
            >
              FC
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {form.title}
              </p>

              <p className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:block">
                OAU Campus Survey
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex shrink-0 items-center rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => setViewMode("focus")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === "focus"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Focus</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("classic")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === "classic"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Classic</span>
            </button>
          </div>
        </div>

        {/* Focus Mode Progress */}
        {viewMode === "focus" && totalSteps > 0 && (
          <div className="h-0.5 w-full bg-slate-900">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: activeTheme.primary,
              }}
            />
          </div>
        )}
      </header>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FOCUS MODE */}
        {viewMode === "focus" && (
          <section>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Question {Math.min(activeStep + 1, totalSteps)} of{" "}
                  {totalSteps}
                </p>
              </div>

              <span className="text-xs font-medium text-slate-500">
                {progressPercent}% completed
              </span>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
              {isFocusEmailStep ? (
                <div>
                  <div className="mb-6">
                    <div className="mb-4 flex items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: activeTheme.light,
                          color: activeTheme.primary,
                        }}
                      >
                        Step 1
                      </span>

                      <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                        Required
                      </span>
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      What is your official student email?
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      Your institutional address will be securely recorded with
                      your response.
                    </p>
                  </div>

                  <input
                    type="email"
                    value={respondentEmail}
                    onChange={(e) => setRespondentEmail(e.target.value)}
                    placeholder="name@student.oauife.edu.ng"
                    autoFocus
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              ) : currentFocusQ ? (
                <div>
                  <div className="mb-6">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        Question {activeStep + 1}
                      </span>

                      {currentFocusQ.required ? (
                        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                          Required
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Optional
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {currentFocusQ.title}
                    </h1>
                  </div>

                  {currentFocusQ.type === "short_answer" && (
                    <input
                      type="text"
                      value={
                        typeof answers[currentFocusQ.id] === "string"
                          ? (answers[currentFocusQ.id] as string)
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(currentFocusQ.id, e.target.value)
                      }
                      placeholder="Type your response here..."
                      autoFocus
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  )}

                  {currentFocusQ.type === "email" && (
                    <input
                      type="email"
                      value={
                        typeof answers[currentFocusQ.id] === "string"
                          ? (answers[currentFocusQ.id] as string)
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(currentFocusQ.id, e.target.value)
                      }
                      placeholder="name@student.oauife.edu.ng"
                      autoFocus
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  )}

                  {currentFocusQ.type === "multiple_choice" && (
                    <div className="space-y-3">
                      {(currentFocusQ.options || []).map((opt, oIdx) => {
                        const isSelected = answers[currentFocusQ.id] === opt;

                        return (
                          <button
                            type="button"
                            key={`${currentFocusQ.id}-${oIdx}`}
                            onClick={() =>
                              handleInputChange(currentFocusQ.id, opt)
                            }
                            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left text-xs font-medium transition sm:text-sm ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-600/10 text-white shadow-md"
                                : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                            }`}
                          >
                            <span>{opt}</span>

                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentFocusQ.type === "checkbox" && (
                    <div className="space-y-3">
                      {(currentFocusQ.options || []).map((opt, oIdx) => {
                        const answer = answers[currentFocusQ.id];

                        const isSelected =
                          Array.isArray(answer) && answer.includes(opt);

                        return (
                          <button
                            type="button"
                            key={`${currentFocusQ.id}-${oIdx}`}
                            onClick={() =>
                              handleCheckboxChange(currentFocusQ.id, opt)
                            }
                            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left text-xs font-medium transition sm:text-sm ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-600/10 text-white shadow-md"
                                : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                            }`}
                          >
                            <span>{opt}</span>

                            {isSelected && (
                              <span className="font-bold text-indigo-400">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentFocusQ.type === "dropdown" && (
                    <select
                      value={
                        typeof answers[currentFocusQ.id] === "string"
                          ? (answers[currentFocusQ.id] as string)
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(currentFocusQ.id, e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-indigo-500"
                    >
                      <option value="">Select an option</option>

                      {(currentFocusQ.options || []).map((opt, oIdx) => (
                        <option key={`${currentFocusQ.id}-${oIdx}`} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {currentFocusQ.type === "date" && (
                    <input
                      type="date"
                      value={
                        typeof answers[currentFocusQ.id] === "string"
                          ? (answers[currentFocusQ.id] as string)
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(currentFocusQ.id, e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-indigo-500"
                    />
                  )}

                  {currentFocusQ.type === "file_upload" && (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-5">
                      {answers[currentFocusQ.id] &&
                      typeof answers[currentFocusQ.id] === "object" &&
                      !Array.isArray(answers[currentFocusQ.id]) ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Paperclip className="h-5 w-5 shrink-0 text-indigo-400" />

                            <span className="truncate text-sm text-slate-300">
                              {(answers[currentFocusQ.id] as UploadedFile).name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleInputChange(currentFocusQ.id, null)
                            }
                            className="ml-3 shrink-0 text-xs text-rose-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center py-5 text-center">
                          <UploadCloud className="mb-3 h-8 w-8 text-slate-500" />

                          <span className="text-sm font-semibold text-slate-300">
                            {uploadingField === currentFocusQ.id
                              ? "Uploading file..."
                              : "Select attachment"}
                          </span>

                          <span className="mt-1 text-xs text-slate-500">
                            Max file size 10MB
                          </span>

                          <input
                            type="file"
                            disabled={uploadingField === currentFocusQ.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0];

                              if (f) {
                                void handleFileUpload(currentFocusQ.id, f);
                              }

                              e.currentTarget.value = "";
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-500">
                  No questions available.
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={activeStep === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="hidden items-center gap-2 text-[11px] text-slate-600 sm:flex">
                <CornerDownLeft className="h-3.5 w-3.5" />
                Press Enter
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeStep === totalSteps - 1) {
                    void triggerSubmit();
                  } else {
                    handleNextStep();
                  }
                }}
                disabled={submitting || totalSteps === 0}
                style={{
                  backgroundColor: activeTheme.primary,
                }}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeStep === totalSteps - 1 ? (
                  <>
                    {submitting ? "Submitting..." : "Complete & Submit"}
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* CLASSIC MODE */}
        {viewMode === "classic" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void triggerSubmit();
            }}
            className="space-y-5"
          >
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: activeTheme.light,
                    color: activeTheme.primary,
                  }}
                >
                  <School className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">
                    {form.title}
                  </h1>

                  {form.description && (
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {form.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {form.collectEmail && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <label className="block text-sm font-semibold text-white">
                  Student Email Address <span className="text-rose-400">*</span>
                </label>

                <input
                  type="email"
                  value={respondentEmail}
                  onChange={(e) => setRespondentEmail(e.target.value)}
                  placeholder="name@student.oauife.edu.ng"
                  required
                  className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                    style={{
                      backgroundColor: activeTheme.light,
                      color: activeTheme.primary,
                    }}
                  >
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold leading-6 text-white">
                      {q.title}{" "}
                      {q.required && <span className="text-rose-400">*</span>}
                    </h2>

                    {q.type === "short_answer" && (
                      <input
                        type="text"
                        value={
                          typeof answers[q.id] === "string"
                            ? (answers[q.id] as string)
                            : ""
                        }
                        onChange={(e) =>
                          handleInputChange(q.id, e.target.value)
                        }
                        placeholder="Your answer"
                        className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
                      />
                    )}

                    {q.type === "email" && (
                      <input
                        type="email"
                        value={
                          typeof answers[q.id] === "string"
                            ? (answers[q.id] as string)
                            : ""
                        }
                        onChange={(e) =>
                          handleInputChange(q.id, e.target.value)
                        }
                        placeholder="name@student.oauife.edu.ng"
                        className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
                      />
                    )}

                    {q.type === "multiple_choice" && (
                      <div className="mt-3 space-y-2">
                        {(q.options || []).map((opt, oIdx) => (
                          <label
                            key={`${q.id}-${oIdx}`}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 transition hover:border-slate-700"
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={(e) =>
                                handleInputChange(q.id, e.target.value)
                              }
                              style={{
                                accentColor: activeTheme.primary,
                              }}
                              className="h-4 w-4"
                            />

                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "checkbox" && (
                      <div className="mt-3 space-y-2">
                        {(q.options || []).map((opt, oIdx) => {
                          const answer = answers[q.id];

                          const selected =
                            Array.isArray(answer) && answer.includes(opt);

                          return (
                            <label
                              key={`${q.id}-${oIdx}`}
                              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 transition hover:border-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => handleCheckboxChange(q.id, opt)}
                                style={{
                                  accentColor: activeTheme.primary,
                                }}
                                className="h-4 w-4 rounded"
                              />

                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "dropdown" && (
                      <select
                        value={
                          typeof answers[q.id] === "string"
                            ? (answers[q.id] as string)
                            : ""
                        }
                        onChange={(e) =>
                          handleInputChange(q.id, e.target.value)
                        }
                        className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                      >
                        <option value="">Select an option</option>

                        {(q.options || []).map((opt, oIdx) => (
                          <option key={`${q.id}-${oIdx}`} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {q.type === "date" && (
                      <input
                        type="date"
                        value={
                          typeof answers[q.id] === "string"
                            ? (answers[q.id] as string)
                            : ""
                        }
                        onChange={(e) =>
                          handleInputChange(q.id, e.target.value)
                        }
                        className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                      />
                    )}

                    {q.type === "file_upload" && (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4">
                        {answers[q.id] &&
                        typeof answers[q.id] === "object" &&
                        !Array.isArray(answers[q.id]) ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <Paperclip className="h-4 w-4 shrink-0 text-indigo-400" />

                              <span className="truncate text-sm text-slate-300">
                                {(answers[q.id] as UploadedFile).name}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleInputChange(q.id, null)}
                              className="shrink-0 text-xs text-rose-400 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                              <UploadCloud className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-300">
                                {uploadingField === q.id
                                  ? "Uploading file..."
                                  : "Select file to attach"}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                Maximum file size: 10MB
                              </p>
                            </div>

                            <input
                              type="file"
                              disabled={uploadingField === q.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];

                                if (f) {
                                  void handleFileUpload(q.id, f);
                                }

                                e.currentTarget.value = "";
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: activeTheme.primary,
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-xl transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting response..." : "Submit Questionnaire"}

              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        {/* Footer Branding */}
        <p className="mt-8 text-center text-[11px] text-slate-600">
          Powered by FormCraft • Obafemi Awolowo University
        </p>
      </div>
    </main>
  );
}
