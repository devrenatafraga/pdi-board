function getUserId(req) {
  return req.auth?.userId || null;
}

module.exports = { getUserId };

