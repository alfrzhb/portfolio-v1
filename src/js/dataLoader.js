const JSON_PATHS = {
  maps: {
    plaza: "assets/maps/alfarizi_plaza.json",
    groundLayer: "assets/maps/ground_layer.json",
    decorationLayer: "assets/maps/decoration_layer.json",
  },
  interactions: "assets/maps/interactions.json",
  collisions: "assets/maps/collision_layer.json",
  portfolioData: {
    profile: "assets/data/profile.json",
    npcDialogs: "assets/data/npc_dialogs.json",
    projects: "assets/data/projects.json",
    skills: "assets/data/skills.json",
    education: "assets/data/education.json",
    professional: "assets/data/professional.json",
    organization: "assets/data/organization.json",
    achievements: "assets/data/achievements.json",
    contact: "assets/data/contact.json",
    cv: "assets/data/cv.json",
  },
};

async function fetchJson(path) {
  let response;

  try {
    response = await fetch(path, { cache: "no-cache" });
  } catch (error) {
    console.error(`Alfarizi Plaza: failed to request JSON at ${path}.`, error);
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} ${response.statusText}`);
    console.error(`Alfarizi Plaza: failed to load JSON at ${path}.`, error);
    throw error;
  }

  try {
    return await response.json();
  } catch (error) {
    console.error(`Alfarizi Plaza: invalid JSON at ${path}.`, error);
    throw error;
  }
}

async function loadJsonGroup(paths) {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [key, await fetchJson(path)]),
  );

  return Object.fromEntries(entries);
}

async function fetchOptionalJson(path) {
  try {
    return await fetchJson(path);
  } catch (error) {
    console.warn(`Alfarizi Plaza: optional JSON skipped at ${path}.`, error);
    return null;
  }
}

async function loadMapData(paths) {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, path]) => {
      const isOptionalMap = key === "groundLayer" || key === "decorationLayer";
      const data = isOptionalMap ? await fetchOptionalJson(path) : await fetchJson(path);

      return [key, data];
    }),
  );

  return Object.fromEntries(entries);
}

export async function loadProjectData() {
  const [maps, interactions, collisions, portfolioData] = await Promise.all([
    loadMapData(JSON_PATHS.maps),
    fetchJson(JSON_PATHS.interactions),
    fetchJson(JSON_PATHS.collisions),
    loadJsonGroup(JSON_PATHS.portfolioData),
  ]);

  return {
    maps,
    interactions,
    collisions,
    portfolioData,
    meta: {
      paths: JSON_PATHS,
      loadedCount:
        Object.keys(maps).filter((key) => maps[key]).length +
        1 +
        1 +
        Object.keys(JSON_PATHS.portfolioData).length,
    },
  };
}
