let count = 0;

const increment = () => {
  count++;
};

const getStats = () => ({
  totalRequests: count,
});

module.exports = {
  count,
  increment,
  getStats,
};
