"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  GraduationCap,
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
  type: QuestionField["type"] | "email" | "matric_number";
};

interface ThemePalette {
  primary: string;
  hover: string;
  light: string;
  bgRgba: string;
  borderRgba: string;
  glowRgba: string;
}

const THEME_PALETTES: Record<string, ThemePalette> = {
  indigo: {
    primary: "#6366f1",
    hover: "#4f46e5",
    light: "rgba(99, 102, 241, 0.15)",
    bgRgba: "rgba(99, 102, 241, 0.12)",
    borderRgba: "rgba(99, 102, 241, 0.4)",
    glowRgba: "rgba(99, 102, 241, 0.15)",
  },
  emerald: {
    primary: "#10b981",
    hover: "#059669",
    light: "rgba(16, 185, 129, 0.15)",
    bgRgba: "rgba(16, 185, 129, 0.12)",
    borderRgba: "rgba(16, 185, 129, 0.4)",
    glowRgba: "rgba(16, 185, 129, 0.15)",
  },
  violet: {
    primary: "#a855f7",
    hover: "#9333ea",
    light: "rgba(168, 85, 247, 0.15)",
    bgRgba: "rgba(168, 85, 247, 0.12)",
    borderRgba: "rgba(168, 85, 247, 0.4)",
    glowRgba: "rgba(168, 85, 247, 0.15)",
  },
  amber: {
    primary: "#f59e0b",
    hover: "#d97706",
    light: "rgba(245, 158, 11, 0.15)",
    bgRgba: "rgba(245, 158, 11, 0.12)",
    borderRgba: "rgba(245, 158, 11, 0.4)",
    glowRgba: "rgba(245, 158, 11, 0.15)",
  },
  rose: {
    primary: "#f43f5e",
    hover: "#e11d48",
    light: "rgba(244, 63, 94, 0.15)",
    bgRgba: "rgba(244, 63, 94, 0.12)",
    borderRgba: "rgba(244, 63, 94, 0.4)",
    glowRgba: "rgba(244, 63, 94, 0.15)",
  },
  slate: {
    primary: "#94a3b8",
    hover: "#64748b",
    light: "rgba(148, 163, 184, 0.15)",
    bgRgba: "rgba(148, 163, 184, 0.12)",
    borderRgba: "rgba(148, 163, 184, 0.4)",
    glowRgba: "rgba(148, 163, 184, 0.15)",
  },
};

const OAU_MATRIC_REGEX = /^[A-Z]{3,4}\/\d{4}\/\d{3,4}$/i;

