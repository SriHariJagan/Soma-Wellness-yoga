import React, { useCallback, useEffect, useState } from "react";
import { galleryAdminApi } from "../api/AdminServices.js";
import { GALLERY_CATEGORIES } from "../../config/galleryCategories.js";

const API = import.meta.env.VITE_API_URL || "";

function inputStyle() {
  return {
    width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 14,
    border: "1px solid var(--soma-line-strong)", background: "#fff", color: "var(--soma-charcoal)",
  };
}

async function uploadWithFile(payload, file) {
  const token = localStorage.getItem("token");
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
  if (file) fd.append("image", file);
  const res = await fetch(`${API}/api/admin/gallery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data;
}

/**
 * GalleryManager — admin gallery CRUD (communications.gallery).
 * Upload ≤8MB images; server optimizes to WebP + thumbnails.
 */
export default function GalleryManager() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ category: "", active: "" });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "Studio", order: 0, active: true, altText: "" });
  const [msg, setMsg] = useState({ text: "", tone: "" });

  const flash = useCallback((text, tone = "ok") => {
    setMsg({ text, tone });
    setTimeout(() => setMsg({ text: "", tone: "" }), 5000);
  }, []);

  const { category: filterCategory, active: filterActive } = filter;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await galleryAdminApi.list({ category: filterCategory, active: filterActive, limit: 100 });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      flash(err.message || "Could not load gallery", "err");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterActive, flash]);

  useEffect(() => { load(); }, [load]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : "");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { flash("Choose an image file first (JPG/PNG/WebP/GIF, max 8 MB)", "err"); return; }
    setUploading(true);
    try {
      await uploadWithFile({ ...form, active: String(form.active) }, file);
      flash("Image uploaded and optimized.");
      setForm({ title: "", description: "", category: "Studio", order: 0, active: true, altText: "" });
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      await load();
    } catch (err) {
      flash(err.message || "Upload failed", "err");
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await galleryAdminApi.update(item._id, { active: !item.active });
      await load();
    } catch (err) {
      flash(err.message || "Update failed", "err");
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await galleryAdminApi.remove(item._id);
      flash("Image deleted.");
      await load();
    } catch (err) {
      flash(err.message || "Delete failed", "err");
    }
  };

  const move = async (item, dir) => {
    try {
      await galleryAdminApi.update(item._id, { order: (item.order || 0) + dir });
      await load();
    } catch (err) {
      flash(err.message || "Reorder failed", "err");
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {msg.text && (
        <div role={msg.tone === "err" ? "alert" : "status"} style={{
          padding: "10px 14px", borderRadius: 10, fontSize: 14,
          background: msg.tone === "err" ? "#FDECEC" : "#EEF5F0",
          border: "1px solid var(--soma-line-strong)",
          color: msg.tone === "err" ? "#B42318" : "var(--soma-forest)",
        }}>
          {msg.text}
        </div>
      )}

      <section aria-label="Upload image" style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 18 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 18, color: "var(--soma-forest)" }}>Upload image</h3>
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
            <label style={{
              width: 180, height: 120, borderRadius: 12, border: "1px dashed var(--soma-line-strong)",
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              cursor: "pointer", background: "#FAFAF7",
            }}>
              {previewUrl ? (
                <img src={previewUrl} alt="Upload preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 13, color: "#5a6b63", padding: 8, textAlign: "center" }}>Click to choose image (preview)</span>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFile} style={{ display: "none" }} aria-label="Choose gallery image" />
            </label>
            <div style={{ flex: 1, minWidth: 240, display: "grid", gap: 10 }}>
              <input style={inputStyle()} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={150} placeholder="Title *" aria-label="Image title" />
              <input style={inputStyle()} value={form.altText} onChange={(e) => setForm({ ...form, altText: e.target.value })} maxLength={200} placeholder="Alt text (defaults to title)" aria-label="Alt text" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <select style={inputStyle()} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} aria-label="Category">
                  {GALLERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input style={inputStyle()} type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} placeholder="Order" aria-label="Display order" />
                <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
                </label>
              </div>
            </div>
          </div>
          <textarea style={{ ...inputStyle(), minHeight: 70 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} placeholder="Description (optional)" aria-label="Image description" />
          <div>
            <button type="submit" disabled={uploading} style={{ background: "var(--soma-forest)", color: "#fff", borderRadius: 9999, padding: "10px 22px", fontSize: 13, fontWeight: 800 }}>
              {uploading ? "Uploading & optimizing…" : "Upload image"}
            </button>
          </div>
        </form>
      </section>

      <section aria-label="Gallery images" style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "var(--soma-forest)" }}>Images ({total})</h3>
          <select style={{ ...inputStyle(), maxWidth: 180 }} value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} aria-label="Filter by category">
            <option value="">All categories</option>
            {GALLERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={{ ...inputStyle(), maxWidth: 150 }} value={filter.active} onChange={(e) => setFilter({ ...filter, active: e.target.value })} aria-label="Filter by status">
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        {loading && <p role="status">Loading…</p>}
        {!loading && items.length === 0 && <p style={{ fontSize: 14, color: "#5a6b63" }}>No images yet. Upload the first one above.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {items.map((item) => (
            <article key={item._id} style={{ border: "1px solid var(--soma-line-light)", borderRadius: 12, overflow: "hidden", opacity: item.active ? 1 : 0.55 }}>
              <img
                src={`${API}${item.thumbnailUrl || item.imageUrl}`}
                alt={item.altText || item.title}
                loading="lazy"
                style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                onError={(e) => {
                  // Fall back from thumbnail to full image exactly once —
                  // retrying unconditionally re-fires error events forever.
                  const img = e.currentTarget;
                  if (img.dataset.fbk) { img.style.display = "none"; return; }
                  img.dataset.fbk = "1";
                  img.src = `${API}${item.imageUrl}`;
                }}
              />
              <div style={{ padding: 10 }}>
                <strong style={{ fontSize: 13, color: "var(--soma-forest)" }}>{item.title}</strong>
                <div style={{ fontSize: 11, color: "#5a6b63" }}>{item.category} · order {item.order} {item.active ? "" : "· inactive"}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => toggleActive(item)} style={{ fontSize: 11, border: "1px solid var(--soma-line-strong)", borderRadius: 9999, padding: "4px 10px" }}>
                    {item.active ? "Deactivate" : "Activate"}
                  </button>
                  <button type="button" onClick={() => move(item, -1)} aria-label={`Move ${item.title} up`} style={{ fontSize: 11, border: "1px solid var(--soma-line-strong)", borderRadius: 9999, padding: "4px 10px" }}>↑</button>
                  <button type="button" onClick={() => move(item, 1)} aria-label={`Move ${item.title} down`} style={{ fontSize: 11, border: "1px solid var(--soma-line-strong)", borderRadius: 9999, padding: "4px 10px" }}>↓</button>
                  <button type="button" onClick={() => remove(item)} style={{ fontSize: 11, border: "1px solid #F3B4B4", color: "#B42318", borderRadius: 9999, padding: "4px 10px" }}>Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
