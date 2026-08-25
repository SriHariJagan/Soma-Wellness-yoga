import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Book from '../models/Book.js';
import ActivityLog from '../models/ActivityLog.js';
import { BOOK_STATUSES } from '../shared/constants/index.js';

// ─────────────────────────────────────────────────────────────
// bookController — public catalogue + admin book management.
// Prices are resolved server-side from the Book collection; the
// client never dictates amounts.
// ─────────────────────────────────────────────────────────────

const PUBLIC_FIELDS = [
  'title', 'slug', 'subtitle', 'authors', 'shortDescription', 'description',
  'features', 'aboutAuthor', 'category', 'tags', 'sku', 'price', 'compareAtPrice',
  'language', 'edition', 'pages', 'coverImage', 'galleryImages', 'isPaperback',
  'stock', 'reservedStock', 'trackInventory', 'allowBackorder', 'status',
  'featured', 'displayOrder', 'seoTitle', 'seoDescription', 'seoKeywords',
  'createdAt', 'updatedAt',
].join(' ');

export function sanitizeSlug(input) {
  const slug = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw ApiError.badRequest('Slug is required and must contain letters or numbers');
  return slug;
}

/* ── GET /api/books ── (public catalogue) */
export const listBooks = asyncHandler(async (req, res) => {
  const { search, category, tag, sort = 'displayOrder', page = 1, limit = 12 } = req.query;
  const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));

  const filter = { status: 'published' };
  if (category) filter.category = category;
  if (tag) filter.tags = tag;

  if (search) {
    const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(esc, 'i');
    filter.$or = [
      { title: regex },
      { subtitle: regex },
      { authors: regex },
      { tags: regex },
      { category: regex },
      { sku: regex },
      { description: regex },
    ];
  }

  const sortMap = {
    displayOrder: { displayOrder: 1, createdAt: -1 },
    newest: { createdAt: -1 },
    priceAsc: { price: 1 },
    priceDesc: { price: -1 },
    title: { title: 1 },
    bestSelling: { soldCount: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.displayOrder;

  const [books, total] = await Promise.all([
    Book.find(filter).select(PUBLIC_FIELDS).sort(sortBy).skip(skip).limit(Math.max(1, parseInt(limit))).lean(),
    Book.countDocuments(filter),
  ]);

  const categories = await Book.distinct('category', { status: 'published' });

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
  res.json({
    books,
    total,
    page: Math.max(1, parseInt(page)),
    pages: Math.ceil(total / Math.max(1, parseInt(limit))),
    categories,
  });
});

/* ── GET /api/books/:slug ── (public detail + related) */
export const getBookBySlug = asyncHandler(async (req, res) => {
  const book = await Book.findOne({ slug: req.params.slug, status: 'published' })
    .select(PUBLIC_FIELDS)
    .lean();
  if (!book) throw ApiError.notFound('Book not found');

  // Related books: same category first, then shared tags, then latest.
  const related = await Book.find({
    _id: { $ne: book._id },
    status: 'published',
    $or: [
      { category: book.category },
      { tags: { $in: book.tags || [] } },
    ],
  })
    .select(PUBLIC_FIELDS)
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(4)
    .lean();

  // If there are no overlapping titles, fill with the latest published
  // books so the section always offers a recommendation.
  let filled = [];
  if (related.length < 4) {
    filled = await Book.find({
      _id: { $nin: [book._id, ...related.map((r) => r._id)] },
      status: 'published',
    })
      .select(PUBLIC_FIELDS)
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(4 - related.length)
      .lean();
  }

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
  res.json({ book, related: [...related, ...filled] });
});

/* ── GET /api/admin/books ── */
export const adminListBooks = asyncHandler(async (req, res) => {
  const { search, status, category, page = 1, limit = 20 } = req.query;
  const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));

  const filter = {};
  if (status && BOOK_STATUSES.includes(status)) filter.status = status;
  if (category) filter.category = category;
  if (search) {
    const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(esc, 'i');
    filter.$or = [{ title: regex }, { slug: regex }, { sku: regex }, { authors: regex }];
  }

  const [books, total] = await Promise.all([
    Book.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Math.max(1, parseInt(limit))).lean(),
    Book.countDocuments(filter),
  ]);

  res.json({ books, total, page: Math.max(1, parseInt(page)), pages: Math.ceil(total / Math.max(1, parseInt(limit))) });
});

