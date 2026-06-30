const IMAGE_PATH_PATTERN = /^assets\/.+\.(png|jpg|jpeg|gif|webp)$/i;

function walkForImagePaths(value, paths) {
  if (!value) {
    return;
  }

  if (typeof value === "string") {
    if (IMAGE_PATH_PATTERN.test(value)) {
      paths.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => walkForImagePaths(item, paths));
    return;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) => walkForImagePaths(item, paths));
  }
}

export function collectImagePaths(...sources) {
  const paths = new Set();

  sources.forEach((source) => walkForImagePaths(source, paths));

  return [...paths].sort();
}

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.decoding = "async";
    image.onload = () => resolve({ path, image });
    image.onerror = () => {
      reject(new Error(`Image failed to load: ${path}`));
    };
    image.src = path;
  });
}

export async function preloadImages(paths) {
  const uniquePaths = [...new Set(paths)];
  const results = await Promise.allSettled(uniquePaths.map(loadImage));
  const cache = Object.create(null);
  const loaded = [];
  const failed = [];

  results.forEach((result, index) => {
    const path = uniquePaths[index];

    if (result.status === "fulfilled") {
      cache[path] = result.value.image;
      loaded.push(path);
      return;
    }

    console.warn(`Alfarizi Plaza: image preload failed for ${path}.`, result.reason);
    failed.push({ path, reason: result.reason });
  });

  return {
    cache,
    loaded,
    failed,
  };
}
