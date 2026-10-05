"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
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
  Palette,
  Sparkles,
  Zap,
} from "lucide-react";

interface FormItem {
  id: string;
  title: string;
  description?: string;
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
  color: string;
}

interface FaqItem {
  q: string;
  a: string;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [forms, setForms] = useState<FormItem[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadForms() {
      if (!session) return;

      setLoadingForms(true);

      try {
        const res = await fetch("/api/forms");

        if (res.ok && !ignore) {
          const data: FormItem[] = await res.json();
          setForms(data);
        }
      } catch (err) {
        console.error("Failed to fetch forms", err);
      } finally {
        if (!ignore) {
          setLoadingForms(false);
        }
      }
    }

    loadForms();

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

      const newForm = await res.json();

      if (newForm?.id) {
        router.push(`/builder/${newForm.id}`);
      }
    } catch (err) {
      console.error("Error creating form", err);
    }
  };

  const deleteForm = async (id: string) => {
    if (!confirm("Are you sure you want to delete this form?")) return;

    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setForms((prev) => prev.filter((form) => form.id !== id));
      }
    } catch (err) {
      console.error("Error deleting form", err);
    }
  };

  const copyShareLink = async (id: string) => {
    const url = `${window.location.origin}/f/${id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);

      window.setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-500">Loading FormCraft...</p>
      </main>
    );
  }

  if (session) {
    const filteredForms = forms.filter((form) =>
      form.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const templates: Template[] = [
      {
        title: "Blank Form",
        desc: "Start from a clean slate",
        icon: Plus,
        color:
          "bg-indigo-50 text-indigo-600 border-indigo-200 hover:border-indigo-400",
      },
      {
        title: "Customer Feedback",
        desc: "CSAT score and opinions",
        icon: FileText,
        color:
          "bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-400",
      },
      {
        title: "Event RSVP",
        desc: "Headcounts & meal options",
        icon: Layers,
        color:
          "bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-400",
      },
      {
        title: "Course Evaluation",
        desc: "Instructor and lesson feedback",
        icon: BarChart3,
        color:
          "bg-purple-50 text-purple-600 border-purple-200 hover:border-purple-400",
      },
    ];

    return (
      <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-3 sm:px-6">
            <div className="flex min-h-[68px] items-center justify-between gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex min-w-0 shrink-0 cursor-pointer items-center gap-2"
                aria-label="Go to FormCraft home"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <span className="font-bold">FC</span>
                </div>

                <span className="hidden text-lg font-bold text-slate-900 sm:inline">
                  FormCraft
                </span>
              </button>

              <div className="hidden w-full max-w-md md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your forms..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-100/80 py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => createForm()}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 sm:px-4 sm:text-sm"
                >
                  <Plus className="h-4 w-4 shrink-0" />

                  <span className="sm:hidden">New</span>
                  <span className="hidden sm:inline">New Form</span>
                </button>

                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-9 sm:w-9"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 sm:h-9 sm:w-9">
                    {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => signOut()}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="cursor-pointer rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="pb-3 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your forms..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-100/80 py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8">
          <section>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-slate-900">
                Start with a Template
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Choose a template or start with a blank form.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {templates.map((template) => {
                const Icon = template.icon;

                return (
                  <button
                    key={template.title}
                    type="button"
                    onClick={() => createForm(template.title)}
                    className="group flex min-h-[170px] cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div
                      className={`mb-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${template.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-semibold text-slate-800">
                        {template.title}
                      </h2>

                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        {template.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">Your Forms</h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredForms.length}{" "}
                {filteredForms.length === 1 ? "form" : "forms"}
              </p>
            </div>

            {loadingForms ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 sm:p-10">
                Loading your forms...
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center sm:p-12">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />

                <h3 className="mt-4 font-semibold text-slate-800">
                  No forms yet
                </h3>

                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                  {searchQuery
                    ? "No forms matched your search criteria."
                    : "Create your first form to start gathering responses."}
                </p>

                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => createForm()}
                    className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create Form
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredForms.map((form) => (
                  <div
                    key={form.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm sm:p-5"
                  >
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/builder/${form.id}`)}
                          className="block max-w-full cursor-pointer truncate text-left text-sm font-semibold text-slate-800 transition hover:text-indigo-600"
                        >
                          {form.title}
                        </button>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              form.published
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {form.published ? "Active" : "Draft"}
                          </span>

                          <span className="text-xs text-slate-400">
                            {form._count?.responses ?? 0}{" "}
                            {(form._count?.responses ?? 0) === 1
                              ? "response"
                              : "responses"}
                          </span>
                        </div>

                        <p className="mt-2 break-words text-sm leading-5 text-slate-500 sm:truncate">
                          {form.description || "No description provided."}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center justify-end gap-1 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => copyShareLink(form.id)}
                          title="Copy Link"
                          aria-label={`Copy share link for ${form.title}`}
                          className="cursor-pointer rounded-md p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        >
                          {copiedId === form.id ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>

                        <a
                          href={`/f/${form.id}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Form"
                          aria-label={`Open ${form.title}`}
                          className="rounded-md p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => deleteForm(form.id)}
                          title="Delete Form"
                          aria-label={`Delete ${form.title}`}
                          className="cursor-pointer rounded-md p-2.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  const faqs: FaqItem[] = [
    {
      q: "Is FormCraft free to use?",
      a: "Yes. FormCraft allows you to create unlimited forms, share public submission links, and view aggregated response statistics.",
    },
    {
      q: "Do respondents need a Google account to fill out forms?",
      a: "No. Anyone with your public link can submit responses immediately without creating an account.",
    },
    {
      q: "Can I export responses to CSV?",
      a: "Yes. The responses tab includes 1-click CSV export so you can analyze submissions in Excel or Google Sheets.",
    },
    {
      q: "Can I limit submissions per respondent?",
      a: "Yes, you can toggle submission limits and restrict responses inside the Form Settings tab.",
    },
  ];

  const answerOptions = [
    "Extremely seamless",
    "Straightforward",
    "Neutral",
    "Needs optimization",
  ];

  const analytics = [
    {
      label: "Extremely seamless",
      percent: 64,
      count: 82,
      color: "bg-indigo-600",
    },
    {
      label: "Straightforward",
      percent: 22,
      count: 28,
      color: "bg-indigo-400",
    },
    {
      label: "Neutral",
      percent: 10,
      count: 13,
      color: "bg-slate-400",
    },
    {
      label: "Needs optimization",
      percent: 4,
      count: 5,
      color: "bg-amber-400",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="flex min-w-0 shrink-0 cursor-pointer items-center gap-2"
            aria-label="Go to top"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white sm:h-9 sm:w-9 sm:text-sm">
              FC
            </div>

            <span className="text-sm font-bold text-slate-900 sm:text-base">
              FormCraft
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <button
              type="button"
              onClick={() => signIn("google")}
              className="cursor-pointer rounded-lg px-2 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:px-3 sm:text-xs"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => signIn("google")}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:gap-1.5 sm:px-4 sm:text-xs"
            >
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Get Started</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating glass navigation */}
      <nav
        className="fixed left-1/2 top-[76px] z-[100] flex w-[calc(100%-1rem)] max-w-[440px] -translate-x-1/2 overflow-x-auto rounded-full border border-white/60 bg-white/55 p-1 shadow-lg shadow-slate-900/10 backdrop-blur-xl backdrop-saturate-150 sm:top-[88px] sm:w-fit sm:max-w-[calc(100%-2rem)]"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        aria-label="Page sections"
      >
        <div className="mx-auto flex shrink-0 items-center gap-1">
          {["Create", "Customize", "Analyze", "Security", "FAQs"].map(
            (item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-medium text-slate-700 transition hover:bg-white/60 hover:text-slate-950 sm:px-4 sm:text-xs"
              >
                {item}
              </a>
            ),
          )}
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-4 pb-16 pt-28 text-center sm:px-6 sm:pb-20 sm:pt-32">
        <div className="mx-auto mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700 sm:text-xs">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Simple forms. Smarter workflows.</span>
        </div>

        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl sm:leading-tight lg:text-6xl">
          The Intelligent Standard for Form Creation
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-6 sm:text-base sm:leading-7">
          Craft modern questionnaires, capture live responses, and analyze
          metrics with zero friction and a clean, responsive workflow built for
          precision and speed.
        </p>

        <button
          type="button"
          onClick={() => signIn("google")}
          className="mx-auto mt-7 flex w-full max-w-[230px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 sm:mt-8"
        >
          Start Building Free
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section
        id="create"
        className="scroll-mt-32 bg-slate-50 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div>
            <p className="text-sm font-semibold text-indigo-600">01 · CREATE</p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Drag & Drop Builder
            </h2>

            <h3 className="mt-5 font-semibold text-slate-800">
              Adaptive Question Architecture
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Add multiple choice, dropdowns, short responses, linear scales,
              and date pickers. Reorder questions effortlessly with fluid
              drag-and-drop.
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-400 sm:text-xs">
                Question 1 · Multiple Choice
              </span>

              <span className="text-[11px] font-medium text-rose-500 sm:text-xs">
                Required
              </span>
            </div>

            <p className="mt-5 text-sm font-semibold leading-5 text-slate-800 sm:text-base">
              How would you rate your product onboarding experience?
            </p>

            <div className="mt-4 space-y-2">
              {answerOptions.map((opt, i) => (
                <div
                  key={opt}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 p-3 text-xs text-slate-600 sm:text-sm"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      i === 0 ? "border-indigo-600" : "border-slate-300"
                    }`}
                  >
                    {i === 0 && (
                      <span className="block h-1.5 w-1.5 rounded-full bg-indigo-600" />
                    )}
                  </span>

                  <span className="min-w-0 break-words">{opt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="customize"
        className="scroll-mt-32 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-indigo-600">
              02 · CUSTOMIZE
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Brand Aesthetics
            </h2>

            <p className="mt-3 text-sm text-slate-500 sm:text-base">
              Clean Visual Workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Every element is structured for readability, modern ergonomics,
              and zero distractions.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Palette,
                title: "Balanced Contrast",
                text: "Curated slate palette calibrated to reduce fatigue during extended form design sessions.",
              },
              {
                icon: Layers,
                title: "Drag & Drop Engine",
                text: "Dnd-kit integration ensures fluid reordering across nested options and field cards.",
              },
              {
                icon: Zap,
                title: "Instant Preview",
                text: "Review published respondent interfaces in real time before distributing public links.",
              },
              {
                icon: Shield,
                title: "Consistent Design",
                text: "Keep forms visually coherent with reusable components and structured layouts.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <Icon className="h-5 w-5 text-indigo-600" />

                  <h3 className="mt-4 font-semibold text-slate-800">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="analyze"
        className="scroll-mt-32 bg-slate-50 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              03 · ANALYZE
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Live Insights
            </h2>

            <h3 className="mt-5 font-semibold text-slate-800">
              Real-Time Visual Analytics
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Watch response counters populate live. Automatic percentage
              breakdowns and charts allow you to extract actionable intelligence
              immediately.
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Response Metrics
                </p>

                <p className="mt-1 text-xs text-slate-400">Live preview data</p>
              </div>

              <p className="text-xl font-bold text-slate-900 sm:text-2xl">
                128{" "}
                <span className="text-xs font-medium sm:text-sm">
                  Submissions
                </span>
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {analytics.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-start justify-between gap-3 text-xs">
                    <span className="min-w-0 break-words text-slate-600">
                      {item.label}
                    </span>

                    <span className="shrink-0 font-medium text-slate-700">
                      {item.count} ({item.percent}%)
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{
                        width: `${item.percent}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="security"
        className="scroll-mt-32 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-indigo-600">04 · SECURITY</p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Trust & Security
          </h2>

          <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-3">
            {[
              {
                title: "Protected Submissions",
                text: "Built with strict session integrity and secure database relations.",
                icon: Shield,
              },
              {
                title: "Google OAuth 2.0",
                text: "Direct authentication without storing plaintext passwords on your server.",
                icon: Sparkles,
              },
              {
                title: "Private Records",
                text: "Respondents submit securely and responses are queryable only by the verified form owner.",
                icon: FileText,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  <Icon className="h-5 w-5 text-indigo-600" />

                  <h3 className="mt-4 font-semibold text-slate-800">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="faqs"
        className="scroll-mt-32 bg-slate-50 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-indigo-600">05 · FAQ</p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Frequently Asked Questions
          </h2>

          <div className="mt-7 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white sm:mt-8">
            {faqs.map((faq, idx) => (
              <div key={faq.q}>
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="flex w-full cursor-pointer items-start justify-between gap-4 px-4 py-4 text-left text-sm font-medium leading-6 text-slate-800 transition hover:bg-slate-50 sm:px-5"
                  aria-expanded={activeFaq === idx}
                >
                  <span className="min-w-0">{faq.q}</span>

                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 transition-transform ${
                      activeFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {activeFaq === idx && (
                  <div className="px-4 pb-5 text-sm leading-6 text-slate-500 sm:px-5">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            FC
          </div>

          <div>
            <p className="font-semibold text-slate-800">FormCraft</p>

            <p className="text-xs leading-5 text-slate-400">
              © {new Date().getFullYear()} FormCraft. Engineered for modern
              feedback and workflows.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}