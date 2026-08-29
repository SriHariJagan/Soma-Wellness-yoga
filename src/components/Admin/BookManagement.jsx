import { useCallback, useEffect, useState } from "react";
import { adminBooksApi } from "../api/AdminServices.js";
import s from "./BookManagement.module.css";

const inr = (n) => `KES ${Number(n || 0).toLocaleString("en-KE")}`;

const emptyBook = {
  title: "", slug: "", subtitle: "", authors: [], shortDescription: "", description: "",
  category: "Books", tags: [], sku: "", price: "", compareAtPrice: "", language: "English",
  edition: "", pages: "", coverImage: "", isPaperback: true, stock: 0, lowStockThreshold: 5,
  trackInventory: true, allowBackorder: false, status: "draft", featured: false, displayOrder: 0,
};

const STATUS_META = {
  published: { label: "Published", cls: "ok" },
  draft: { label: "Draft", cls: "muted" },
  archived: { label: "Archived", cls: "bad" },
};

export default function BookManagement() {
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(null); // null | {mode:'create'} | {mode:'edit', book}
  const [flash, setFlash] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stockAdjust, setStockAdjust] = useState(null); // {book, value}

  const showFlash = (message, type = "success") => {
    setFlash({ message, type });
    setTimeout(() => setFlash(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([adminBooksApi.list({ search, status, limit: 50 }), adminBooksApi.stats()]);
      setBooks(list.books || []);
      setStats(st || {});
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const available = (b) => Math.max(0, b.stock || 0);
  const isLowStock = (b) => b.trackInventory && b.status !== "archived" && available(b) <= (b.lowStockThreshold || 0);

  const saveBook = async (data) => {
    setSaving(true);
    try {
      if (modal.mode === "edit") {
        await adminBooksApi.update(modal.book._id, data);
        showFlash("Book updated");
      } else {
        await adminBooksApi.create(data);
        showFlash("Book created");
      }
      setModal(null);
      await load();
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const setBookStatus = async (book, st) => {
    try {
      await adminBooksApi.setStatus(book._id, st);
      showFlash(`Book ${st}`);
      await load();
    } catch (err) { showFlash(err.message, "error"); }
  };

  const applyStockAdjust = async (book, value) => {
    try {
      await adminBooksApi.adjustStock(book._id, Number(value));
      setStockAdjust(null);
      showFlash(`Stock set to ${value}`);
      await load();
    } catch (err) { showFlash(err.message, "error"); }
  };

  return (
    <div>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Books</h1>
          <p className={s.sub}>Catalogue, inventory and stock alerts</p>
        </div>
        <button className={s.primaryBtn} onClick={() => setModal({ mode: "create" })}>+ Add Book</button>
      </div>

      {flash && <div className={`${s.flash} ${flash.type === "error" ? s.flashError : ""}`}>{flash.message}</div>}

      <div className={s.statsRow}>
        <div className={s.stat}><span className={s.statValue}>{stats.total ?? "–"}</span><span className={s.statLabel}>Total books</span></div>
        <div className={s.stat}><span className={s.statValue}>{stats.published ?? "–"}</span><span className={s.statLabel}>Published</span></div>
        <div className={s.stat}><span className={s.statValue}>{stats.drafts ?? "–"}</span><span className={s.statLabel}>Drafts</span></div>
        <div className={`${s.stat} ${stats.lowStock > 0 ? s.statAlert : ""}`}><span className={s.statValue}>{stats.lowStock ?? "–"}</span><span className={s.statLabel}>Low stock</span></div>
      </div>

      <div className={s.toolbar}>
        <input className={s.search} placeholder="Search title, SKU, author…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <p className={s.loading}>Loading books…</p>
      ) : books.length === 0 ? (
        <p className={s.loading}>No books found. Add your first book.</p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Book</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b._id} className={b.status === "archived" ? s.rowMuted : ""}>
                  <td>
                    <div className={s.bookCell}>
                      {b.coverImage ? <img src={b.coverImage} alt="" className={s.thumb} /> : <div className={s.thumbPlaceholder}>{b.title.slice(0, 1)}</div>}
                      <div>
                        <div className={s.bookTitle}>{b.title}</div>
                        <div className={s.bookMeta}>{(b.authors || []).join(", ")}</div>
                        {isLowStock(b) && <span className={s.lowStockBadge}>Low stock</span>}
                      </div>
                    </div>
                  </td>
                  <td className={s.mono}>{b.sku}</td>
                  <td>
                    <div className={s.priceCell}>{inr(b.price)}</div>
                    {b.compareAtPrice > b.price && <div className={s.mrpCell}>{inr(b.compareAtPrice)}</div>}
                  </td>
                  <td>
                    {b.trackInventory ? (
                      <>
                        <span className={available(b) > 0 ? s.stockOk : s.stockBad}>{available(b)} available</span>
                        <div className={s.stockDetail}>{b.stock} available · {b.reservedStock || 0} reserved · {b.soldCount || 0} sold</div>
                        {stockAdjust?._id === b._id ? (
                          <div className={s.stockEdit}>
                            <input type="number" min="0" value={stockAdjust.value} onChange={(e) => setStockAdjust({ _id: b._id, value: e.target.value })} />
                            <button onClick={() => applyStockAdjust(b, stockAdjust.value)}>Save</button>
                            <button onClick={() => setStockAdjust(null)}>✕</button>
                          </div>
                        ) : (
                          <button className={s.linkBtn} onClick={() => setStockAdjust({ _id: b._id, value: b.stock })}>Adjust stock</button>
                        )}
                      </>
                    ) : (
                      <span className={s.stockMuted}>Not tracked</span>
                    )}
                  </td>
                  <td>
                    <span className={`${s.badge} ${s[STATUS_META[b.status]?.cls || "muted"]}`}>{STATUS_META[b.status]?.label || b.status}</span>
                  </td>
                  <td>
                    <div className={s.actions}>
                      <button className={s.linkBtn} onClick={() => setModal({ mode: "edit", book: b })}>Edit</button>
                      {b.status === "published" ? (
                        <button className={s.linkBtn} onClick={() => setBookStatus(b, "draft")}>Unpublish</button>
                      ) : b.status === "draft" ? (
                        <button className={s.linkBtn} onClick={() => setBookStatus(b, "published")}>Publish</button>
                      ) : null}
                      {b.status !== "archived" && (
                        <button className={`${s.linkBtn} ${s.dangerLink}`} onClick={() => { if (confirm(`Archive "${b.title}"? Historical orders stay intact.`)) setBookStatus(b, "archived"); }}>Archive</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <BookModal
          mode={modal.mode}
          book={modal.book}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={saveBook}
        />
      )}
    </div>
  );
}

function BookModal({ mode, book, saving, onClose, onSave }) {
  const [form, setForm] = useState(
    book
      ? {
          ...emptyBook,
          ...book,
          price: book.price ?? "",
          compareAtPrice: book.compareAtPrice ?? "",
          pages: book.pages ?? "",
          authors: (book.authors || []).join(", "),
          tags: (book.tags || []).join(", "),
        }
      : emptyBook
  );

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const res = await adminBooksApi.uploadCover(file);
      setForm({ ...form, coverImage: res.url });
      setUploadMsg("Cover uploaded");
    } catch (err) {
      setUploadMsg(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = (e) => {
    e.preventDefault();
    onSave({
      title: form.title,
      slug: form.slug || undefined,
      subtitle: form.subtitle,
      authors: String(form.authors || "").split(",").map((x) => x.trim()).filter(Boolean),
      tags: String(form.tags || "").split(",").map((x) => x.trim()).filter(Boolean),
      category: form.category,
      shortDescription: form.shortDescription,
      description: form.description,
      sku: form.sku,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      language: form.language,
      edition: form.edition,
      pages: form.pages ? Number(form.pages) : undefined,
      coverImage: form.coverImage,
      isPaperback: Boolean(form.isPaperback),
      stock: Number(form.stock || 0),
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      trackInventory: Boolean(form.trackInventory),
      allowBackorder: Boolean(form.allowBackorder),
      status: form.status,
      featured: Boolean(form.featured),
      displayOrder: Number(form.displayOrder || 0),
    });
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <h2>{mode === "edit" ? `Edit: ${book.title}` : "Add a book"}</h2>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className={s.modalForm}>
          <div className={s.formGrid}>
            <label className={s.field}><span>Title *</span><input value={form.title} onChange={set("title")} required /></label>
            <label className={s.field}><span>Slug (blank = auto)</span><input value={form.slug} onChange={set("slug")} /></label>
            <label className={s.field}><span>Authors (comma separated)</span><input value={form.authors} onChange={set("authors")} /></label>
            <label className={s.field}><span>SKU *</span><input value={form.sku} onChange={set("sku")} required /></label>
            <label className={s.field}><span>Price (KES ) *</span><input type="number" min="0" step="0.01" value={form.price} onChange={set("price")} required /></label>
            <label className={s.field}><span>Compare-at price (KES )</span><input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={set("compareAtPrice")} /></label>
            <label className={s.field}><span>Category</span><input value={form.category} onChange={set("category")} /></label>
            <label className={s.field}><span>Tags (comma separated)</span><input value={form.tags} onChange={set("tags")} /></label>
            <label className={s.field}><span>Language</span><input value={form.language} onChange={set("language")} /></label>
            <label className={s.field}><span>Edition</span><input value={form.edition} onChange={set("edition")} /></label>
            <label className={s.field}><span>Pages</span><input type="number" min="0" value={form.pages} onChange={set("pages")} /></label>
            <div className={s.field}>
              <span>Cover image</span>
              <div className={s.coverUpload}>
                <div className={s.coverPreview}>
                  {form.coverImage ? (
                    <img src={form.coverImage} alt="Cover preview" />
                  ) : (
                    <div className={s.coverPreviewEmpty}>No cover</div>
                  )}
                </div>
                <div className={s.coverControls}>
                  <label className={s.coverPickBtn}>
                    {uploading ? "Uploading…" : "Upload image"}
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp" onChange={handleCoverUpload} disabled={uploading} hidden />
                  </label>
                  <span className={s.coverHint}>JPG, PNG, GIF, SVG or WebP — max 10 MB</span>
                  {uploadMsg && <span className={`${s.coverHint} ${s.coverMsg}`}>{uploadMsg}</span>}
                </div>
              </div>
              <input value={form.coverImage} onChange={set("coverImage")} placeholder="…or paste an image URL" />
            </div>
            <label className={s.field}><span>Stock</span><input type="number" min="0" value={form.stock} onChange={set("stock")} /></label>
            <label className={s.field}><span>Low stock threshold</span><input type="number" min="0" value={form.lowStockThreshold} onChange={set("lowStockThreshold")} /></label>
            <label className={s.field}><span>Display order</span><input type="number" value={form.displayOrder} onChange={set("displayOrder")} /></label>
            <label className={s.field}><span>Subtitle</span><input value={form.subtitle} onChange={set("subtitle")} /></label>
          </div>
          <label className={s.field}><span>Short description</span><textarea rows={2} value={form.shortDescription} onChange={set("shortDescription")} /></label>
          <label className={s.field}><span>Description (HTML allowed)</span><textarea rows={4} value={form.description} onChange={set("description")} /></label>
          <div className={s.checks}>
            <label><input type="checkbox" checked={form.isPaperback} onChange={(e) => setForm({ ...form, isPaperback: e.target.checked })} /> Paperback</label>
            <label><input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })} /> Track inventory</label>
            <label><input type="checkbox" checked={form.allowBackorder} onChange={(e) => setForm({ ...form, allowBackorder: e.target.checked })} /> Allow backorders</label>
            <label><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
          </div>
          <div className={s.modalFoot}>
            <select value={form.status} onChange={set("status")} className={s.select}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <button type="button" className={s.ghostBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={s.primaryBtn} disabled={saving}>{saving ? "Saving…" : "Save book"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}