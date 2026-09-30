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

  const fetchForms = async () => {
    setLoadingForms(true);

    try {
      const res = await fetch("/api/forms");

      if (res.ok) {
        const data: FormItem[] = await res.json();
        setForms(data);
      }
    } catch (err) {
      console.error("Failed to fetch forms", err);
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function load() {
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

    load();

    return () => {
      ignore = true;
    };
  }, [session]);

  const createForm = async (templateName = "Blank Form") => {
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateName }),
      });
      if (res.ok) {
        const newForm = await res.json();
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

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
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
      <main className="min-h-screen bg-slate-50 text-slate-800">
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <span className="font-bold">FC</span>
              </div>
              <span className="text-lg font-bold">FormCraft</span>
            </div>

            <div className="relative hidden w-full max-w-md md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your forms..."
                className="w-full rounded-lg border border-slate-200 bg-slate-100/80 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => createForm()}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Form
              </button>

              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                  {session.user?.name?.charAt(0) || "U"}
                </div>
              )}

              <button
                type="button"
                onClick={() => signOut()}
                title="Sign Out"
                className="cursor-pointer rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-7xl px-6 py-8">
          <section>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-slate-900">
                Start with a Template
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Choose a template or start with a blank form.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {templates.map((template) => {
                const Icon = template.icon;

                return (
                  <button
                    key={template.title}
                    type="button"
                    onClick={() => createForm(template.title)}
                    className="group flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:shadow-md"
                  >
                    <div
                      className={`mb-6 flex h-11 w-11 items-center justify-center rounded-lg border ${template.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-semibold text-slate-800">
                        {template.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {template.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Your Forms</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredForms.length}{" "}
                  {filteredForms.length === 1 ? "form" : "forms"}
                </p>
              </div>
            </div>

            {loadingForms ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                Loading your forms...
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-4 font-semibold text-slate-800">
                  No forms yet
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  {searchQuery
                    ? "No forms matched your search criteria."
                    : "Create your first form to start gathering responses."}
                </p>

                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => createForm()}
                    className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
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
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => router.push(`/builder/${form.id}`)}
                        className="cursor-pointer truncate text-left text-sm font-semibold text-slate-800 transition hover:text-indigo-600"
                      >
                        {form.title}
                      </button>

                      <div className="mt-1 flex items-center gap-2">
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

                      <p className="mt-2 truncate text-sm text-slate-500">
                        {form.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyShareLink(form.id)}
                        title="Copy Link"
                        className="cursor-pointer rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
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
                        className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => deleteForm(form.id)}
                        title="Delete Form"
                        className="cursor-pointer rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
    <main className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              FC
            </div>
            <span className="font-bold">FormCraft</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => signIn("google")}
              className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => signIn("google")}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <nav className="mx-auto mt-6 flex w-fit flex-wrap justify-center gap-1 rounded-full border border-white/40 bg-white/30 backdrop-blur-md p-1 shadow-sm fixed top-20 left-1/2 -translate-x-1/2 z-40">
        {["Create", "Customize", "Analyze", "Security", "FAQs"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="rounded-full px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            {item}
          </a>
        ))}
      </nav>

      <section className="mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
        <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" />
          Simple forms. Smarter workflows.
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          The Intelligent Standard for Form Creation
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-500">
          Craft modern questionnaires, capture live responses, and analyze
          metrics with zero friction and a clean, responsive workflow built for
          precision and speed.
        </p>

        <button
          type="button"
          onClick={() => signIn("google")}
          className="mx-auto mt-8 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700"
        >
          Start Building Free
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section id="create" className="bg-slate-50 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold text-indigo-600">01 · CREATE</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Drag & Drop Builder
            </h2>
            <h3 className="mt-5 font-semibold text-slate-800">
              Adaptive Question Architecture
            </h3>
            <p className="mt-2 leading-7 text-slate-500">
              Add multiple choice, dropdowns, short responses, linear scales,
              and date pickers. Reorder questions effortlessly with fluid
              drag-and-drop.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Question 1 · Multiple Choice
              </span>
              <span className="text-xs font-medium text-rose-500">
                Required
              </span>
            </div>

            <p className="mt-5 font-semibold text-slate-800">
              How would you rate your product onboarding experience?
            </p>

            <div className="mt-4 space-y-2">
              {answerOptions.map((opt, i) => (
                <div
                  key={opt}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-600"
                >
                  <span
                    className={`h-4 w-4 rounded-full border-2 ${
                      i === 0 ? "border-indigo-600" : "border-slate-300"
                    }`}
                  >
                    {i === 0 && (
                      <span className="mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full bg-indigo-600" />
                    )}
                  </span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="customize" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-indigo-600">
              02 · CUSTOMIZE
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Brand Aesthetics
            </h2>
            <p className="mt-3 text-slate-500">Clean Visual Workspace</p>
            <p className="mt-2 leading-7 text-slate-500">
              Every element is structured for readability, modern ergonomics,
              and zero distractions.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

      <section id="analyze" className="bg-slate-50 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              03 · ANALYZE
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Live Insights
            </h2>
            <h3 className="mt-5 font-semibold text-slate-800">
              Real-Time Visual Analytics
            </h3>
            <p className="mt-2 leading-7 text-slate-500">
              Watch response counters populate live. Automatic percentage
              breakdowns and charts allow you to extract actionable intelligence
              immediately.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Response Metrics
                </p>
                <p className="mt-1 text-xs text-slate-400">Live preview data</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                128 <span className="text-sm font-medium">Submissions</span>
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {analytics.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-medium text-slate-700">
                      {item.count} ({item.percent}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-indigo-600">04 · SECURITY</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Trust & Security
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
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
                  className="rounded-xl border border-slate-200 bg-white p-6"
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

      <section id="faqs" className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-indigo-600">05 · FAQ</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Frequently Asked Questions
          </h2>

          <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {faqs.map((faq, idx) => (
              <div key={faq.q}>
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  {faq.q}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      activeFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-sm leading-6 text-slate-500">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            FC
          </div>
          <div>
            <p className="font-semibold text-slate-800">FormCraft</p>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} FormCraft. Engineered for modern
              feedback and workflows.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
