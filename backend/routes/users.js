const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Product = require("../models/Product");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { updateProfileSchema, addressSchema, changePasswordSchema } = require("../schemas/userSchemas");

const router = express.Router();

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    addresses: user.addresses,
  };
}

// GET /api/users/me — full profile for the logged-in user
router.get("/me", requireAuth(), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.isDeleted) return res.status(404).json({ message: "Account not found." });
  res.json(publicUser(user));
});

// PUT /api/users/me — update name/phone
router.put("/me", requireAuth(), validateBody(updateProfileSchema), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true, runValidators: true });
  res.json(publicUser(user));
});

// PUT /api/users/me/password — change password (requires current password)
router.put("/me/password", requireAuth(), validateBody(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return res.status(400).json({ message: "Current password is incorrect." });

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  // Changing the password revokes every other logged-in session for safety.
  user.refreshTokens = [];
  await user.save();
  res.json({ message: "Password updated. Please log in again." });
});

// POST /api/users/me/addresses — add a saved address
router.post("/me/addresses", requireAuth(), validateBody(addressSchema), async (req, res) => {
  const user = await User.findById(req.user.id);
  user.addresses.push(req.body);
  await user.save();
  res.status(201).json(user.addresses);
});

// DELETE /api/users/me/addresses/:addressId
router.delete("/me/addresses/:addressId", requireAuth(), async (req, res) => {
  const user = await User.findById(req.user.id);
  user.addresses = user.addresses.filter((a) => String(a._id) !== req.params.addressId);
  await user.save();
  res.json(user.addresses);
});

// GET /api/users/me/wishlist
router.get("/me/wishlist", requireAuth(), async (req, res) => {
  const user = await User.findById(req.user.id).populate({
    path: "wishlist",
    match: { isActive: true },
  });
  res.json({ products: user.wishlist });
});

// POST /api/users/me/wishlist/:productId
router.post("/me/wishlist/:productId", requireAuth(), async (req, res) => {
  const product = await Product.findById(req.params.productId);
  if (!product) return res.status(404).json({ message: "Product not found." });

  await User.updateOne({ _id: req.user.id }, { $addToSet: { wishlist: product._id } });
  res.status(201).json({ message: "Added to wishlist." });
});

// DELETE /api/users/me/wishlist/:productId
router.delete("/me/wishlist/:productId", requireAuth(), async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $pull: { wishlist: req.params.productId } });
  res.json({ message: "Removed from wishlist." });
});

module.exports = router;
