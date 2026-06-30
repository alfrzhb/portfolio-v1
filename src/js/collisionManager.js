const DEFAULT_PLAYER_HITBOX = {
  width: 28,
  height: 18,
  offset_x: -14,
  offset_y: -18,
};

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function normalizeRect(rawRect, source) {
  const rect = {
    id: rawRect.id ?? source,
    targetId: rawRect.target_id ?? null,
    type: rawRect.type ?? "rect",
    x: Number(rawRect.x),
    y: Number(rawRect.y),
    width: Number(rawRect.width),
    height: Number(rawRect.height),
    blocking: rawRect.blocking ?? true,
    source,
  };

  const isValid =
    rect.type === "rect" &&
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    rect.width > 0 &&
    rect.height > 0;

  if (!isValid) {
    console.warn("Alfarizi Plaza: invalid collision rectangle skipped.", rawRect);
    return null;
  }

  return rect;
}

function normalizeColliders(collisionData) {
  const bounds = (collisionData.bounds ?? [])
    .map((rect) => normalizeRect(rect, "bounds"))
    .filter(Boolean);
  const colliders = (collisionData.colliders ?? [])
    .filter((rect) => rect.blocking !== false)
    .map((rect) => normalizeRect(rect, "colliders"))
    .filter(Boolean);

  return {
    bounds,
    colliders,
    blockingRects: [...bounds, ...colliders],
  };
}

export function checkCollision(rectA, rectB) {
  return (
    rectA.x < rectB.x + rectB.width &&
    rectA.x + rectA.width > rectB.x &&
    rectA.y < rectB.y + rectB.height &&
    rectA.y + rectA.height > rectB.y
  );
}

export function createCollisionManager(collisionData) {
  const playerHitbox = {
    ...DEFAULT_PLAYER_HITBOX,
    ...(collisionData.settings?.player_hitbox ?? {}),
  };
  const normalized = normalizeColliders(collisionData);

  function getPlayerHitbox(playerState) {
    return {
      x: playerState.x + playerHitbox.offset_x,
      y: playerState.y + playerHitbox.offset_y,
      width: playerHitbox.width,
      height: playerHitbox.height,
    };
  }

  function getCollisionFor(playerState) {
    const hitbox = getPlayerHitbox(playerState);

    return normalized.blockingRects.find((collider) => checkCollision(hitbox, collider)) ?? null;
  }

  function canMoveTo(nextPlayerState) {
    return !getCollisionFor(nextPlayerState);
  }

  function resolveMovement(currentState, proposedState) {
    const resolvedState = { ...currentState };
    const proposedXState = {
      ...resolvedState,
      x: proposedState.x,
    };

    if (canMoveTo(proposedXState)) {
      resolvedState.x = proposedState.x;
    }

    const proposedYState = {
      ...resolvedState,
      y: proposedState.y,
    };

    if (canMoveTo(proposedYState)) {
      resolvedState.y = proposedState.y;
    }

    return resolvedState;
  }

  return {
    getPlayerHitbox,
    getCollisionFor,
    canMoveTo,
    resolveMovement,
    checkCollision,
    playerHitbox,
    bounds: normalized.bounds,
    colliders: normalized.colliders,
    blockingRects: normalized.blockingRects,
  };
}
