import { useRef } from "react";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtPrice = (n) => `\u20B9${Number(n || 0).toLocaleString("en-IN")}`;

const TYPE_LABELS = {
  plan: "Membership",
  service: "Service",
  course: "Course",
  workshop: "Workshop",
  consultation: "Consultation",
};

export default function InvoiceView({ order, onClose }) {
  const invoiceRef = useRef();

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const content = invoiceRef.current?.innerHTML || "";
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules || [])
            .map((rule) => rule.cssText)
            .join("\n");
        } catch { return ""; }
      })
      .join("\n");
    printWindow.document.write(`
      <html><head><title>Invoice-${order?.orderNumber || "order"}</title>
      <style>${styles} body { padding: 20px; font-family: 'Inter', sans-serif; } @media print { body { padding: 0; } }</style>
      </head><body>${content}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  if (!order) return null;

  const { payment, items = [], student, coupon, couponCode, couponDiscount } = order;
  const studio = {
    name: "Pragya Yoga Studio",
    address: "123 Wellness Avenue, Yoga Nagar, Bengaluru, Karnataka 560001",
    email: "pragyayogaofficial@gmail.com",
    phone: "+91 98765 43210",
    gst: "29ABCDE1234F1Z5",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #2E7D5B, #F97316)", padding: "24px 28px",
        color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>{studio.name}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.85 }}>Tax Invoice</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>INVOICE</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>#{payment?.invoiceNo || order.orderNumber}</div>
        </div>
      </div>

      {/* Content (printable area) */}
      <div ref={invoiceRef} style={{ padding: "24px 28px" }}>
        {/* Studio + Student info */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, gap: 20, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}>
            <strong style={{ color: "#374151" }}>{studio.name}</strong><br />
            {studio.address}<br />
            Email: {studio.email}<br />
            Phone: {studio.phone}<br />
            GST: {studio.gst}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right", lineHeight: 1.8 }}>
            <strong style={{ color: "#374151" }}>Bill To:</strong><br />
            {student?.name || "—"}<br />
            {student?.email || "—"}<br />
            {student?.phone || "—"}<br />
            <span style={{ color: "#9ca3af" }}>Date: {fmtDate(order.createdAt)}</span><br />
            <span style={{ color: "#9ca3af" }}>Time: {fmtTime(order.createdAt)}</span>
          </div>
        </div>

        {/* Order Info */}
        <div style={{
          background: "#f9fafb", borderRadius: 10, padding: "12px 16px", marginBottom: 20,
          display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12, color: "#6b7280",
        }}>
          <div><span style={{ color: "#9ca3af" }}>Order ID:</span> <strong style={{ color: "#374151" }}>{order.orderNumber}</strong></div>
          <div><span style={{ color: "#9ca3af" }}>Invoice:</span> <strong style={{ color: "#374151" }}>{payment?.invoiceNo || "—"}</strong></div>
          <div><span style={{ color: "#9ca3af" }}>Transaction:</span> <strong style={{ color: "#374151", fontFamily: "monospace" }}>{order.transactionId || "—"}</strong></div>
          <div><span style={{ color: "#9ca3af" }}>Payment:</span> <strong style={{ color: "#374151" }}>{order.paymentMethod || "Manual"}</strong></div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>#</th>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Item</th>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Type</th>
              <th style={{ textAlign: "center", padding: "8px 10px", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Price</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px", color: "#9ca3af" }}>{idx + 1}</td>
                <td style={{ padding: "10px", fontWeight: 600, color: "#1f2937" }}>{item.name}</td>
                <td style={{ padding: "10px", color: "#6b7280" }}>{TYPE_LABELS[item.itemType] || item.itemType}</td>
                <td style={{ padding: "10px", textAlign: "center", color: "#6b7280" }}>1</td>
                <td style={{ padding: "10px", textAlign: "right", color: "#6b7280" }}>{fmtPrice(item.price)}</td>
                <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "#1f2937" }}>{fmtPrice(item.finalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <div style={{ width: 260 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", padding: "4px 0" }}>
              <span>Subtotal</span><span>{fmtPrice(order.subtotal)}</span>
            </div>
            {(order.discount > 0 || couponDiscount > 0) && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#10B981", padding: "4px 0" }}>
                <span>Discount {couponCode ? `(${couponCode})` : ""}</span><span>-{fmtPrice(order.discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", padding: "4px 0" }}>
              <span>Tax</span><span>{fmtPrice(order.tax || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "#2E7D5B", borderTop: "2px solid #e5e7eb", paddingTop: 8, marginTop: 4 }}>
              <span>Total Paid</span><span>{fmtPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Coupon */}
        {coupon && (
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 16, padding: "10px 14px", background: "rgba(46,125,91,0.06)", borderRadius: 8, border: "1px solid rgba(46,125,91,0.15)" }}>
            <strong style={{ color: "#2E7D5B" }}>Coupon Applied:</strong> {couponCode} &mdash; {coupon.discountType === "Percentage" ? `${coupon.discountValue}% OFF` : `${fmtPrice(coupon.discountValue)} OFF`} &mdash; Discount: -{fmtPrice(couponDiscount || order.discount)}
          </div>
        )}

        {/* Status */}
        <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center", borderTop: "1px solid #f3f4f6", paddingTop: 16, marginBottom: 8 }}>
          Payment Status: <strong style={{ color: order.payment?.status === "paid" || order.status === "completed" ? "#16A34A" : "#D97706" }}>
            {order.payment?.status === "paid" || order.status === "completed" ? "Paid" : order.status}
          </strong>
          &nbsp;&middot;&nbsp;
          Enrollment: <strong style={{ color: "#16A34A" }}>Activated</strong>
        </div>

        {/* Footer */}
        <div style={{ fontSize: 10, color: "#d1d5db", textAlign: "center", lineHeight: 1.6 }}>
          <div>{studio.name} &middot; {studio.address}</div>
          <div>This is a computer-generated invoice. No signature is required.</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        padding: "14px 28px", borderTop: "1px solid #f3f4f6",
        display: "flex", justifyContent: "flex-end", gap: 8,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#6b7280" }}
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => handlePrint()}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #2E7D5B, #F97316)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          <i className="ti ti-printer" style={{ marginRight: 6 }} />Print / Download PDF
        </button>
      </div>
    </div>
  );
}
