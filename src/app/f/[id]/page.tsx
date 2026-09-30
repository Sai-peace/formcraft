"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Paperclip,
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

const THEME_PALETTES: Record<
  string,
  {
    primary: string;
    hover: string;
    light: string;
  }
> = {
  indigo: {
    primary: "#4f46e5",
    hover: "#4338ca",
    light: "#eef2ff",
  },
  emerald: {
    primary: "#059669",
    hover: "#047857",
    light: "#ecfdf5",
  },
  violet: {
    primary: "#7c3aed",
    hover: "#6d28d9",
    light: "#f5f3ff",
  },
  amber: {
    primary: "#d97706",
    hover: "#b45309",
    light: "#fffbeb",
  },
  rose: {
    primary: "#e11d48",
    hover: "#be123c",
    light: "#fff1f2",
  },
  slate: {
    primary: "#1e293b",
    hover: "#0f172a",
    light: "#f1f5f9",
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submitting) return;

    setErrorMsg(null);

    // Validate top-level email collection if enabled.
    if (form?.collectEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const email = respondentEmail.trim();

      if (!email || !emailRegex.test(email)) {
        setErrorMsg("Please enter a valid email address.");
        return;
      }
    }

    // Validate required questions and email fields.
    for (const q of questions) {
      const val = answers[q.id];

      if (q.required) {
        const empty =
          val === undefined ||
          val === null ||
          (typeof val === "string" && val.trim() === "") ||
          (Array.isArray(val) && val.length === 0);

        if (empty) {
          setErrorMsg(`Please answer the required question: "${q.title}"`);
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

  const activeTheme =
    THEME_PALETTES[form?.theme || "indigo"] || THEME_PALETTES.indigo;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm">Loading form...</p>
        </div>
      </main>
    );
  }

  if (errorMsg && !form) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <AlertCircle size={42} className="mx-auto text-rose-500 mb-4" />

          <h1 className="text-xl font-bold text-slate-800">Form Unavailable</h1>

          <p className="text-sm text-slate-500 mt-2">{errorMsg}</p>
        </div>
      </main>
    );
  }

  if (!form) {
    return null;
  }

  if (!form.published) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <AlertCircle size={42} className="mx-auto text-amber-500 mb-4" />

          <h1 className="text-xl font-bold text-slate-800">Form Closed</h1>

          <p className="text-sm text-slate-500 mt-2">
            This form is no longer accepting responses.
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          backgroundColor: activeTheme.light,
        }}
      >
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <CheckCircle2
            size={52}
            className="mx-auto mb-5"
            style={{
              color: activeTheme.primary,
            }}
          />

          <h1 className="text-2xl font-bold text-slate-800">
            Response Recorded
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 whitespace-pre-wrap">
            {form.customMessage ||
              `Thank you! Your response to "${form.title}" has been recorded.`}
          </p>

          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setRespondentEmail("");
              setErrorMsg(null);
              setSubmitted(false);
            }}
            style={{
              color: activeTheme.primary,
            }}
            className="mt-6 text-xs font-semibold hover:underline cursor-pointer"
          >
            Submit another response
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6"
      style={{
        borderTop: `6px solid ${activeTheme.primary}`,
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 mb-5">
          <div
            className="h-1.5 w-16 rounded-full mb-5"
            style={{
              backgroundColor: activeTheme.primary,
            }}
          />

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {form.title}
          </h1>

          {form.description && (
            <p className="mt-3 text-sm leading-6 text-slate-500 whitespace-pre-wrap">
              {form.description}
            </p>
          )}

          <p className="mt-5 text-xs text-slate-400">
            <span
              style={{
                color: activeTheme.primary,
              }}
            >
              *
            </span>{" "}
            Indicates required question
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div
            className="mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm"
            style={{
              borderColor: "#fecdd3",
              backgroundColor: "#fff1f2",
              color: "#be123c",
            }}
            role="alert"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />

            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Top-Level Email Collection */}
          {form.collectEmail && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <div className="flex items-start gap-2">
                <span
                  className="text-xs font-semibold shrink-0 mt-1"
                  style={{
                    color: activeTheme.primary,
                  }}
                >
                  •
                </span>

                <div className="flex-1">
                  <h2 className="text-sm sm:text-base font-medium text-slate-800 leading-6">
                    Email Address
                    <span
                      className="ml-1"
                      style={{
                        color: activeTheme.primary,
                      }}
                      aria-label="Required"
                    >
                      *
                    </span>
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Your email address will be recorded with your submission.
                  </p>

                  <input
                    type="email"
                    value={respondentEmail}
                    onChange={(e) => setRespondentEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    className="mt-4 w-full border-b border-slate-200 bg-transparent pb-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = activeTheme.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Form Questions */}
          {questions.map((q, idx) => {
            const fileAnswer =
              answers[q.id] &&
              typeof answers[q.id] === "object" &&
              !Array.isArray(answers[q.id])
                ? (answers[q.id] as UploadedFile)
                : null;

            return (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-xs font-semibold shrink-0 mt-1"
                    style={{
                      color: activeTheme.primary,
                    }}
                  >
                    {idx + 1}.
                  </span>

                  <div className="flex-1">
                    {/* Question Title */}
                    <h2 className="text-sm sm:text-base font-medium text-slate-800 leading-6">
                      {q.title}

                      {q.required && (
                        <span
                          className="ml-1"
                          style={{
                            color: activeTheme.primary,
                          }}
                          aria-label="Required"
                        >
                          *
                        </span>
                      )}
                    </h2>

                    {/* Email Question */}
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
                        placeholder="name@example.com"
                        autoComplete="email"
                        className="mt-4 w-full border-b border-slate-200 bg-transparent pb-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400"
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor =
                            activeTheme.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      />
                    )}

                    {/* Short Answer */}
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
                        className="mt-4 w-full border-b border-slate-200 bg-transparent pb-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400"
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor =
                            activeTheme.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      />
                    )}

                    {/* Multiple Choice */}
                    {q.type === "multiple_choice" && (
                      <div className="mt-4 space-y-3">
                        {(q.options || []).map((opt, optionIndex) => (
                          <label
                            key={`${q.id}-${optionIndex}`}
                            className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer"
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
                              className="h-4 w-4 cursor-pointer"
                            />

                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Checkboxes */}
                    {q.type === "checkbox" && (
                      <div className="mt-4 space-y-3">
                        {(q.options || []).map((opt, optionIndex) => {
                          const answer = answers[q.id];

                          const selected =
                            Array.isArray(answer) && answer.includes(opt);

                          return (
                            <label
                              key={`${q.id}-${optionIndex}`}
                              className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                value={opt}
                                checked={selected}
                                onChange={() => handleCheckboxChange(q.id, opt)}
                                style={{
                                  accentColor: activeTheme.primary,
                                }}
                                className="h-4 w-4 cursor-pointer rounded"
                              />

                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Dropdown */}
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
                        className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition"
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor =
                            activeTheme.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      >
                        <option value="">Select an option</option>

                        {(q.options || []).map((opt, optionIndex) => (
                          <option key={`${q.id}-${optionIndex}`} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Date */}
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
                        className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition"
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor =
                            activeTheme.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      />
                    )}

                    {/* File Upload */}
                    {q.type === "file_upload" && (
                      <div className="mt-4">
                        {fileAnswer ? (
                          <div
                            className="flex items-center gap-3 rounded-xl border p-3"
                            style={{
                              borderColor: activeTheme.primary,
                              backgroundColor: activeTheme.light,
                            }}
                          >
                            <Paperclip
                              size={18}
                              style={{
                                color: activeTheme.primary,
                              }}
                              className="shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {fileAnswer.name}
                              </p>

                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {(fileAnswer.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleInputChange(q.id, null)}
                              className="text-rose-500 hover:text-rose-700 text-xs font-medium cursor-pointer shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label
                            className={`block border-2 border-dashed rounded-xl p-6 text-center transition ${
                              uploadingField === q.id
                                ? "cursor-wait opacity-70"
                                : "cursor-pointer hover:bg-slate-50"
                            }`}
                            style={{
                              borderColor: activeTheme.primary,
                            }}
                          >
                            <UploadCloud
                              size={28}
                              className="mx-auto mb-2"
                              style={{
                                color: activeTheme.primary,
                              }}
                            />

                            <span className="block text-sm font-medium text-slate-700">
                              {uploadingField === q.id
                                ? "Uploading file..."
                                : "Click to select a file"}
                            </span>

                            <span className="block text-[11px] text-slate-400 mt-1">
                              Max file size: 10MB
                            </span>

                            <input
                              type="file"
                              disabled={uploadingField === q.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];

                                if (file) {
                                  handleFileUpload(q.id, file);
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
            );
          })}

          {/* Submit */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <button
              type="submit"
              disabled={submitting || uploadingField !== null}
              style={{
                backgroundColor:
                  submitting || uploadingField !== null
                    ? "#94a3b8"
                    : activeTheme.primary,
              }}
              onMouseEnter={(e) => {
                if (!submitting && uploadingField === null) {
                  e.currentTarget.style.backgroundColor = activeTheme.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting && uploadingField === null) {
                  e.currentTarget.style.backgroundColor = activeTheme.primary;
                }
              }}
              className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? "Submitting..." : "Submit Form"}
            </button>

            <p className="mt-4 text-center text-[11px] text-slate-400">
              Never submit passwords via FormCraft.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
