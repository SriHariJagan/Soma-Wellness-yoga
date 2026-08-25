import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCheck, FaCartShopping, FaTruckFast, FaBuildingColumns, FaMagnifyingGlassLocation } from "react-icons/fa6";
import { useQuery } from "@tanstack/react-query";
import { getBookBySlug, addBookToCart, checkShippingAvailability } from "../components/api/BookServices";
import { useScrollToSection } from "../hooks/useScrollToSection";
import styles from "./BookDetail.module.css";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const BookDetail = () => {
  useScrollToSection();
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["book", slug],
    queryFn: () => getBookBySlug(slug),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const book = data?.book;
  const related = data?.related || [];

  const [qty, setQty] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pinResult, setPinResult] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!book) return;
    document.title = `${book.seoTitle || book.title} — Pragya Yoga`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = book.seoDescription || book.shortDescription || `${book.title} by ${(book.authors || []).join(", ")} — available at the Pragya Yoga bookstore.`;
    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.id = "book-jsonld";
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Book",
      name: book.title,
      author: (book.authors || []).map((a) => ({ "@type": "Person", name: a })),
      offers: { "@type": "Offer", price: book.price, priceCurrency: "INR", availability: book.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
      ...(book.pages ? { numberOfPages: book.pages } : {}),
      ...(book.language ? { inLanguage: book.language } : {}),
    });
    document.head.appendChild(jsonLd);
    return () => {
      const old = document.getElementById("book-jsonld");
      if (old) old.remove();
    };
  }, [book]);

  if (isLoading) return <div className={styles.statePage}>Loading…</div>;
  if (isError) return <div className={styles.statePage}>Could not load this book. <Link to="/books">← Back to bookstore</Link></div>;
  if (!book) return <div className={styles.statePage}>Book not found. <Link to="/books">← Back to bookstore</Link></div>;

  const available = book.trackInventory && !book.allowBackorder ? Math.max(0, book.stock) : null;
  const outOfStock = available !== null && available <= 0;

  const handlePinCheck = async () => {
    if (!/^\d{6}$/.test(pincode)) { setPinResult(null); setError("Enter a valid 6-digit PIN code"); return; }
    setError("");
    setPinLoading(true);
    try {
      const res = await checkShippingAvailability({ pincode });
      setPinResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setPinLoading(false);
    }
  };

  const handleAdd = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: `/books/${book.slug}` } });
      return;
    }
    setAdding(true);
    setError("");
    try {
      await addBookToCart(book._id, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/books">Bookstore</Link> <span>/</span> <span>{book.title}</span>
      </div>

      <section className={styles.detail}>
        <motion.div
          className={styles.coverCol}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {book.coverImage ? (
            <img src={book.coverImage} alt={book.title} className={styles.cover} />
          ) : (
            <div className={styles.coverPlaceholder}>
              <span className={styles.placeholderMark}>🕉</span>
              <span className={styles.placeholderTitle}>{book.title}</span>
              <span className={styles.placeholderAuthor}>{(book.authors || []).join(", ") || "Pragya Yoga"}</span>
            </div>
          )}
        </motion.div>

        <motion.div className={styles.infoCol} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
          <div className={styles.category}>{book.category}</div>
          <h1 className={styles.title}>{book.title}</h1>
          {book.subtitle && <p className={styles.subtitle}>{book.subtitle}</p>}
          <p className={styles.authors}>by {book.authors?.join(", ") || "Pragya Yoga"}</p>

          <div className={styles.facts}>
            {book.language && <span>{book.language}</span>}
            {book.edition && <span>{book.edition}</span>}
            {book.pages > 0 && <span>{book.pages} pages</span>}
            {book.isPaperback && <span>Paperback</span>}
            <span>SKU: {book.sku}</span>
          </div>

          <div className={styles.priceRow}>
            <span className={styles.price}>{inr(book.price)}</span>
            {book.compareAtPrice > book.price && (
              <>
                <s className={styles.mrp}>{inr(book.compareAtPrice)}</s>
                <span className={styles.save}>Save {inr(book.compareAtPrice - book.price)}</span>
              </>
            )}
          </div>

          {outOfStock && <p className={styles.outStock}>Currently out of stock — check the bulk enquiry page or write to us.</p>}

          <div className={styles.buyRow}>
            <div className={styles.qtyBox}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
            </div>
            <button className={styles.addBtn} onClick={handleAdd} disabled={adding || added || outOfStock}>
              {added ? <><FaCheck /> Added to Cart</> : <><FaCartShopping /> {adding ? "Adding…" : "Add to Cart"}</>}
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.perks}>
            <span><FaTruckFast /> Delivery available across India — check your PIN below</span>
            <span><FaBuildingColumns /> Secure payment via Razorpay</span>
          </div>

          <div className={styles.pinBox}>
            <FaMagnifyingGlassLocation className={styles.pinIcon} />
            <input
              value={pincode}
              maxLength={6}
              placeholder="Check delivery to your PIN code"
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            />
            <button onClick={handlePinCheck} disabled={pinLoading}>{pinLoading ? "…" : "Check"}</button>
            {pinResult && (
              pinResult.available ? (
                <p className={styles.pinOk}>
                  Available — {pinResult.shippingCharge > 0 ? `${inr(pinResult.shippingCharge)} shipping` : "Free shipping"}
                  {pinResult.estimatedDelivery ? `, delivery in ${pinResult.estimatedDelivery.minDays}–${pinResult.estimatedDelivery.maxDays} days` : ""}
                </p>
              ) : (
                <p className={styles.pinNo}>{pinResult.reason}</p>
              )
            )}
          </div>

          <div className={styles.linksRow}>
            <Link to="/bulk-orders" className={styles.altLink}>Need 10+ copies? Bulk orders →</Link>
            <Link to="/order-tracking" className={styles.altLink}>Track an existing order →</Link>
          </div>
        </motion.div>
      </section>

      {book.shortDescription && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About this book</h2>
          <p className={styles.bodyText}>{book.shortDescription}</p>
        </section>
      )}

      {book.description && (
        <section className={styles.section}>
          <div className={styles.bodyText} dangerouslySetInnerHTML={{ __html: book.description }} />
        </section>
      )}

      {book.features?.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What's inside</h2>
          <ul className={styles.features}>
            {book.features.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </section>
      )}

      {book.aboutAuthor && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About the author</h2>
          <p className={styles.bodyText}>{book.aboutAuthor}</p>
        </section>
      )}

      {related.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>You may also like</h2>
          <div className={styles.related}>
            {related.map((b) => (
              <Link key={b._id} to={`/books/${b.slug}`} className={styles.relatedCard}>
                {b.coverImage ? (
                  <img src={b.coverImage} alt={b.title} className={styles.relatedCover} />
                ) : (
                  <div className={styles.relatedPlaceholder}>{b.title}</div>
                )}
                <span className={styles.relatedTitle}>{b.title}</span>
                <span className={styles.relatedPrice}>{inr(b.price)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BookDetail;