export default function PublicFormPage() {
  const params = useParams();

  const formId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [form, setForm] = useState<PublicForm | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [respondentEmail, setRespondentEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"focus" | "classic">("focus");
  const [activeStep, setActiveStep] = useState(0);

  const handleInputChange = (questionId: string, value: AnswerValue): void => {
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

  const handleCheckboxChange = (questionId: string, option: string): void => {
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

  const handleFileUpload = async (
    questionId: string,
    file: File,
  ): Promise<void> => {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File size cannot exceed 10MB.");
      return;
    }

    setUploadingField(questionId);
    setErrorMsg(null);

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
      } = {};

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
    } catch (error) {
      console.error("Upload error:", error);
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

    const loadForm = async (): Promise<void> => {
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
          const parsedFields: unknown = JSON.parse(data.fields || "[]");

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
      } catch (error) {
        console.error("Error loading form:", error);

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
    };

    void loadForm();

    return () => {
      ignore = true;
    };
  }, [formId]);

  const totalSteps = useMemo(
    () => (form?.collectEmail ? 1 : 0) + questions.length,
    [form?.collectEmail, questions.length],
  );

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

    const value = answers[currentQ.id];

    if (currentQ.type === "matric_number") {
      const matricVal = typeof value === "string" ? value.trim() : "";
      if (currentQ.required && !matricVal) {
        setErrorMsg("Please enter your OAU matric number.");
        return false;
      }
      if (matricVal && !OAU_MATRIC_REGEX.test(matricVal)) {
        setErrorMsg(
          "Invalid OAU matric number format. Example: EEG/2021/104 or CSC/2020/045",
        );
        return false;
      }
    }

    if (currentQ.required) {
      const empty =
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0);

      if (empty) {
        setErrorMsg("Please answer this question to proceed.");
        return false;
      }
    }

    if (
      currentQ.type === "email" &&
      typeof value === "string" &&
      value.trim() !== ""
    ) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(value.trim())) {
        setErrorMsg("Please enter a valid email address.");
        return false;
      }
    }

    return true;
  };

  const handleNextStep = (): void => {
    if (!validateCurrentStep(activeStep)) return;

    if (activeStep < totalSteps - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = (): void => {
    setErrorMsg(null);

    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const triggerSubmit = useCallback(async (): Promise<void> => {
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

    for (const question of questions) {
      const value = answers[question.id];

      if (question.required) {
        const empty =
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0);

        if (empty) {
          setErrorMsg(`Please answer required question: "${question.title}"`);
          return;
        }
      }

      if (question.type === "matric_number") {
        const matricVal = typeof value === "string" ? value.trim() : "";
        if (question.required && !matricVal) {
          setErrorMsg(
            `Please provide a matric number for "${question.title}".`,
          );
          return;
        }
        if (matricVal && !OAU_MATRIC_REGEX.test(matricVal)) {
          setErrorMsg(
            `Invalid OAU matric number format for "${question.title}". Example: EEG/2021/104`,
          );
          return;
        }
      }

      if (
        question.type === "email" &&
        typeof value === "string" &&
        value.trim() !== ""
      ) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(value.trim())) {
          setErrorMsg(
            `Please enter a valid email address for "${question.title}".`,
          );
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
      } = {};

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
            redirectUrl.protocol !== "http:" &&
            redirectUrl.protocol !== "https:"
          ) {
            setErrorMsg("Invalid redirect URL.");
            return;
          }

          window.location.href = redirectUrl.toString();
          return;
        } catch {
          setErrorMsg("Invalid redirect URL.");
          return;
        }
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting response:", error);
      setErrorMsg("An unexpected error occurred while submitting.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, form, respondentEmail, questions, answers, formId]);

  useEffect(() => {
    if (viewMode !== "focus" || submitted || loading || totalSteps === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Enter" || event.shiftKey) return;

      const target = event.target as HTMLElement | null;

      if (target?.tagName.toLowerCase() === "textarea") {
        return;
      }

      event.preventDefault();

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
    handleNextStep,
    triggerSubmit,
  ]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: activeTheme.bgRgba }}
          >
            <LayoutList
              className="h-7 w-7"
              style={{ color: activeTheme.primary }}
            />
          </div>

          <p className="text-sm text-slate-400">Loading questionnaire...</p>
        </div>
      </main>
    );
  }

  if (errorMsg && !form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10">
            <AlertCircle className="h-7 w-7 text-rose-400" />
          </div>

          <h1 className="text-2xl font-bold">Form Unavailable</h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">{errorMsg}</p>
        </div>
      </main>
    );
  }

  if (!form) return null;

  if (!form.published) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <AlertCircle className="h-7 w-7 text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold">Questionnaire Closed</h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            This questionnaire is no longer accepting submissions.
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl sm:p-10">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: activeTheme.bgRgba }}
          >
            <CheckCircle2
              className="h-9 w-9"
              style={{ color: activeTheme.primary }}
            />
          </div>

          <p
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: activeTheme.primary }}
          >
            Submission Confirmed
          </p>

          <h1 className="mt-3 text-3xl font-bold">Response Recorded</h1>

          <p className="mt-4 text-sm leading-7 text-slate-400">
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
            className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold hover:underline"
          >
            Submit another response
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
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${activeTheme.glowRgba}, transparent 42%)`,
        }}
      />

      <div
        className="fixed left-0 right-0 top-0 z-50 h-1"
        style={{ backgroundColor: activeTheme.primary }}
      />

      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
              style={{ backgroundColor: activeTheme.primary }}
            >
              FC
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-white">
                {form.title}
              </h1>

              <p className="flex items-center gap-1 text-[11px] text-slate-500">
                <School className="h-3 w-3" />
                OAU Campus Survey
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/70 p-1">
            <button
              type="button"
              onClick={() => setViewMode("focus")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
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
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
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

        {viewMode === "focus" && totalSteps > 0 && (
          <div className="h-0.5 bg-slate-900">
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

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {viewMode === "focus" && (
          <section className="mx-auto max-w-2xl">
            <div className="mb-8 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-400">
                Question {Math.min(activeStep + 1, totalSteps)} of {totalSteps}
              </span>

              <span style={{ color: activeTheme.primary }}>
                {progressPercent}% completed
              </span>
            </div>

            <div className="min-h-[420px] rounded-3xl border border-slate-800 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
              {isFocusEmailStep ? (
                <div>
                  <div className="mb-8">
                    <p
                      className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]"
                      style={{ color: activeTheme.primary }}
                    >
                      Step 1
                    </p>

                    <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-300">
                      Required
                    </span>

                    <h2 className="mt-5 text-2xl font-bold leading-tight sm:text-3xl">
                      What is your official student email?
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      Your institutional address will be securely recorded with
                      your response.
                    </p>
                  </div>

                  <input
                    type="email"
                    value={respondentEmail}
                    onChange={(event) => setRespondentEmail(event.target.value)}
                    placeholder="name@student.oauife.edu.ng"
                    autoFocus
                    style={{
                      borderColor: respondentEmail
                        ? activeTheme.primary
                        : undefined,
                    }}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                  />
                </div>
              ) : currentFocusQ ? (
                <div>
                  <div className="mb-8">
                    <div className="mb-4 flex items-center gap-2">
                      <span
                        className="text-xs font-semibold uppercase tracking-[0.18em]"
                        style={{ color: activeTheme.primary }}
                      >
                        Question {activeStep + 1}
                      </span>

                      <span className="text-slate-700">•</span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          currentFocusQ.required
                            ? "bg-rose-500/10 text-rose-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {currentFocusQ.required ? "Required" : "Optional"}
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
                      {currentFocusQ.title}
                    </h2>
                  </div>

                  {currentFocusQ.type === "matric_number" && (
                    <div className="space-y-2">
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={
                            typeof answers[currentFocusQ.id] === "string"
                              ? (answers[currentFocusQ.id] as string)
                              : ""
                          }
                          onChange={(event) =>
                            handleInputChange(
                              currentFocusQ.id,
                              event.target.value.toUpperCase(),
                            )
                          }
                          placeholder="EEG/2021/104"
                          autoFocus
                          className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 pl-11 pr-4 py-3.5 text-sm uppercase tracking-wider text-white font-mono outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Format: DEPT/YEAR/NUMBER (e.g., CPE/2020/012 or
                        CSC/2021/045)
                      </p>
                    </div>
                  )}

                  {currentFocusQ.type === "short_answer" && (
                    <input
                      type="text"
                      value={
                        typeof answers[currentFocusQ.id] === "string"
                          ? (answers[currentFocusQ.id] as string)
                          : ""
                      }
                      onChange={(event) =>
                        handleInputChange(currentFocusQ.id, event.target.value)
                      }
                      placeholder="Type your response here..."
                      autoFocus
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
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
                      onChange={(event) =>
                        handleInputChange(currentFocusQ.id, event.target.value)
                      }
                      placeholder="name@student.oauife.edu.ng"
                      autoFocus
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                    />
                  )}

                  {currentFocusQ.type === "multiple_choice" && (
                    <div className="space-y-3">
                      {(currentFocusQ.options || []).map((option) => {
                        const isSelected = answers[currentFocusQ.id] === option;

                        return (
                          <button
                            type="button"
                            key={option}
                            onClick={() =>
                              handleInputChange(currentFocusQ.id, option)
                            }
                            style={{
                              borderColor: isSelected
                                ? activeTheme.primary
                                : undefined,
                              backgroundColor: isSelected
                                ? activeTheme.bgRgba
                                : undefined,
                            }}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border p-4 text-left text-xs font-medium transition sm:text-sm ${
                              isSelected
                                ? "text-white shadow-lg"
                                : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                            }`}
                          >
                            <span>{option}</span>

                            {isSelected && (
                              <CheckCircle2
                                className="h-5 w-5 shrink-0"
                                style={{
                                  color: activeTheme.primary,
                                }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentFocusQ.type === "checkbox" && (
                    <div className="space-y-3">
                      {(currentFocusQ.options || []).map((option) => {
                        const answer = answers[currentFocusQ.id];

                        const isSelected =
                          Array.isArray(answer) && answer.includes(option);

                        return (
                          <button
                            type="button"
                            key={option}
                            onClick={() =>
                              handleCheckboxChange(currentFocusQ.id, option)
                            }
                            style={{
                              borderColor: isSelected
                                ? activeTheme.primary
                                : undefined,
                              backgroundColor: isSelected
                                ? activeTheme.bgRgba
                                : undefined,
                            }}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border p-4 text-left text-xs font-medium transition sm:text-sm ${
                              isSelected
                                ? "text-white shadow-lg"
                                : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                            }`}
                          >
                            <span>{option}</span>

                            {isSelected && (
                              <span
                                className="text-lg font-bold"
                                style={{
                                  color: activeTheme.primary,
                                }}
                              >
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
                      onChange={(event) =>
                        handleInputChange(currentFocusQ.id, event.target.value)
                      }
                      autoFocus
                      className="w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition focus:border-slate-500"
                    >
                      <option value="">Select an option</option>
                      {(currentFocusQ.options || []).map((option) => (
                        <option key={option} value={option}>
                          {option}
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
                      onChange={(event) =>
                        handleInputChange(currentFocusQ.id, event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 text-sm text-slate-200 outline-none transition focus:border-slate-500"
                    />
                  )}

                  {currentFocusQ.type === "file_upload" && (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-5">
                      {answers[currentFocusQ.id] &&
                      typeof answers[currentFocusQ.id] === "object" &&
                      !Array.isArray(answers[currentFocusQ.id]) ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Paperclip className="h-5 w-5 shrink-0 text-slate-400" />

                            <span className="truncate text-sm text-slate-200">
                              {(answers[currentFocusQ.id] as UploadedFile).name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleInputChange(currentFocusQ.id, null)
                            }
                            className="ml-3 shrink-0 cursor-pointer text-xs text-rose-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="block cursor-pointer text-center">
                          <UploadCloud className="mx-auto mb-3 h-8 w-8 text-slate-500" />

                          <span className="text-sm font-medium text-slate-200">
                            {uploadingField === currentFocusQ.id
                              ? "Uploading file..."
                              : "Select attachment"}
                          </span>

                          <p className="mt-1 text-xs text-slate-500">
                            Max file size 10MB
                          </p>

                          <input
                            type="file"
                            disabled={uploadingField === currentFocusQ.id}
                            onChange={(event) => {
                              const file = event.target.files?.[0];

                              if (file) {
                                void handleFileUpload(currentFocusQ.id, file);
                              }

                              event.currentTarget.value = "";
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">
                  No questions available.
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={activeStep === 0 || submitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-800 px-5 py-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="hidden items-center gap-1.5 text-[10px] text-slate-600 sm:flex">
                <CornerDownLeft className="h-3 w-3" />
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
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl px-6 py-3 text-xs font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeStep === totalSteps - 1 ? (
                  <>
                    {submitting ? "Submitting..." : "Complete & Submit"}
                    {!submitting && <CheckCircle2 className="h-4 w-4" />}
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

        {viewMode === "classic" && (
          <section className="mx-auto max-w-3xl">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void triggerSubmit();
              }}
              className="space-y-5"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold sm:text-4xl">{form.title}</h1>

                {form.description && (
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                    {form.description}
                  </p>
                )}
              </div>

              {form.collectEmail && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <label className="text-sm font-semibold text-slate-200">
                    Student Email Address{" "}
                    <span className="text-rose-400">*</span>
                  </label>

                  <input
                    type="email"
                    value={respondentEmail}
                    onChange={(event) => setRespondentEmail(event.target.value)}
                    placeholder="name@student.oauife.edu.ng"
                    required
                    className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                  />
                </div>
              )}

              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{
                        backgroundColor: activeTheme.bgRgba,
                        color: activeTheme.primary,
                      }}
                    >
                      {index + 1}
                    </span>

                    <h2 className="pt-1 text-sm font-semibold text-slate-100">
                      {question.title}{" "}
                      {question.required && (
                        <span className="text-rose-400">*</span>
                      )}
                    </h2>
                  </div>

                  {question.type === "matric_number" && (
                    <div className="mt-4 space-y-2">
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={
                            typeof answers[question.id] === "string"
                              ? (answers[question.id] as string)
                              : ""
                          }
                          onChange={(event) =>
                            handleInputChange(
                              question.id,
                              event.target.value.toUpperCase(),
                            )
                          }
                          placeholder="EEG/2021/104"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-3 text-sm uppercase tracking-wider text-white font-mono outline-none placeholder:text-slate-600 focus:border-slate-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Format: DEPT/YEAR/NUMBER (e.g., CPE/2020/012 or
                        CSC/2021/045)
                      </p>
                    </div>
                  )}

                  {question.type === "short_answer" && (
                    <input
                      type="text"
                      value={
                        typeof answers[question.id] === "string"
                          ? (answers[question.id] as string)
                          : ""
                      }
                      onChange={(event) =>
                        handleInputChange(question.id, event.target.value)
                      }
                      placeholder="Your answer"
                      className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-500"
                    />
                  )}

                  {question.type === "email" && (
                    <input
                      type="email"
                      value={
                        typeof answers[question.id] === "string"
                          ? (answers[question.id] as string)
                          : ""
                      }
                      onChange={(event) =>
                        handleInputChange(question.id, event.target.value)
                      }
                      placeholder="name@student.oauife.edu.ng"
                      className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-500"
                    />
                  )}

                  {question.type === "multiple_choice" && (
                    <div className="mt-4 space-y-3">
                      {(question.options || []).map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-3 text-sm text-slate-300"
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(event) =>
                              handleInputChange(question.id, event.target.value)
                            }
                            style={{
                              accentColor: activeTheme.primary,
                            }}
                            className="h-4 w-4"
                          />

                          {option}
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === "checkbox" && (
                    <div className="mt-4 space-y-3">
                      {(question.options || []).map((option) => {
                        const answer = answers[question.id];

                        const selected =
                          Array.isArray(answer) && answer.includes(option);

                        return (
                          <label
                            key={option}
                            className="flex cursor-pointer items-center gap-3 text-sm text-slate-300"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                handleCheckboxChange(question.id, option)
                              }
                              style={{
                                accentColor: activeTheme.primary,
                              }}
                              className="h-4 w-4 rounded"
                            />

                            {option}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {question.type === "dropdown" && (
                    <select
                      value={
                        typeof answers[question.id] === "string"
                          ? (answers[question.id] as string)
                          : ""
                      }
                      onChange={(event) =>
                        handleInputChange(question.id, event.target.value)
                      }
                      className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-slate-500"
                    >
                      <option value="">Select an option</option>

                      {(question.options || []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}

                  {question.type === "date" && (
                    <input
                      type="date"
                      value={
                        typeof answers[question.id] === "string"
                          ? (answers[question.id] as string)
                          : ""
                      }
                      onChange={(event) =>
                        handleInputChange(question.id, event.target.value)
                      }
                      className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 outline-none focus:border-slate-500"
                    />
                  )}

                  {question.type === "file_upload" && (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-4">
                      {answers[question.id] &&
                      typeof answers[question.id] === "object" &&
                      !Array.isArray(answers[question.id]) ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />

                            <span className="truncate text-sm text-slate-300">
                              {(answers[question.id] as UploadedFile).name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleInputChange(question.id, null)}
                            className="shrink-0 cursor-pointer text-xs text-rose-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="block cursor-pointer text-center">
                          <UploadCloud className="mx-auto mb-2 h-7 w-7 text-slate-500" />

                          <span className="text-sm font-medium text-slate-300">
                            {uploadingField === question.id
                              ? "Uploading file..."
                              : "Select file to attach"}
                          </span>

                          <p className="mt-1 text-xs text-slate-500">
                            Maximum file size: 10MB
                          </p>

                          <input
                            type="file"
                            disabled={uploadingField === question.id}
                            onChange={(event) => {
                              const file = event.target.files?.[0];

                              if (file) {
                                void handleFileUpload(question.id, file);
                              }

                              event.currentTarget.value = "";
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: activeTheme.primary,
                }}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting response..." : "Submit Questionnaire"}

                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </section>
        )}
      </div>

      <footer className="relative z-10 border-t border-slate-900 px-6 py-8 text-center text-xs text-slate-600">
        Powered by FormCraft • Obafemi Awolowo University
      </footer>
    </main>
  );
}
