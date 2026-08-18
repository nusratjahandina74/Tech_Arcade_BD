const express = require("express");
const LandingPage = require("../models/LandingPage");
const { requireAdmin } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createLandingPageSchema, updateLandingPageSchema } = require("../schemas/landingPageSchemas");
const { logAction } = require("../utils/audit");

const router = express.Router();

// GET /api/landing-pages — admin/manager, list all (optionally filter by product)
router.get("/", requireAdmin, async (req, res) => {
  const filter = {};
  if (req.query.product) filter.product = req.query.product;
  const pages = await LandingPage.find(filter).populate("product", "name slug price images").sort({ createdAt: -1 });
  res.json({ pages });
});

// GET /api/landing-pages/:slug — public, powers the live funnel page
router.get("/:slug", async (req, res) => {
  const page = await LandingPage.findOne({ slug: req.params.slug, isActive: true }).populate("product");
  if (!page || !page.product || !page.product.isActive) {
    return res.status(404).json({ message: "This page isn't available." });
  }
  LandingPage.updateOne({ _id: page._id }, { $inc: { views: 1 } }).catch(() => {}); // fire-and-forget
  res.json(page);
});

// POST /api/landing-pages — admin/manager, create a new landing page (unlimited per product)
router.post("/", requireAdmin, validateBody(createLandingPageSchema), async (req, res) => {
  const existing = await LandingPage.findOne({ slug: req.body.slug });
  if (existing) return res.status(400).json({ message: "This slug is already used by another landing page." });

  const page = await LandingPage.create(req.body);
  await logAction(req, "landingpage.create", { targetType: "LandingPage", targetId: page._id, meta: { slug: page.slug } });
  res.status(201).json(page);
});

// PUT /api/landing-pages/:id — admin/manager
router.put("/:id", requireAdmin, validateBody(updateLandingPageSchema), async (req, res) => {
  if (req.body.slug) {
    const existing = await LandingPage.findOne({ slug: req.body.slug, _id: { $ne: req.params.id } });
    if (existing) return res.status(400).json({ message: "This slug is already used by another landing page." });
  }

  const page = await LandingPage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!page) return res.status(404).json({ message: "Landing page not found." });
  await logAction(req, "landingpage.update", { targetType: "LandingPage", targetId: page._id, meta: { slug: page.slug } });
  res.json(page);
});

// DELETE /api/landing-pages/:id — admin/manager, soft delete
router.delete("/:id", requireAdmin, async (req, res) => {
  const page = await LandingPage.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!page) return res.status(404).json({ message: "Landing page not found." });
  await logAction(req, "landingpage.delete", { targetType: "LandingPage", targetId: page._id, meta: { slug: page.slug } });
  res.json({ message: "Landing page removed." });
});

module.exports = router;
