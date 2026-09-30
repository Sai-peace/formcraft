"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  Copy,
  Check,
  Code,
  QrCode,
  Link2,
  ExternalLink,
} from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formTitle: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  formId,
  formTitle,
}: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<"link" | "qr" | "embed">("link");

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const publicUrl = `${origin}/f/${formId}`;

  const embedCode = `<iframe
  src="${publicUrl}"
  width="100%"
  height="700"
  frameborder="0"
  title="${formTitle.replace(/"/g, "&quot;")}"
  style="border: 0; border-radius: 12px;"
></iframe>`;

  const copyToClipboard = async (text: string, isEmbed = false) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      if (isEmbed) {
        setCopiedEmbed(true);

        window.setTimeout(() => {
          setCopiedEmbed(false);
        }, 2000);
      } else {
        setCopiedLink(true);

        window.setTimeout(() => {
          setCopiedLink(false);
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-form-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2
              id="share-form-title"
              className="text-base font-semibold text-slate-800"
            >
              Share Form
            </h2>

            <p className="text-xs text-slate-400 mt-1 truncate">{formTitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
            aria-label="Close share dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab("link")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                activeTab === "link"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Link2 size={14} />
              <span>Link</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("qr")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                activeTab === "qr"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <QrCode size={14} />
              <span>QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("embed")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                activeTab === "embed"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code size={14} />
              <span>Embed</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {/* Link Tab */}
          {activeTab === "link" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Direct URL
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Share this link with anyone who needs to complete the form.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={publicUrl}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 outline-none"
                />

                <button
                  type="button"
                  onClick={() => copyToClipboard(publicUrl, false)}
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-sm"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition"
              >
                <ExternalLink size={13} />
                Open preview in new tab
              </a>
            </div>
          )}

          {/* QR Code Tab */}
          {activeTab === "qr" && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-slate-800">
                  QR Code
                </h3>

                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Scan with any smartphone camera to open and fill out this form
                  immediately.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <QRCodeSVG
                  value={publicUrl}
                  size={220}
                  level="M"
                  includeMargin
                />
              </div>

              <p className="mt-4 text-[11px] text-slate-400 break-all max-w-sm">
                {publicUrl}
              </p>
            </div>
          )}

          {/* Embed Tab */}
          {activeTab === "embed" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  iFrame Embed Code
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Copy this snippet and paste it into your website HTML.
                </p>
              </div>

              <div className="relative">
                <textarea
                  value={embedCode}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  rows={8}
                  className="w-full resize-none bg-slate-900 text-slate-200 rounded-xl p-4 text-xs font-mono leading-5 outline-none border border-slate-700"
                />
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(embedCode, true)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                {copiedEmbed ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied Embed Code!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
