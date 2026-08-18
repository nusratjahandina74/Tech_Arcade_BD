// Wraps a Zod schema as Express middleware. Validates req.body (or a custom
// source) and replaces it with the parsed/coerced value on success, so
// downstream handlers can trust the shape and types of the data.
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return res.status(400).json({
        message: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid request.",
        errors: result.error.issues,
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validateBody };
