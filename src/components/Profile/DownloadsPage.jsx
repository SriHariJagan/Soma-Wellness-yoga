import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import c from "./ListCards.module.css";
import { Stagger, EmptyState, PageHeader } from "./widgets/DashboardWidgets";
import { getStudentDownloads, trackDownload, downloadAssetUrl } from "../api/StudentServices";

const TYPE_ICONS = {
  pdf: "ti-file-type-pdf", video: "ti-video", audio: "ti-music",
  guide: "ti-file-text", worksheet: "ti-file-spreadsheet",
  meditation: "ti-brain", document: "ti-file-text", other: "ti-file",
};

const TYPE_LABELS = {
  pdf: "PDF", video: "Video", audio: "Audio", guide: "Guide",
  worksheet: "Worksheet", meditation: "Meditation", document: "Document", other: "File",
};

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default function DownloadsPage() {
  const [files, setFiles] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const histKey = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return `soma-downloads-${u.id || u._id || "guest"}`;
    } catch {
      return "soma-downloads-guest";
    }
  };

  useEffect(() => {
    getStudentDownloads()
      .then(setFiles)
      .catch((err) => setError(err.message || "Failed to load downloads"))
      .finally(() => setLoading(false));
    try {
      const raw = localStorage.getItem(histKey());
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const recordHistory = (f) => {
    setHistory((prev) => {
      const next = [{ _id: f._id, name: f.name, originalName: f.originalName, type: f.type, at: new Date().toISOString() },
        ...prev.filter((h) => h._id !== f._id)].slice(0, 50);
      try { localStorage.setItem(histKey(), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleDownload = async (f) => {
    setDownloadingId(f._id);
    try {
      await trackDownload(f._id);
      const url = downloadAssetUrl(f._id);
      const token = localStorage.getItem("token");
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = f.originalName || `${f.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      recordHistory(f);
    } catch (err) {
      setError(err.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Downloads" />
        <EmptyState icon="ti-loader" title="Loading downloads..." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Downloads" sub="Library content shared with your plan, plus your own download history." />

      {error && (
        <div style={{ padding: 12, borderRadius: 8, background: "rgba(220,38,38,0.1)", color: "#DC2626", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", margin: "4px 0 12px" }}>
        Content to download ({files.length})
      </div>
      {files.length === 0 ? (
        <EmptyState icon="ti-folder-open" title="No downloads available for your current plan." sub="Content appears here when your instructor shares it with your membership tier." />
      ) : (
        <Stagger className={c.grid}>
          {files.map((f) => (
            <motion.div
              key={f._id}
              className={c.resCard}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              whileHover={{ y: -4 }}
            >
              <span className={c.resIcon} data-type={f.type}>
                <i className={`ti ${TYPE_ICONS[f.type] ?? "ti-file"}`} aria-hidden="true" />
              </span>
              <div className={c.resBody}>
                <div className={c.resName}>{f.name}</div>
                <div className={c.resMeta}>
                  {TYPE_LABELS[f.type] || f.type?.toUpperCase()} · {f.size || `${(f.fileSize / 1024 / 1024).toFixed(1)} MB`}
                  {f.category && ` · ${f.category}`}
                </div>
                <div className={c.resMeta} style={{ fontSize: 10, marginTop: 2 }}>
                  Added {fmtDate(f.createdAt)} · {f.downloadCount || 0} downloads
                </div>
              </div>
              <button
                className={c.iconBtn}
                aria-label={`Download ${f.name}`}
                onClick={() => handleDownload(f)}
                disabled={downloadingId === f._id}
                title="Download"
              >
                <i className={`ti ${downloadingId === f._id ? "ti-loader" : "ti-download"}`} aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </Stagger>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", margin: "28px 0 12px" }}>
        My downloads ({history.length})
      </div>
      {history.length === 0 ? (
        <EmptyState icon="ti-history" title="Nothing downloaded yet." sub="Files you download will be listed here for quick access." />
      ) : (
        <Stagger className={c.grid}>
          {history.map((h) => {
            const live = files.find((f) => f._id === h._id);
            return (
              <motion.div
                key={h._id}
                className={c.resCard}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                whileHover={{ y: -4 }}
              >
                <span className={c.resIcon} data-type={h.type}>
                  <i className={`ti ${TYPE_ICONS[h.type] ?? "ti-file"}`} aria-hidden="true" />
                </span>
                <div className={c.resBody}>
                  <div className={c.resName}>{h.name}</div>
                  <div className={c.resMeta}>
                    Downloaded {fmtDate(h.at)}
                    {!live && " · no longer shared"}
                  </div>
                </div>
                <button
                  className={c.iconBtn}
                  aria-label={`Download ${h.name} again`}
                  onClick={() => live ? handleDownload(live) : setError(`${h.name} is no longer shared with your plan.`)}
                  disabled={downloadingId === h._id}
                  title="Download again"
                >
                  <i className={`ti ${downloadingId === h._id ? "ti-loader" : "ti-download"}`} aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </Stagger>
      )}
    </>
  );
}