/* ── POST /api/admin/books ── */
export const adminCreateBook = asyncHandler(async (req, res) => {
  const data = validateBookPayload(req.body, { isCreate: true });

  if (await Book.findOne({ sku: data.sku })) throw ApiError.conflict(`SKU "${data.sku}" already exists`);
  if (await Book.findOne({ slug: data.slug })) throw ApiError.conflict(`Slug "${data.slug}" already exists`);

  const book = await Book.create({ ...data, createdBy: req.user._id, updatedBy: req.user._id });

  await ActivityLog.create({
    action: 'book_created',
    performedBy: req.user._id,
    meta: { bookId: book._id, title: book.title, sku: book.sku, slug: book.slug, price: book.price, stock: book.stock },
  });

  res.status(201).json({ success: true, book });
});

/* ── PUT /api/admin/books/:id ── */
export const adminUpdateBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound('Book not found');

  const data = validateBookPayload(req.body);

  if (data.sku && data.sku !== book.sku) {
    const dupe = await Book.findOne({ sku: data.sku, _id: { $ne: book._id } });
    if (dupe) throw ApiError.conflict(`SKU "${data.sku}" already exists`);
  }
  if (data.slug && data.slug !== book.slug) {
    const dupe = await Book.findOne({ slug: data.slug, _id: { $ne: book._id } });
    if (dupe) throw ApiError.conflict(`Slug "${data.slug}" already exists`);
  }

  const old = { title: book.title, price: book.price, stock: book.stock, status: book.status };
  Object.assign(book, data, { updatedBy: req.user._id });
  await book.save();

  await ActivityLog.create({
    action: 'book_updated',
    performedBy: req.user._id,
    meta: { bookId: book._id, before: old, after: { title: book.title, price: book.price, stock: book.stock, status: book.status } },
  });

  res.json({ success: true, book });
});

/* ── PATCH /api/admin/books/:id/status ── (publish/unpublish/archive) */
export const adminSetBookStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!BOOK_STATUSES.includes(status)) throw ApiError.badRequest(`Invalid status. Valid: ${BOOK_STATUSES.join(', ')}`);

  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound('Book not found');

  const oldStatus = book.status;
  book.status = status;
  book.updatedBy = req.user._id;
  await book.save();

  await ActivityLog.create({
    action: 'book_status_changed',
    performedBy: req.user._id,
    meta: { bookId: book._id, from: oldStatus, to: status },
  });

  res.json({ success: true, book });
});

/* ── PATCH /api/admin/books/:id/stock ── (manual stock adjust) */
export const adminAdjustStock = asyncHandler(async (req, res) => {
  const { stock } = req.body;
  if (!Number.isInteger(stock) || stock < 0) throw ApiError.badRequest('Stock must be a non-negative integer');

  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound('Book not found');

  const oldStock = book.stock;
  book.stock = stock;
  book.updatedBy = req.user._id;
  await book.save();

  await ActivityLog.create({
    action: 'book_stock_changed',
    performedBy: req.user._id,
    meta: { bookId: book._id, from: oldStock, to: stock, sku: book.sku },
  });

  res.json({ success: true, book });
});

/* ── DELETE /api/admin/books/:id ── (archive, never hard-delete) */
export const adminDeleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound('Book not found');

  book.status = 'archived';
  book.updatedBy = req.user._id;
  await book.save();

  await ActivityLog.create({
    action: 'book_archived',
    performedBy: req.user._id,
    meta: { bookId: book._id, title: book.title, sku: book.sku },
  });

  res.json({ success: true, msg: 'Book archived. Historical orders remain intact.' });
});

/* ── GET /api/admin/books/stats ── */
export const adminBookStats = asyncHandler(async (req, res) => {
  const [total, published, drafts, lowStock] = await Promise.all([
    Book.countDocuments(),
    Book.countDocuments({ status: 'published' }),
    Book.countDocuments({ status: 'draft' }),
    Book.countDocuments({
      trackInventory: true,
      status: { $ne: 'archived' },
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }),
  ]);
  res.json({ total, published, drafts, lowStock });
});

