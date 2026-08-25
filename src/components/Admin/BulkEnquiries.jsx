import { useCallback, useEffect, useState } from "react";
import { adminBulkEnquiriesApi } from "../api/AdminServices.js";
import s from "./BulkEnquiries.module.css";

const fmtDate = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "–");

const STATUS_META = {
  NEW: { label: "New", cls: "amber" },
  CONTACTED: { label: "Contacted", cls: "blue" },
  QUOTATION_SENT: { label: "Quotation Sent", cls: "blue" },
  CONFIRMED: { label: "Confirmed", cls: "green" },
  REJECTED: { label: "Rejected", cls: "red" },
};

const NEXT_STATUS = ["NEW", "CONTACTED", "QUOTATION_SENT", "CONFIRMED", "REJECTED"];

export default function BulkEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [flash, setFlash] = useState(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const showFlash = (message, type = "success") => {
    setFlash({ message, type });
    setTimeout(() => setFlash(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminBulkEnquiriesApi.list({ status: filter === "all" ? "" : filter, search, limit: 50 });
      setEnquiries(data.enquiries || []);
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    setSelected(id);
    try {
      const data = await adminBulkEnquiriesApi.detail(id);
      setDetail(data.enquiry);
      setStatus(data.enquiry.status);
      setNotes(data.enquiry.notes || "");
    } catch (err) {
      showFlash(err.message, "error");
    }
  };

  const saveStatus = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminBulkEnquiriesApi.setStatus(selected, status, notes);
      showFlash(`Enquiry marked ${STATUS_META[status]?.label}`);
      setSelected(null);
      setDetail(null);
      await load();
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const counts = (st) => (st === "all" ? enquiries.length : enquiries.filter((x) => x.status === st).length);

  return (
    <div>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Bulk Enquiries</h1>
          <p className={s.sub}>Wholesale / bulk book requests — follow up with quotations</p>
        </div>
      </div>

      {flash && <div className={`${s.flash} ${flash.type === "error" ? s.flashError : ""}`}>{flash.message}</div>}

      <div className={s.filters}>
        {["all", ...NEXT_STATUS].map((st) => (
          <button key={st} className={`${s.chip} ${filter === st ? s.chipActive : ""}`} onClick={() => setFilter(st)}>
            {st === "all" ? "All" : STATUS_META[st]?.label || st} <span className={s.chipCount}>{counts(st)}</span>
          </button>
        ))}
      </div>

      <div className={s.toolbar}>
        <input className={s.search} placeholder="Search organisation, contact, email, reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className={s.loading}>Loading enquiries…</p>
      ) : enquiries.length === 0 ? (
        <p className={s.loading}>No enquiries yet.</p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Reference</th><th>Organisation</th><th>Contact</th><th>Book / Qty</th><th>Status</th><th>Received</th></tr>
            </thead>
            <tbody>
              {enquiries.map((x) => (
                <tr key={x._id} className={s.clickRow} onClick={() => openDetail(x._id)}>
                  <td className={s.mono}>{x.referenceNumber}</td>
                  <td><strong>{x.organisationName}</strong></td>
                  <td>
                    <div>{x.contactPerson}</div>
                    <div className={s.muted}>{x.phone}</div>
                  </td>
                  <td>
                    <div>{x.bookTitle || "General"}</div>
                    <div className={s.muted}>{x.quantity} copies</div>
                  </td>
                  <td><span className={`${s.badge} ${s[STATUS_META[x.status]?.cls || "muted"]}`}>{STATUS_META[x.status]?.label || x.status}</span></td>
                  <td className={s.muted}>{fmtDate(x.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && detail && (
        <div className={s.overlay} onClick={() => setSelected(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div>
                <h2>{detail.referenceNumber}</h2>
                <span className={`${s.badge} ${s[STATUS_META[detail.status]?.cls || "muted"]}`}>{STATUS_META[detail.status]?.label || detail.status}</span>
              </div>
              <button className={s.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.rows}>
                <div><span>Organisation</span><strong>{detail.organisationName}</strong></div>
                <div><span>Contact person</span><strong>{detail.contactPerson}</strong></div>
                <div><span>Email</span><strong>{detail.email}</strong></div>
                <div><span>Phone</span><strong>{detail.phone}</strong></div>
                <div><span>Book title</span><strong>{detail.bookTitle || "–"}</strong></div>
                <div><span>Quantity</span><strong>{detail.quantity} copies</strong></div>
                <div><span>State</span><strong>{detail.state || "–"}</strong></div>
                <div><span>PIN code</span><strong>{detail.pincode || "–"}</strong></div>
                <div><span>Received</span><strong>{fmtDate(detail.createdAt)}</strong></div>
              </div>
              {detail.message && (
                <div className={s.message}>
                  <h3>Message</h3>
                  <p>{detail.message}</p>
                </div>
              )}
              <form className={s.statusForm} onSubmit={saveStatus}>
                <label><span>Status</span>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {NEXT_STATUS.map((st) => <option key={st} value={st}>{STATUS_META[st]?.label}</option>)}
                  </select>
                </label>
                <label><span>Notes</span>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quotation reference, follow-up notes…" />
                </label>
                <button type="submit" className={s.primaryBtn} disabled={busy}>{busy ? "Saving…" : "Update enquiry"}</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}