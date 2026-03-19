export let count = 0;

export const increment = () => {
  count++;
};

export const getStats = () => ({
  totalRequests: count,
});