function validateBookPayload(body, { isCreate = false } = {}) {
  const b = body || {};
  const data = {};

  if (b.title !== undefined) {
    const title = String(b.title).trim();
    if (!title) throw ApiError.badRequest('Title is required');
    data.title = title;
  } else if (isCreate) {
    throw ApiError.badRequest('Title is required');
  }

  if (b.slug !== undefined || isCreate) data.slug = sanitizeSlug(b.slug !== undefined ? b.slug : (b.title || ''));
  if (b.subtitle !== undefined) data.subtitle = String(b.subtitle).trim().slice(0, 300);
  if (b.authors !== undefined) data.authors = Array.isArray(b.authors) ? b.authors.map((a) => String(a).trim()).filter(Boolean) : [];
  if (b.shortDescription !== undefined) data.shortDescription = String(b.shortDescription).trim().slice(0, 600);
  if (b.description !== undefined) data.description = String(b.description).trim();
  if (b.features !== undefined) data.features = Array.isArray(b.features) ? b.features.map((f) => String(f).trim()).filter(Boolean) : [];
  if (b.aboutAuthor !== undefined) data.aboutAuthor = String(b.aboutAuthor).trim();
  if (b.category !== undefined) data.category = String(b.category).trim().slice(0, 100) || 'Books';
  if (b.tags !== undefined) data.tags = Array.isArray(b.tags) ? b.tags.map((t) => String(t).trim()).filter(Boolean) : [];
  if (b.sku !== undefined) {
    const sku = String(b.sku).trim().toUpperCase();
    if (!sku || !/^[A-Z0-9-]{2,50}$/.test(sku)) throw ApiError.badRequest('SKU must be 2–50 characters (letters, digits, dashes)');
    data.sku = sku;
  } else if (isCreate) {
    throw ApiError.badRequest('SKU is required');
  }
  if (b.price !== undefined) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price < 0) throw ApiError.badRequest('Price must be a non-negative number');
    data.price = Math.round(price * 100) / 100;
  } else if (isCreate) {
    throw ApiError.badRequest('Price is required');
  }
  if (b.compareAtPrice !== undefined) {
    const cp = Number(b.compareAtPrice);
    if (!Number.isFinite(cp) || cp < 0) throw ApiError.badRequest('Compare-at price must be a non-negative number');
    data.compareAtPrice = Math.round(cp * 100) / 100;
  }
  if (b.language !== undefined) data.language = String(b.language).trim().slice(0, 50) || 'English';
  if (b.edition !== undefined) data.edition = String(b.edition).trim().slice(0, 100);
  if (b.pages !== undefined) {
    const pages = Number(b.pages);
    if (!Number.isInteger(pages) || pages < 0) throw ApiError.badRequest('Pages must be a non-negative integer');
    data.pages = pages;
  }
  if (b.coverImage !== undefined) data.coverImage = String(b.coverImage).trim();
  if (b.galleryImages !== undefined) data.galleryImages = Array.isArray(b.galleryImages) ? b.galleryImages.map((u) => String(u).trim()).filter(Boolean) : [];
  if (b.isPaperback !== undefined) data.isPaperback = Boolean(b.isPaperback);

  if (b.stock !== undefined) {
    const stock = Number(b.stock);
    if (!Number.isInteger(stock) || stock < 0) throw ApiError.badRequest('Stock must be a non-negative integer');
    data.stock = stock;
  }
  if (b.lowStockThreshold !== undefined) {
    const lt = Number(b.lowStockThreshold);
    if (!Number.isInteger(lt) || lt < 0) throw ApiError.badRequest('Low stock threshold must be a non-negative integer');
    data.lowStockThreshold = lt;
  }
  if (b.trackInventory !== undefined) data.trackInventory = Boolean(b.trackInventory);
  if (b.allowBackorder !== undefined) data.allowBackorder = Boolean(b.allowBackorder);

  if (b.status !== undefined) {
    if (!BOOK_STATUSES.includes(b.status)) throw ApiError.badRequest(`Invalid status. Valid: ${BOOK_STATUSES.join(', ')}`);
    data.status = b.status;
  }
  if (b.featured !== undefined) data.featured = Boolean(b.featured);
  if (b.displayOrder !== undefined) {
    const doVal = Number(b.displayOrder);
    if (!Number.isFinite(doVal)) throw ApiError.badRequest('Display order must be a number');
    data.displayOrder = doVal;
  }

  if (b.seoTitle !== undefined) data.seoTitle = String(b.seoTitle).trim().slice(0, 200);
  if (b.seoDescription !== undefined) data.seoDescription = String(b.seoDescription).trim().slice(0, 500);
  if (b.seoKeywords !== undefined) data.seoKeywords = String(b.seoKeywords).trim().slice(0, 300);

  return data;
}

export default { listBooks, getBookBySlug, adminListBooks, adminCreateBook, adminUpdateBook, adminSetBookStatus, adminAdjustStock, adminDeleteBook, adminBookStats };