const PROMPT_LABELS = {
  talk: "[F] Talk",
  read: "[F] Read",
  interact: "[F] Interact",
};

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createObjectLookup(mapData) {
  return new Map((mapData.objects ?? []).map((object) => [object.id, object]));
}

function getObjectBounds(object) {
  const position = object.position ?? { x: 0, y: 0 };
  const size = object.size ?? { width: 0, height: 0 };
  const anchor = object.anchor ?? "top_left";
  let x = position.x;
  let y = position.y;

  if (anchor === "bottom_center") {
    x = position.x - size.width / 2;
    y = position.y - size.height;
  } else if (anchor === "center") {
    x = position.x - size.width / 2;
    y = position.y - size.height / 2;
  }

  return {
    x,
    y,
    width: size.width,
    height: size.height,
  };
}

function getDistanceToRect(point, rect) {
  if (!rect.width || !rect.height) {
    return Infinity;
  }

  const nearestPoint = {
    x: clamp(point.x, rect.x, rect.x + rect.width),
    y: clamp(point.y, rect.y, rect.y + rect.height),
  };

  return getDistance(point, nearestPoint);
}

export function createInteractionManager(interactionData, mapData) {
  const objectLookup = createObjectLookup(mapData);
  const defaultRange = interactionData.settings?.default_range ?? 80;
  const missingTargets = [];

  const targets = (interactionData.interactions ?? [])
    .map((interaction) => {
      const targetObject = objectLookup.get(interaction.target_id);

      if (!targetObject) {
        missingTargets.push(interaction.target_id);
        console.warn(
          `Alfarizi Plaza: interaction target not found: ${interaction.target_id}.`,
          interaction,
        );
        return null;
      }

      return {
        ...interaction,
        targetObject,
        targetBounds: getObjectBounds(targetObject),
        range: interaction.range ?? defaultRange,
        prompt: PROMPT_LABELS[interaction.type] ?? "[F] Interact",
        position: interaction.position ?? targetObject.position,
      };
    })
    .filter(Boolean);

  function getActiveInteraction(playerState) {
    const playerPosition = {
      x: playerState.x,
      y: playerState.y,
    };

    return (
      targets
        .map((interaction) => {
          const pointDistance = getDistance(playerPosition, interaction.position);
          const boundsDistance = getDistanceToRect(playerPosition, interaction.targetBounds);
          const distance = Math.min(pointDistance, boundsDistance);

          return {
            ...interaction,
            distance,
            pointDistance,
            boundsDistance,
          };
        })
        .filter((interaction) => interaction.distance <= interaction.range)
        .sort((a, b) => a.distance - b.distance)[0] ?? null
    );
  }

  function handleInteractKey(activeInteraction) {
    if (!activeInteraction) {
      console.info("Interact pressed with no active target.");
      return;
    }

    console.info(`Interact pressed on: ${activeInteraction.target_id}`, {
      interactionId: activeInteraction.id,
      type: activeInteraction.type,
      actionType: activeInteraction.action?.type,
    });
  }

  return {
    getActiveInteraction,
    handleInteractKey,
    interactions: interactionData.interactions ?? [],
    targets,
    missingTargets,
  };
}
