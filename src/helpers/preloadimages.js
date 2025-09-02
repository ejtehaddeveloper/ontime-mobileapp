const preloadImages = (items = [], options = {limit: 30}) => {
  try {
    if (!Array.isArray(items) || items.length === 0) return;
    const sources = items
      .map(it => buildImageUri(hostImge, it?.images?.logo))
      .filter(Boolean)
      .slice(0, options.limit)
      .map(uri => ({uri, priority: FastImage.priority.normal}));
    if (sources.length > 0) FastImage.preload(sources);
  } catch (err) {
    // don't crash app if preload fails
    console.log('FastImage preload error', err);
  }
};
export default preloadImages;
