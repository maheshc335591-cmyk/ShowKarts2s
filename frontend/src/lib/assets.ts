export const assetUrl = (path: string) =>
  path.startsWith("/") && !path.startsWith(import.meta.env.BASE_URL)
    ? `${import.meta.env.BASE_URL}${path.slice(1)}`
    : path;
