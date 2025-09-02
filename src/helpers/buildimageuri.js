const buildImageUri = (host, logoPath) => {
  if (!logoPath) return null;
  const path = String(logoPath);
  if (/^https?:\/\//i.test(path)) return path;
  if (!host) return path;
  return `${host.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

export default buildImageUri;
