const express = require("express");
const Product = require("../models/Product");
const { requireAdmin, requireOwner } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createProductSchema, updateProductSchema } = require("../schemas/productSchemas");
const { logAction } = require("../utils/audit");

const router = express.Router();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/products  — public product list, with search/filter/pagination
router.get("/", async (req, res) => {
  const { search, category, brand, warranty, minPrice, maxPrice, flashSale, page = 1, limit = 12, featured } = req.query;

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (warranty) filter.warranty = warranty;
  if (featured === "true") filter.isFeatured = true;
  if (flashSale === "true") {
    filter["flashSale.active"] = true;
    filter["flashSale.endsAt"] = { $gt: new Date() };
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({ products, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// GET /api/products/filters — public, distinct brand/warranty values + price range for the "smart finder" sidebar
router.get("/filters", async (req, res) => {
  const [brands, warranties, priceStats] = await Promise.all([
    Product.distinct("brand", { isActive: true, brand: { $ne: null, $ne: "" } }),
    Product.distinct("warranty", { isActive: true }),
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
    ]),
  ]);
  res.json({
    brands: brands.sort(),
    warranties: warranties.filter(Boolean).sort(),
    priceRange: priceStats[0] ? { min: priceStats[0].min, max: priceStats[0].max } : { min: 0, max: 0 },
  });
});

// GET /api/products/:slug — public single product
router.get("/:slug", async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true });
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json(product);
});

// POST /api/products — admin only, create product
router.post("/", requireAdmin, validateBody(createProductSchema), async (req, res) => {
  const data = req.body;
  let baseSlug = slugify(data.name);
  let slug = baseSlug;
  let i = 1;
  while (await Product.findOne({ slug })) {
    slug = `${baseSlug}-${i++}`;
  }

  const product = await Product.create({ ...data, slug });
  await logAction(req, "product.create", { targetType: "Product", targetId: product._id, meta: { name: product.name } });
  res.status(201).json(product);
});

// PUT /api/products/:id — admin or manager, update product
router.put("/:id", requireAdmin, validateBody(updateProductSchema), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ message: "Product not found." });
  await logAction(req, "product.update", { targetType: "Product", targetId: product._id, meta: req.body });
  res.json(product);
});

// DELETE /api/products/:id — owner (admin) only, soft-delete (deactivate).
// Deleting/deactivating listings is kept out of manager hands so a
// disgruntled staff account can't wipe the catalog.
router.delete("/:id", requireOwner, async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) return res.status(404).json({ message: "Product not found." });
  await logAction(req, "product.delete", { targetType: "Product", targetId: product._id, meta: { name: product.name } });
  res.json({ message: "Product removed." });
});

module.exports = router;
