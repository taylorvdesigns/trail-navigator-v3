module.exports = async (req, res) => {
  res.status(200).json({ message: "Test function is working!", routeId: req.query.routeId });
}; 