const MOVEMENT_KEYS = {
  w: "up",
  arrowup: "up",
  a: "left",
  arrowleft: "left",
  s: "down",
  arrowdown: "down",
  d: "right",
  arrowright: "right",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPlayerBounds(mapData) {
  const { player, settings } = mapData;
  const width = player.size?.width ?? 0;
  const height = player.size?.height ?? 0;

  return {
    minX: width / 2,
    maxX: settings.world_width - width / 2,
    minY: height,
    maxY: settings.world_height,
  };
}

export function createPlayerController(mapData, options = {}) {
  const { player } = mapData;
  const speedPerFrame = player.movement?.speed ?? 3.2;
  const speed = speedPerFrame * 60;
  const bounds = getPlayerBounds(mapData);
  const collisionManager = options.collisionManager ?? null;
  const pressedDirections = new Set();

  const state = {
    x: player.spawn.x,
    y: player.spawn.y,
    direction: "down",
    isMoving: false,
  };

  function handleKeyDown(event) {
    const direction = MOVEMENT_KEYS[event.key.toLowerCase()];

    if (!direction) {
      return;
    }

    event.preventDefault();
    pressedDirections.delete(direction);
    pressedDirections.add(direction);
    state.direction = direction;
  }

  function handleKeyUp(event) {
    const direction = MOVEMENT_KEYS[event.key.toLowerCase()];

    if (!direction) {
      return;
    }

    event.preventDefault();
    pressedDirections.delete(direction);
  }

  function attach() {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }

  function detach() {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    pressedDirections.clear();
  }

  function update(deltaSeconds) {
    let dx = 0;
    let dy = 0;

    if (pressedDirections.has("up")) {
      dy -= 1;
    }
    if (pressedDirections.has("down")) {
      dy += 1;
    }
    if (pressedDirections.has("left")) {
      dx -= 1;
    }
    if (pressedDirections.has("right")) {
      dx += 1;
    }

    state.isMoving = dx !== 0 || dy !== 0;

    if (!state.isMoving) {
      return state;
    }

    state.direction = [...pressedDirections].at(-1) ?? state.direction;

    if (dx !== 0 && dy !== 0) {
      const diagonalScale = Math.SQRT1_2;
      dx *= diagonalScale;
      dy *= diagonalScale;
    }

    const proposedState = {
      ...state,
      x: clamp(state.x + dx * speed * deltaSeconds, bounds.minX, bounds.maxX),
      y: clamp(state.y + dy * speed * deltaSeconds, bounds.minY, bounds.maxY),
    };

    const resolvedState = collisionManager
      ? collisionManager.resolveMovement(state, proposedState)
      : proposedState;

    state.x = resolvedState.x;
    state.y = resolvedState.y;

    return state;
  }

  function getState() {
    return { ...state };
  }

  return {
    attach,
    detach,
    update,
    getState,
    bounds,
    collisionManager,
    speed,
    speedPerFrame,
  };
}
