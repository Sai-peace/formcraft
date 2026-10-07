"use client";

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  Copy,
  Check,
  Code,
  QrCode,
  Link2,
  ExternalLink,
  Download,
  Share2,
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
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/f/${formId}`;

  const embedCode = `<iframe
  src="${publicUrl}"
  width="100%"
  height="700"
  frameborder="0"
  title="${formTitle.replace(/"/g, "&quot;")}"
  style="border: 0; border-radius: 16px;"
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
        window.setTimeout(() => setCopiedEmbed(false), 2000);
      } else {
        setCopiedLink(true);
        window.setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadQrCode = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20, 360, 360);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${formTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-form-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-slate-900/95 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="h-4 w-4 text-indigo-400" />
              <h2
                id="share-form-title"
                className="text-base font-bold text-white tracking-tight"
              >
                Distribute Questionnaire
              </h2>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-sm">
              {formTitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close share dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-5">
          <div className="flex items-center gap-1.5 bg-slate-950/80 rounded-2xl p-1.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("link")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                activeTab === "link"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Link2 size={14} />
              <span>Direct Link</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("qr")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                activeTab === "qr"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <QrCode size={14} />
              <span>QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("embed")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                activeTab === "embed"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Code size={14} />
              <span>iFrame Embed</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Link Tab */}
          {activeTab === "link" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Shareable URL
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Send this link on WhatsApp groups or student portals for
                  respondents to complete.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={publicUrl}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3.5 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 outline-none select-all"
                />

                <button
                  type="button"
                  onClick={() => copyToClipboard(publicUrl, false)}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition hover:underline"
                >
                  <ExternalLink size={13} />
                  Test respondent view in new tab
                </a>

                <span className="text-slate-500 font-mono text-[11px]">
                  SSL Secured
                </span>
              </div>
            </div>
          )}

          {/* QR Code Tab */}
          {activeTab === "qr" && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Instant Scan Code
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Display on lecture hall screens or flyers for immediate mobile
                  scan.
                </p>
              </div>

              <div
                ref={qrRef}
                className="p-5 bg-white border border-slate-700/80 rounded-2xl shadow-xl flex items-center justify-center"
              >
                <QRCodeSVG
                  value={publicUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="mt-5 flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={downloadQrCode}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(publicUrl, false)}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Embed Tab */}
          {activeTab === "embed" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  HTML iFrame Snippet
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Embed this questionnaire directly on student blogs or campus
                  web portals.
                </p>
              </div>

              <textarea
                value={embedCode}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                rows={5}
                className="w-full resize-none bg-slate-950 text-slate-300 rounded-2xl p-4 text-xs font-mono leading-5 outline-none border border-slate-800 select-all"
              />

              <button
                type="button"
                onClick={() => copyToClipboard(embedCode, true)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700"
              >
                {copiedEmbed ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied iFrame Code!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Embed Snippet</span>
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
