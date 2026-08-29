import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaMagnifyingGlass, FaCartShopping, FaCheck } from "react-icons/fa6";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getBooks, getCartCount, addBookToCart } from "../components/api/BookServices";
import { useScrollToSection } from "../hooks/useScrollToSection";
import styles from "./Books.module.css";

const inr = (n, t) => `${t("books.currency")}${Number(n || 0).toLocaleString("en-KE")}`;

const SORTS = [
  { value: "displayOrder", labelKey: "books.sortFeatured" },
  { value: "newest", labelKey: "books.sortNewest" },
  { value: "priceAsc", labelKey: "books.sortPriceLow" },
  { value: "priceDesc", labelKey: "books.sortPriceHigh" },
  { value: "title", label: "Title A–Z" },
  { value: "bestSelling", label: "Best Selling" },
];

const Books = () => {
  useScrollToSection();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "displayOrder");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["books", { search, category, sort, page }],
    queryFn: () => getBooks({ search, category, sort, page, limit: 12 }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const [cartCount, setCartCount] = useState(0);
  const [addedId, setAddedId] = useState(null);
  const [addingId, setAddingId] = useState(null);

  const refreshCartCount = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    getCartCount().then((r) => setCartCount(r.count)).catch(() => {});
  }, []);

  useEffect(() => { refreshCartCount(); }, [refreshCartCount]);

  const applyFilters = (patch) => {
    const next = { ...Object.fromEntries(searchParams), ...patch };
    Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
    setSearchParams(next);
    if (patch.category !== undefined) setCategory(patch.category);
    if (patch.sort !== undefined) setSort(patch.sort);
    if (patch.search !== undefined) setSearch(patch.search);
    setPage(1);
  };

  const handleAdd = async (book, e) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: `/books/${book.slug}` } });
      return;
    }
    setAddingId(book._id);
    try {
      await addBookToCart(book._id, 1);
      setAddedId(book._id);
      refreshCartCount();
      setTimeout(() => setAddedId(null), 1800);
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>{t("books.journalEyebrow")}</span>
          <h1 className={styles.heroTitle}>
            The <span className={styles.heroAccent}>Soma</span> {t("books.title")}
          </h1>
          <p className={styles.heroSub}>
            {t("books.desc")}
          </p>
          <div className={styles.heroBadges}>
            <span>{t("books.curatedBy")}</span>
            <span>{t("books.localDelivery")}</span>
            <span>{t("books.secureCheckout")}</span>
          </div>
        </div>
      </section>

      <section className={styles.controls}>
        <div className={styles.searchBox}>
          <FaMagnifyingGlass className={styles.searchIcon} />
          <input
            value={search}
            placeholder={t("books.searchPlaceholder")}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyFilters({ search }); }}
          />
        </div>
        <select value={category} onChange={(e) => applyFilters({ category: e.target.value })} className={styles.select}>
          <option value="">{t("books.allCategories")}</option>
          {(data?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => applyFilters({ sort: e.target.value })} className={styles.select}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.labelKey ? t(s.labelKey) : s.label}</option>)}
        </select>
        <button className={styles.searchBtn} onClick={() => applyFilters({ search })}>{t("books.searchBtn")}</button>
      </section>

      <section className={styles.gridWrap}>
        {isLoading && <p className={styles.stateText}>{t("books.loading")}</p>}
        {isError && (
          <div className={styles.stateText}>
            <p>Could not load the catalogue: {error.message}</p>
            <button className={styles.retryBtn} onClick={() => refetch()}>{t("books.retry")}</button>
          </div>
        )}

        {!isLoading && !isError && (data?.books?.length === 0) && (
          <p className={styles.stateText}>{t("books.noResults")}</p>
        )}

        <div className={styles.grid}>
          {!isLoading && !isError && data?.books?.map((book, i) => (
            <motion.div
              key={book._id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 4) * 0.06, duration: 0.45 }}
            >
              <Link to={`/books/${book.slug}`} className={styles.card}>
                <div className={styles.coverWrap}>
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className={styles.cover} loading="lazy" />
                  ) : (
                    <div className={styles.coverPlaceholder}>
                      <span className={styles.placeholderMark}>🕉</span>
                      <span className={styles.placeholderTitle}>{book.title}</span>
                    </div>
                  )}
                  {book.compareAtPrice > book.price && (
                    <span className={styles.discountBadge}>
                      {Math.round(((book.compareAtPrice - book.price) / book.compareAtPrice) * 100)}{t("books.off")}
                    </span>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardCategory}>{book.category}</div>
                  <h3 className={styles.cardTitle}>{book.title}</h3>
                  <p className={styles.cardAuthors}>{(book.authors || []).join(", ")}</p>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardPrice}>
                      {inr(book.price, t)}
                      {book.compareAtPrice > book.price && (
                        <s className={styles.cardMrp}>{inr(book.compareAtPrice, t)}</s>
                      )}
                    </span>
                    {book.trackInventory && !book.allowBackorder && book.stock <= 0 && (
                      <span className={styles.outOfStock}>{t("books.outOfStock")}</span>
                    )}
                  </div>
                  {book.trackInventory && !book.allowBackorder && book.stock <= 0 ? (
                    <span className={styles.addBtnOut}>{t("books.outOfStock")}</span>
                  ) : (
                    <button
                      className={styles.addBtn}
                      onClick={(e) => handleAdd(book, e)}
                      disabled={addingId === book._id || addedId === book._id}
                    >
                      {addedId === book._id ? <><FaCheck /> {t("books.added")}</> : <><FaCartShopping /> {t("books.addToCart")}</>}
                    </button>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {(data?.pages || 1) > 1 && (
          <div className={styles.pagination}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("books.prev")}</button>
            <span>{t("books.pageOf", { current: data?.page || page, total: data?.pages || 1 })}</span>
            <button disabled={page >= (data?.pages || 1)} onClick={() => setPage((p) => p + 1)}>{t("books.next")}</button>
          </div>
        )}
      </section>

      {cartCount > 0 && (
        <Link to="/studentdashboard?tab=cart" className={styles.cartFab}>
          <FaCartShopping /> {cartCount}
        </Link>
      )}
    </div>
  );
};

export default Books;
