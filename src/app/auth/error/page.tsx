"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, School } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-200/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="border-b border-slate-100 px-6 py-7 text-center sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <School className="h-3.5 w-3.5" />
              OAU Authentication Only
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Access Restricted
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
              FormCraft is exclusively configured for Obafemi Awolowo
              University. Please sign in with your official generic student
              email address ending in:
            </p>

            <div className="mx-auto mt-5 w-fit rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
              <code className="break-all text-sm font-semibold text-indigo-700">
                @student.oauife.edu.ng
              </code>
            </div>
          </div>

          <div className="px-6 py-5 sm:px-8">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          FormCraft • Obafemi Awolowo University
        </p>
      </div>
    </main>
  );
}
