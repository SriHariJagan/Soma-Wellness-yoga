import { useState, useEffect, useRef, useCallback } from "react";
import DOMPurify from "dompurify";
import s from "./Dashboard.shared.module.css";
import es from "./BlogEditor.module.css";
import { createBlog, updateBlog, getBlog, uploadMedia } from "../api/StudentServices.js";

const API_DOMAIN = import.meta.env.VITE_API_URL || "";

function resolveContentHtml(html) {
  if (!html) return "";
  const resolved = html.replace(/(src|href)="\//g, (m, attr) => `${attr}="${API_DOMAIN}/`);
  return DOMPurify.sanitize(resolved, {
    ALLOWED_TAGS: [
      'p','br','b','i','u','em','strong','a','ul','ol','li','h1','h2','h3','h4','h5','h6',
      'blockquote','pre','code','span','div','img','figure','figcaption','hr',
      'table','thead','tbody','tr','th','td',
      'iframe','video','audio','source',
    ],
    ALLOWED_ATTR: ['src','href','alt','title','class','id','target','rel','width','height',
      'allowfullscreen','frameborder','allow','controls','autoplay','loop','muted','style','data-*'],
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['target'],
  });
}

const FONT_SIZES = [
  { tag: "h1", label: "H1" },
  { tag: "h2", label: "H2" },
  { tag: "h3", label: "H3" },
  { tag: "p", label: "P" },
];

export default function BlogEditor({ blogId, student, onNavigate, reload }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [status, setStatus] = useState("draft");
  const [uploads, setUploads] = useState([]);
  const [embeds, setEmbeds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const [currentBlogId, setCurrentBlogId] = useState(blogId || null);
  const [lastSaved, setLastSaved] = useState(null);
  const [dirty, setDirty] = useState(false);
  const editorRef = useRef(null);
  const autoSaveRef = useRef(null);
  const lastContentRef = useRef("");

  // ── Load existing blog ──
  useEffect(() => {
    if (!blogId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getBlog(blogId);
        const b = data.blog;
        if (cancelled) return;
        setCurrentBlogId(b._id);
        setTitle(b.title || "");
        setContent(b.content || "");
        setExcerpt(b.excerpt || "");
        setCoverImage(b.coverImage || "");
        setTags((b.tags || []).join(", "));
        setCategories((b.categories || []).join(", "));
        setVisibility(b.visibility || "public");
        setStatus(b.status || "draft");
        setUploads(b.attachments || []);
        setEmbeds(b.embeds || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [blogId]);

  // ── Update editor div when content loads ──
  useEffect(() => {
    if (editorRef.current && content && !editorRef.current.innerHTML) {
      const resolved = resolveContentHtml(content);
      editorRef.current.innerHTML = resolved;
      lastContentRef.current = resolved;
    }
  }, [content]);

  // ── Read content from editor ──
  const readContent = useCallback(() => {
    return editorRef.current?.innerHTML || "";
  }, []);

  // ── Handle input events ──
  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || "";
    if (html !== lastContentRef.current) {
      lastContentRef.current = html;
      setDirty(true);
    }
  }, []);

  // ── Auto-save ──
  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    if (!title && !lastContentRef.current) return;

    autoSaveRef.current = setInterval(async () => {
      const currentContent = readContent();
      if (!title && !currentContent) return;
      if (!dirty && currentBlogId) return;

      try {
        if (currentBlogId) {
          await updateBlog(currentBlogId, { title, content: currentContent, status: "draft" });
        } else {
          const data = await createBlog({ title, content: currentContent, status: "draft", excerpt, coverImage, tags: [], categories: [], visibility });
          if (data.blog?._id) {
            setCurrentBlogId(data.blog._id);
            if (!blogId) {
              const params = new URLSearchParams(window.location.search);
              params.set("blogId", data.blog._id);
              const newUrl = `${window.location.pathname}?${params}`;
              window.history.replaceState({}, "", newUrl);
            }
          }
        }
        setDirty(false);
        setLastSaved(new Date());
      } catch {}
    }, 30000);

    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [title, currentBlogId, readContent, dirty, blogId, excerpt, coverImage, visibility]);

  // ── Beforeunload warning ──
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ── Formatting commands ──
  const execFormat = (cmd, value) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInsertLink = () => {
    const sel = window.getSelection();
    const url = prompt("Enter URL:", sel?.toString() ? "" : "https://");
    if (url) execFormat("createLink", url);
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      const data = await uploadMedia(Array.from(files));
      for (const f of data.files) {
        if (f.type === "image") {
          execFormat("insertImage", f.url);
        } else {
          setUploads(prev => [...prev, f]);
        }
      }
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    try {
      const data = await uploadMedia(Array.from(files));
      for (const f of data.files) {
        if (f.type === "image") {
          execFormat("insertImage", f.url);
        } else {
          setUploads(prev => [...prev, f]);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const addEmbed = () => {
    if (!embedUrl.trim()) return;
    let platform = "other";
    if (embedUrl.includes("youtube") || embedUrl.includes("youtu.be")) platform = "youtube";
    else if (embedUrl.includes("zoom")) platform = "zoom";
    else if (embedUrl.includes("vimeo")) platform = "vimeo";
    setEmbeds(prev => [...prev, { url: embedUrl.trim(), platform, caption: "" }]);
    setEmbedUrl("");
    setShowEmbedInput(false);
  };

  const removeAttachment = (idx) => setUploads(prev => prev.filter((_, i) => i !== idx));
  const removeEmbed = (idx) => setEmbeds(prev => prev.filter((_, i) => i !== idx));

  // ── Save / Publish ──
  const handleSave = async (publish = false) => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    const currentContent = readContent();
    const payload = {
      title: title.trim(),
      content: currentContent,
      excerpt: excerpt.trim().slice(0, 500),
      coverImage,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      categories: categories.split(",").map(c => c.trim()).filter(Boolean),
      visibility,
      status: publish ? "published" : "draft",
      attachments: uploads,
      embeds,
    };

    try {
      let data;
      if (currentBlogId) {
        data = await updateBlog(currentBlogId, payload);
      } else {
        data = await createBlog(payload);
        if (data.blog?._id) setCurrentBlogId(data.blog._id);
      }
      setDirty(false);
      setLastSaved(new Date());
      if (publish) {
        onNavigate?.("myBlogs");
        reload?.();
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleToolClick = (e, handler) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };

  if (loading) {
    return (
      <div>
        <div className={s.pageTitle}>{blogId ? "Edit Blog" : "Create Blog"}</div>
        <div className={es.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className={s.pageTitle}>{blogId || currentBlogId ? "Edit Blog" : "Create Blog"}</div>

      <div className={es.editorShell}>
        {/* ── Top bar ── */}
        <div className={es.topBar}>
          <div className={es.topLeft}>
            <span className={es.statusBadge}>
              {status === "published" ? "Published" : "Draft"}
            </span>
            {lastSaved && <span className={es.saved}>Saved {lastSaved.toLocaleTimeString()}</span>}
          </div>
          <div className={es.topRight}>
            <button type="button" className={es.previewBtn} onClick={() => setShowPreview(v => !v)}>
              <i className="ti ti-eye" /> Preview
            </button>
            <button type="button" className={es.saveBtn} onClick={() => handleSave(false)} disabled={saving}>
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button type="button" className={es.publishBtn} onClick={() => handleSave(true)} disabled={saving}>
              <i className="ti ti-send" /> {status === "published" ? "Update" : "Publish"}
            </button>
          </div>
        </div>

        {error && <div className={es.error}>{error}</div>}

        {/* ── Title ── */}
        <input
          type="text"
          placeholder="Blog title..."
          value={title}
          onChange={e => { setTitle(e.target.value); setDirty(true); }}
          className={es.titleInput}
        />

        {/* ── Meta fields ── */}
        <div className={es.metaGrid}>
          <div className={es.metaField}>
            <label>Cover Image URL</label>
            <input type="url" placeholder="https://..." value={coverImage} onChange={e => setCoverImage(e.target.value)} className={es.metaInput} />
          </div>
          <div className={es.metaField}>
            <label>Tags (comma separated)</label>
            <input type="text" placeholder="yoga, meditation, wellness" value={tags} onChange={e => setTags(e.target.value)} className={es.metaInput} />
          </div>
          <div className={es.metaField}>
            <label>Categories</label>
            <input type="text" placeholder="beginners, advanced" value={categories} onChange={e => setCategories(e.target.value)} className={es.metaInput} />
          </div>
          <div className={es.metaField}>
            <label>Visibility</label>
            <select value={visibility} onChange={e => setVisibility(e.target.value)} className={es.metaSelect}>
              <option value="public">Public</option>
              <option value="members">Members Only</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        {/* ── Excerpt ── */}
        <textarea
          placeholder="Short excerpt / summary..."
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          className={es.excerptInput}
          rows={2}
        />

        {/* ── Toolbar ── */}
        <div className={es.toolbar}>
          {FONT_SIZES.map(fs => (
            <button key={fs.tag} type="button" className={es.toolBtn} onClick={(e) => handleToolClick(e, () => execFormat("formatBlock", fs.tag === "p" ? "p" : `<${fs.tag}>`))} title={fs.label}>
              {fs.label}
            </button>
          ))}
          <div className={es.sep} />
          <button type="button" className={es.toolBtn} onMouseDown={(e) => { e.preventDefault(); execFormat("bold"); }} title="Bold"><b>B</b></button>
          <button type="button" className={es.toolBtn} onMouseDown={(e) => { e.preventDefault(); execFormat("italic"); }} title="Italic"><i>I</i></button>
          <button type="button" className={es.toolBtn} onMouseDown={(e) => { e.preventDefault(); execFormat("underline"); }} title="Underline"><u>U</u></button>
          <button type="button" className={es.toolBtn} onMouseDown={(e) => { e.preventDefault(); execFormat("strikeThrough"); }} title="Strikethrough"><s>S</s></button>
          <div className={es.sep} />
          <button type="button" className={es.toolBtn} onMouseDown={(e) => { e.preventDefault(); execFormat("insertUnorderedList"); }} title="List"><i className="ti ti-list" /></button>
          <button type="button" className={es.toolBtn} onMouseDown={(e) => { e.preventDefault(); execFormat("insertOrderedList"); }} title="Ordered"><i className="ti ti-list-numbers" /></button>
          <button type="button" className={es.toolBtn} onMouseDown={(e) => { e.preventDefault(); execFormat("formatBlock", "<blockquote>"); }} title="Quote"><i className="ti ti-quote" /></button>
          <button type="button" className={es.toolBtn} onMouseDown={(e) => { e.preventDefault(); execFormat("formatBlock", "<pre>"); }} title="Code"><i className="ti ti-code" /></button>
          <div className={es.sep} />
          <button type="button" className={es.toolBtn} onMouseDown={(e) => { e.preventDefault(); handleInsertLink(); }} title="Link"><i className="ti ti-link" /></button>
          <label className={es.toolBtn} title="Upload Media">
            <i className="ti ti-photo-plus" />
            <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.mp4,.mp3" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
          <button type="button" className={es.toolBtn} onClick={() => setShowEmbedInput(v => !v)} title="Embed">
            <i className="ti ti-brand-youtube" />
          </button>
        </div>

        {/* ── Embed input ── */}
        {showEmbedInput && (
          <div className={es.embedInputRow}>
            <input type="url" placeholder="YouTube / Vimeo / Zoom URL..." value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} className={es.embedField} />
            <button type="button" className={es.addEmbedBtn} onClick={addEmbed}>Add</button>
          </div>
        )}

        {/* ── Editor ── */}
        <div
          ref={editorRef}
          className={es.editor}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          data-placeholder="Start writing..."
        />

        {/* ── Attachments ── */}
        {uploads.length > 0 && (
          <div className={es.uploadsSection}>
            <h4>Attachments ({uploads.length})</h4>
            <div className={es.uploadList}>
              {uploads.map((u, i) => (
                <div key={i} className={es.uploadItem}>
                  <i className={`ti ${u.type === "pdf" ? "ti-file-text" : u.type === "video" ? "ti-video" : u.type === "audio" ? "ti-music" : "ti-file"}`} />
                  <span>{u.originalName || u.name || u.url?.split("/").pop()}</span>
                  <button type="button" onClick={() => removeAttachment(i)}><i className="ti ti-x" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Embeds ── */}
        {embeds.length > 0 && (
          <div className={es.uploadsSection}>
            <h4>Embeds ({embeds.length})</h4>
            <div className={es.uploadList}>
              {embeds.map((e, i) => (
                <div key={i} className={es.uploadItem}>
                  <i className={`ti ${e.platform === "youtube" ? "ti-brand-youtube" : "ti-link"}`} />
                  <span>{e.url.slice(0, 60)}...</span>
                  <button type="button" onClick={() => removeEmbed(i)}><i className="ti ti-x" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Preview ── */}
        {showPreview && (
          <div className={es.previewPane}>
            <h2 className={es.previewTitle}>{title || "Untitled"}</h2>
            {coverImage && <img src={coverImage} alt="" className={es.previewCover} />}
            <div className={es.previewContent} dangerouslySetInnerHTML={{ __html: readContent() }} />
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className={es.footerActions}>
          <button type="button" className={es.saveBtn} onClick={() => handleSave(false)} disabled={saving}>
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button type="button" className={es.publishBtn} onClick={() => handleSave(true)} disabled={saving}>
            <i className="ti ti-send" /> {status === "published" ? "Update & Publish" : "Publish"}
          </button>
          <button type="button" className={es.cancelBtn} onClick={() => onNavigate?.("myBlogs")}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
