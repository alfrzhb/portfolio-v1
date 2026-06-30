function getLayerOrder(mapData) {
  return Object.fromEntries(
    (mapData.layers ?? []).map((layer) => [layer.id, layer.z_index ?? 0]),
  );
}

function getAnchoredRect(position, size, anchor = "top_left") {
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  let x = position?.x ?? 0;
  let y = position?.y ?? 0;

  if (anchor === "bottom_center") {
    x -= width / 2;
    y -= height;
  } else if (anchor === "center") {
    x -= width / 2;
    y -= height / 2;
  }

  return {
    x,
    y,
    width,
    height,
    drawY: y + height,
  };
}

const PLAYER_DIRECTION_ROWS = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

const PLAYER_SPRITE_COLS = 3;
const PLAYER_SPRITE_ROWS = 4;
const PLAYER_IDLE_COLUMN = 1;
const PLAYER_ALPHA_THRESHOLD = 8;
const PLAYER_CROP_PADDING = 1;
const PLAYER_UP_SOURCE_OVERLAP = 56;

const warnedSpritesheets = new Set();
const playerFrameCropCache = new WeakMap();
const uiImageCropCache = new WeakMap();
const decorationCropCache = new WeakMap();
const groundTileRenderCache = new WeakMap();
const cameraStateCache = new WeakMap();
const warnedGroundTiles = new Set();
const warnedDecorationTiles = new Set();

function getImageFrameCache(image) {
  if (!playerFrameCropCache.has(image)) {
    playerFrameCropCache.set(image, new Map());
  }

  return playerFrameCropCache.get(image);
}

function getAlphaIndex(x, y, width) {
  return (y * width + x) * 4 + 3;
}

function findMainComponentCrop(image, frameX, frameY, frameWidth, frameHeight, cacheKey) {
  const cache = getImageFrameCache(image);

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const fallbackCrop = {
    x: 0,
    y: 0,
    width: frameWidth,
    height: frameHeight,
  };

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    canvas.width = frameWidth;
    canvas.height = frameHeight;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, frameWidth, frameHeight);
    context.drawImage(
      image,
      frameX,
      frameY,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight,
    );

    const pixels = context.getImageData(0, 0, frameWidth, frameHeight).data;
    const visited = new Uint8Array(frameWidth * frameHeight);
    let largest = null;

    for (let y = 0; y < frameHeight; y += 1) {
      for (let x = 0; x < frameWidth; x += 1) {
        const startIndex = y * frameWidth + x;

        if (visited[startIndex] || pixels[getAlphaIndex(x, y, frameWidth)] <= PLAYER_ALPHA_THRESHOLD) {
          visited[startIndex] = 1;
          continue;
        }

        const stack = [[x, y]];
        visited[startIndex] = 1;
        let count = 0;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        while (stack.length > 0) {
          const [currentX, currentY] = stack.pop();
          count += 1;
          minX = Math.min(minX, currentX);
          maxX = Math.max(maxX, currentX);
          minY = Math.min(minY, currentY);
          maxY = Math.max(maxY, currentY);

          const neighbors = [
            [currentX + 1, currentY],
            [currentX - 1, currentY],
            [currentX, currentY + 1],
            [currentX, currentY - 1],
          ];

          neighbors.forEach(([nextX, nextY]) => {
            if (nextX < 0 || nextY < 0 || nextX >= frameWidth || nextY >= frameHeight) {
              return;
            }

            const nextIndex = nextY * frameWidth + nextX;

            if (
              visited[nextIndex] ||
              pixels[getAlphaIndex(nextX, nextY, frameWidth)] <= PLAYER_ALPHA_THRESHOLD
            ) {
              visited[nextIndex] = 1;
              return;
            }

            visited[nextIndex] = 1;
            stack.push([nextX, nextY]);
          });
        }

        if (!largest || count > largest.count) {
          largest = {
            count,
            minX,
            maxX,
            minY,
            maxY,
          };
        }
      }
    }

    if (!largest) {
      cache.set(cacheKey, fallbackCrop);
      return fallbackCrop;
    }

    const crop = {
      x: Math.max(0, largest.minX - PLAYER_CROP_PADDING),
      y: Math.max(0, largest.minY - PLAYER_CROP_PADDING),
      width:
        Math.min(frameWidth - 1, largest.maxX + PLAYER_CROP_PADDING) -
        Math.max(0, largest.minX - PLAYER_CROP_PADDING) +
        1,
      height:
        Math.min(frameHeight - 1, largest.maxY + PLAYER_CROP_PADDING) -
        Math.max(0, largest.minY - PLAYER_CROP_PADDING) +
        1,
    };

    cache.set(cacheKey, crop);
    return crop;
  } catch (error) {
    if (!warnedSpritesheets.has(`${image.src}:component-crop`)) {
      warnedSpritesheets.add(`${image.src}:component-crop`);
      console.warn(
        "Alfarizi Plaza: could not analyze player frame alpha. Falling back to full frame crop.",
        error,
      );
    }

    cache.set(cacheKey, fallbackCrop);
    return fallbackCrop;
  }
}

function getPlayerSourceRect(image, playerState = null, animationTime = 0) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const hasExpectedLayout =
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0 &&
    width % PLAYER_SPRITE_COLS === 0 &&
    height % PLAYER_SPRITE_ROWS === 0;

  const fallbackWidth = width || image.width || PLAYER_SPRITE_COLS;
  const fallbackHeight = height || image.height || PLAYER_SPRITE_ROWS;
  const fallbackFrameWidth = Math.floor(fallbackWidth / PLAYER_SPRITE_COLS);
  const fallbackFrameHeight = Math.floor(fallbackHeight / PLAYER_SPRITE_ROWS);

  if (!hasExpectedLayout) {
    if (!warnedSpritesheets.has(image.src)) {
      warnedSpritesheets.add(image.src);
      console.warn(
        "Alfarizi Plaza: player spritesheet does not match expected 3x4 layout. Falling back to row 0, column 1.",
      );
    }

    return {
      sx: fallbackFrameWidth,
      sy: 0,
      sw: fallbackFrameWidth || image.width,
      sh: fallbackFrameHeight || image.height,
      frameWidth: fallbackFrameWidth || image.width,
      frameHeight: fallbackFrameHeight || image.height,
    };
  }

  const frameWidth = Math.floor(width / PLAYER_SPRITE_COLS);
  const frameHeight = Math.floor(height / PLAYER_SPRITE_ROWS);
  const direction = playerState?.direction ?? "down";
  const row = PLAYER_DIRECTION_ROWS[direction] ?? PLAYER_DIRECTION_ROWS.down;
  const column = playerState?.isMoving
    ? Math.floor(animationTime / 140) % PLAYER_SPRITE_COLS
    : PLAYER_IDLE_COLUMN;
  const frameX = column * frameWidth;
  const frameY = row * frameHeight;
  const sourceOverlap = direction === "up" ? Math.min(PLAYER_UP_SOURCE_OVERLAP, frameY) : 0;
  const analysisY = frameY - sourceOverlap;
  const analysisHeight = Math.min(frameHeight + sourceOverlap, height - analysisY);
  const componentCrop = findMainComponentCrop(
    image,
    frameX,
    analysisY,
    frameWidth,
    analysisHeight,
    `${row}:${column}:${analysisY}:${analysisHeight}`,
  );
  const sx = frameX + componentCrop.x;
  const sy = analysisY + componentCrop.y;
  const sw = componentCrop.width;
  const sh = componentCrop.height;

  if (sw <= 0 || sh <= 0) {
    console.warn(
      "Alfarizi Plaza: invalid player frame crop. Falling back to row 0, column 1.",
      { direction, row, column, sx, sy, sw, sh },
    );

    return {
      sx: PLAYER_IDLE_COLUMN * frameWidth,
      sy: 0,
      sw: frameWidth,
      sh: frameHeight,
      frameWidth,
      frameHeight,
    };
  }

  return {
    sx,
    sy,
    sw,
    sh,
    frameWidth,
    frameHeight,
  };
}

function drawWorldBackground(ctx, mapData) {
  const { settings, player } = mapData;
  const width = settings.world_width;
  const height = settings.world_height;
  const tileSize = settings.tile_size ?? 32;
  const baseColor = settings.background_color ?? "#7dbb5a";
  const spawn = player.spawn;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      const alt = (x / tileSize + y / tileSize) % 2 === 0;
      ctx.fillStyle = alt ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)";
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }

  const pathWidth = tileSize * 4;
  const pathEdge = Math.max(4, tileSize / 4);

  ctx.fillStyle = "#d7b36a";
  ctx.fillRect(0, spawn.y - pathWidth / 2, width, pathWidth);
  ctx.fillRect(spawn.x - pathWidth / 2, 0, pathWidth, height);

  ctx.fillStyle = "#b88a52";
  ctx.fillRect(0, spawn.y - pathWidth / 2, width, pathEdge);
  ctx.fillRect(0, spawn.y + pathWidth / 2 - pathEdge, width, pathEdge);
  ctx.fillRect(spawn.x - pathWidth / 2, 0, pathEdge, height);
  ctx.fillRect(spawn.x + pathWidth / 2 - pathEdge, 0, pathEdge, height);

  ctx.fillStyle = "rgba(255, 240, 191, 0.22)";
  ctx.fillRect(spawn.x - pathWidth, spawn.y - pathWidth, pathWidth * 2, pathWidth * 2);
}

function getGroundTile(groundLayer, tileId) {
  const tile = groundLayer?.tile_sources?.tiles?.[tileId];

  if (!tile && !warnedGroundTiles.has(tileId)) {
    warnedGroundTiles.add(tileId);
    console.warn(`Alfarizi Plaza: ground tile not found: ${tileId}.`);
  }

  return tile ?? null;
}

function getGroundTileImageCache(image) {
  if (!groundTileRenderCache.has(image)) {
    groundTileRenderCache.set(image, new Map());
  }

  return groundTileRenderCache.get(image);
}

function drawTileSource(context, image, source, width, height) {
  context.drawImage(
    image,
    Math.round(source.x),
    Math.round(source.y),
    Math.round(source.width),
    Math.round(source.height),
    0,
    0,
    width,
    height,
  );
}

function drawBorderSeam(context, edge, size, thickness) {
  const dark = "#665c43";
  const shadow = "#8b7d55";
  const grassEdge = "#6f9829";

  context.fillStyle = dark;

  if (edge === "top") {
    context.fillRect(0, 0, size, 2);
    context.fillStyle = shadow;
    context.fillRect(0, 2, size, 1);
    context.fillStyle = grassEdge;
    context.fillRect(0, thickness - 1, size, 1);
  } else if (edge === "bottom") {
    context.fillRect(0, size - 2, size, 2);
    context.fillStyle = shadow;
    context.fillRect(0, size - 3, size, 1);
    context.fillStyle = grassEdge;
    context.fillRect(0, size - thickness, size, 1);
  } else if (edge === "left") {
    context.fillRect(0, 0, 2, size);
    context.fillStyle = shadow;
    context.fillRect(2, 0, 1, size);
    context.fillStyle = grassEdge;
    context.fillRect(thickness - 1, 0, 1, size);
  } else if (edge === "right") {
    context.fillRect(size - 2, 0, 2, size);
    context.fillStyle = shadow;
    context.fillRect(size - 3, 0, 1, size);
    context.fillStyle = grassEdge;
    context.fillRect(size - thickness, 0, 1, size);
  }
}

function makeCompositeBorderTile(tileImage, tile, outputSize, imageCache) {
  const backgroundImage = imageCache[tile.background_asset];
  const backgroundSource = tile.background_source;
  const edges = tile.border_edges ?? [];
  const thickness = Math.max(4, Math.min(outputSize, Math.round(tile.border_thickness ?? 12)));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const stoneCanvas = document.createElement("canvas");
  const stoneContext = stoneCanvas.getContext("2d");

  canvas.width = outputSize;
  canvas.height = outputSize;
  stoneCanvas.width = outputSize;
  stoneCanvas.height = outputSize;
  context.imageSmoothingEnabled = false;
  stoneContext.imageSmoothingEnabled = false;

  if (backgroundImage && backgroundSource) {
    drawTileSource(context, backgroundImage, backgroundSource, outputSize, outputSize);
  }

  drawTileSource(stoneContext, tileImage, tile.source, outputSize, outputSize);

  edges.forEach((edge) => {
    context.save();
    context.beginPath();

    if (edge === "top") {
      context.rect(0, 0, outputSize, thickness);
    } else if (edge === "bottom") {
      context.rect(0, outputSize - thickness, outputSize, thickness);
    } else if (edge === "left") {
      context.rect(0, 0, thickness, outputSize);
    } else if (edge === "right") {
      context.rect(outputSize - thickness, 0, thickness, outputSize);
    }

    context.clip();
    context.drawImage(stoneCanvas, 0, 0);
    context.restore();
  });

  edges.forEach((edge) => drawBorderSeam(context, edge, outputSize, thickness));

  return canvas;
}

function getPixelatedGroundTile(tileImage, tile, destinationSize, imageCache) {
  const source = tile.source ?? {
    x: 0,
    y: 0,
    width: tileImage.naturalWidth || tileImage.width,
    height: tileImage.naturalHeight || tileImage.height,
  };
  const pixelSize = Math.max(1, Math.round(tile.pixel_size ?? destinationSize));
  const outputSize = Math.max(1, Math.round(destinationSize));
  const cache = getGroundTileImageCache(tileImage);
  const cacheKey = [
    source.x,
    source.y,
    source.width,
    source.height,
    pixelSize,
    outputSize,
    (tile.border_edges ?? []).join(","),
    tile.border_thickness ?? 0,
  ].join(":");

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  if (tile.border_edges?.length) {
    const compositeTile = makeCompositeBorderTile(tileImage, tile, outputSize, imageCache);
    cache.set(cacheKey, compositeTile);
    return compositeTile;
  }

  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d");
  const outputCanvas = document.createElement("canvas");
  const outputContext = outputCanvas.getContext("2d");

  sampleCanvas.width = pixelSize;
  sampleCanvas.height = pixelSize;
  sampleContext.imageSmoothingEnabled = false;
  sampleContext.drawImage(
    tileImage,
    Math.round(source.x),
    Math.round(source.y),
    Math.round(source.width),
    Math.round(source.height),
    0,
    0,
    pixelSize,
    pixelSize,
  );

  outputCanvas.width = outputSize;
  outputCanvas.height = outputSize;
  outputContext.imageSmoothingEnabled = false;
  outputContext.drawImage(sampleCanvas, 0, 0, pixelSize, pixelSize, 0, 0, outputSize, outputSize);
  cache.set(cacheKey, outputCanvas);

  return outputCanvas;
}

function drawGroundTile(ctx, tileImage, tile, gridX, gridY, tileSize, imageCache) {
  const source = tile.source ?? {
    x: 0,
    y: 0,
    width: tileImage.naturalWidth || tileImage.width,
    height: tileImage.naturalHeight || tileImage.height,
  };
  const sourceX = Math.round(source.x);
  const sourceY = Math.round(source.y);
  const sourceWidth = Math.round(source.width);
  const sourceHeight = Math.round(source.height);
  const destinationX = Math.round(gridX * tileSize);
  const destinationY = Math.round(gridY * tileSize);
  const destinationSize = Math.round(tileSize);

  ctx.imageSmoothingEnabled = false;

  if (tile.pixel_size) {
    const pixelatedTile = getPixelatedGroundTile(
      tileImage,
      tile,
      destinationSize,
      imageCache,
    );
    ctx.drawImage(pixelatedTile, destinationX, destinationY, destinationSize, destinationSize);
    return;
  }

  ctx.drawImage(
    tileImage,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    destinationX,
    destinationY,
    destinationSize,
    destinationSize,
  );
}

function drawGroundTileRect(
  ctx,
  tileImage,
  tile,
  rect,
  tileSize,
  gridCols,
  gridRows,
  imageCache,
) {
  const startX = Math.max(0, rect.x ?? 0);
  const startY = Math.max(0, rect.y ?? 0);
  const endX = Math.min(gridCols, startX + (rect.width ?? 0));
  const endY = Math.min(gridRows, startY + (rect.height ?? 0));

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      drawGroundTile(ctx, tileImage, tile, x, y, tileSize, imageCache);
    }
  }
}

function drawGroundStamp(ctx, tileImage, tile, stamp, tileSize) {
  const source = tile.source ?? {
    x: 0,
    y: 0,
    width: tileImage.naturalWidth || tileImage.width,
    height: tileImage.naturalHeight || tileImage.height,
  };

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    tileImage,
    Math.round(source.x),
    Math.round(source.y),
    Math.round(source.width),
    Math.round(source.height),
    Math.round((stamp.x ?? 0) * tileSize),
    Math.round((stamp.y ?? 0) * tileSize),
    Math.round((stamp.width ?? 1) * tileSize),
    Math.round((stamp.height ?? 1) * tileSize),
  );
}

function drawGroundLayer(ctx, groundLayer, imageCache) {
  if (!groundLayer) {
    return {
      rendered: false,
      fallbackUsed: true,
      reason: "missing_ground_layer",
      assetCount: 0,
      layers: 0,
    };
  }

  const tileSize = groundLayer.settings?.tile_size ?? groundLayer.tile_sources?.tile_width ?? 32;
  const worldWidth = groundLayer.settings?.world_width ?? ctx.canvas.width;
  const worldHeight = groundLayer.settings?.world_height ?? ctx.canvas.height;
  const gridCols = groundLayer.settings?.grid_cols ?? Math.ceil(worldWidth / tileSize);
  const gridRows = groundLayer.settings?.grid_rows ?? Math.ceil(worldHeight / tileSize);
  let renderedTiles = 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  (groundLayer.layers ?? []).forEach((layer) => {
    if (layer.type === "stamps") {
      (layer.stamps ?? []).forEach((stamp) => {
        const stampTile = getGroundTile(groundLayer, stamp.tile);
        const stampImage = stampTile?.asset ? imageCache[stampTile.asset] : null;

        if (!stampTile || !stampImage) {
          if (stampTile?.asset && !warnedGroundTiles.has(stampTile.asset)) {
            warnedGroundTiles.add(stampTile.asset);
            console.warn(`Alfarizi Plaza: ground stamp image missing: ${stampTile.asset}.`);
          }
          return;
        }

        drawGroundStamp(ctx, stampImage, stampTile, stamp, tileSize);
        renderedTiles += (stamp.width ?? 1) * (stamp.height ?? 1);
      });
      return;
    }

    const tile = getGroundTile(groundLayer, layer.tile);
    const tileImage = tile?.asset ? imageCache[tile.asset] : null;

    if (!tile || !tileImage) {
      if (tile?.asset && !warnedGroundTiles.has(tile.asset)) {
        warnedGroundTiles.add(tile.asset);
        console.warn(`Alfarizi Plaza: ground tile image missing: ${tile.asset}.`);
      }
      return;
    }

    if (layer.type === "fill") {
      drawGroundTileRect(
        ctx,
        tileImage,
        tile,
        { x: 0, y: 0, width: gridCols, height: gridRows },
        tileSize,
        gridCols,
        gridRows,
        imageCache,
      );
      renderedTiles += gridCols * gridRows;
      return;
    }

    if (layer.type === "rects") {
      (layer.rects ?? []).forEach((rect) => {
        drawGroundTileRect(
          ctx,
          tileImage,
          tile,
          rect,
          tileSize,
          gridCols,
          gridRows,
          imageCache,
        );
        renderedTiles += (rect.width ?? 0) * (rect.height ?? 0);
      });
      return;
    }

    if (layer.type === "patches") {
      (layer.patches ?? []).forEach((patch) => {
        drawGroundTileRect(
          ctx,
          tileImage,
          tile,
          patch,
          tileSize,
          gridCols,
          gridRows,
          imageCache,
        );
        renderedTiles += (patch.width ?? 0) * (patch.height ?? 0);
      });
      return;
    }

    if (!warnedGroundTiles.has(layer.id)) {
      warnedGroundTiles.add(layer.id);
      console.warn(`Alfarizi Plaza: unsupported ground layer type: ${layer.type}.`, layer);
    }
  });

  ctx.restore();

  return {
    rendered: renderedTiles > 0,
    fallbackUsed: renderedTiles === 0,
    reason: renderedTiles > 0 ? "rendered" : "no_tiles_rendered",
    assetCount: Object.keys(groundLayer.tile_sources?.tiles ?? {}).length,
    layers: groundLayer.layers?.length ?? 0,
    renderedTiles,
  };
}

function getDecorationDefinition(decorationLayer, decorId) {
  const asset = decorationLayer?.assets?.[decorId];

  if (!asset && !warnedDecorationTiles.has(decorId)) {
    warnedDecorationTiles.add(decorId);
    console.warn(`Alfarizi Plaza: decoration asset not found: ${decorId}.`);
  }

  return asset ?? null;
}

function getDecorationImageCache(image) {
  if (!decorationCropCache.has(image)) {
    decorationCropCache.set(image, new Map());
  }

  return decorationCropCache.get(image);
}

function getTrimmedDecorationSource(image, source) {
  const sourceX = Math.round(source.x);
  const sourceY = Math.round(source.y);
  const sourceWidth = Math.round(source.width);
  const sourceHeight = Math.round(source.height);
  const cache = getDecorationImageCache(image);
  const cacheKey = `${sourceX}:${sourceY}:${sourceWidth}:${sourceHeight}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const fallbackSource = {
    x: sourceX,
    y: sourceY,
    width: sourceWidth,
    height: sourceHeight,
  };

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, sourceWidth, sourceHeight);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );

    const pixels = context.getImageData(0, 0, sourceWidth, sourceHeight).data;
    let minX = sourceWidth;
    let minY = sourceHeight;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        if (pixels[getAlphaIndex(x, y, sourceWidth)] <= PLAYER_ALPHA_THRESHOLD) {
          continue;
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) {
      cache.set(cacheKey, fallbackSource);
      return fallbackSource;
    }

    const padding = 2;
    const trimmedSource = {
      x: sourceX + Math.max(0, minX - padding),
      y: sourceY + Math.max(0, minY - padding),
      width:
        Math.min(sourceWidth - 1, maxX + padding) - Math.max(0, minX - padding) + 1,
      height:
        Math.min(sourceHeight - 1, maxY + padding) - Math.max(0, minY - padding) + 1,
    };

    cache.set(cacheKey, trimmedSource);
    return trimmedSource;
  } catch (error) {
    if (!warnedDecorationTiles.has(`${image.src}:trim`)) {
      warnedDecorationTiles.add(`${image.src}:trim`);
      console.warn("Alfarizi Plaza: could not trim decoration transparency.", error);
    }

    cache.set(cacheKey, fallbackSource);
    return fallbackSource;
  }
}

function makeDecorationRenderable(decoration, decorationLayer, layerOrder) {
  const asset = getDecorationDefinition(decorationLayer, decoration.decor ?? decoration.tile);

  if (!asset || decoration.visible === false) {
    return null;
  }

  const position = decoration.position ?? {
    x: decoration.x,
    y: decoration.y,
  };
  const size = decoration.size ?? {
    width: decoration.width,
    height: decoration.height,
  };
  const layer = decoration.layer ?? "object";
  const rect = getAnchoredRect(position, size, decoration.anchor);

  return {
    kind: "decoration",
    id: decoration.id,
    label: decoration.type ?? decoration.id,
    layer,
    layerOrder: layerOrder[layer] ?? (layer === "ground_object" ? 1 : 3),
    asset,
    source: null,
    rect,
  };
}

function makeDecorationRenderables(decorationLayer, layerOrder) {
  if (!decorationLayer?.assets || !Array.isArray(decorationLayer.decorations)) {
    return [];
  }

  return decorationLayer.decorations
    .map((decoration) => makeDecorationRenderable(decoration, decorationLayer, layerOrder))
    .filter(Boolean);
}

function drawMissingAssetMarker(ctx, rect) {
  ctx.save();
  ctx.fillStyle = "#fff0bf";
  ctx.strokeStyle = "#c9483d";
  ctx.lineWidth = 4;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
  ctx.moveTo(rect.x + rect.width, rect.y);
  ctx.lineTo(rect.x, rect.y + rect.height);
  ctx.stroke();
  ctx.restore();
}

function drawFallbackPrompt(ctx, activeInteraction, playerState) {
  const text = activeInteraction.prompt ?? "[F] Interact";
  const x = playerState.x;
  const y = Math.max(34, playerState.y - 94);
  const width = Math.max(132, text.length * 12);
  const height = 38;
  const left = x - width / 2;
  const top = y - height / 2;

  ctx.save();
  ctx.fillStyle = "#fff0bf";
  ctx.strokeStyle = "#211c28";
  ctx.lineWidth = 4;
  ctx.fillRect(left, top, width, height);
  ctx.strokeRect(left, top, width, height);
  ctx.fillStyle = "#211c28";
  ctx.font = '18px "Courier New", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function drawInteractionPrompt(ctx, activeInteraction, imageCache, playerState) {
  if (!activeInteraction || !playerState) {
    return;
  }

  const promptAsset = activeInteraction.prompt_asset;
  const image = promptAsset ? imageCache[promptAsset] : null;
  const targetWidth = 126;
  const targetHeight = image
    ? Math.max(32, targetWidth * ((image.naturalHeight || image.height) / (image.naturalWidth || image.width)))
    : 0;
  const x = playerState.x - targetWidth / 2;
  const y = Math.max(12, playerState.y - 112);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (image) {
    ctx.drawImage(image, x, y, targetWidth, targetHeight);
  } else {
    drawFallbackPrompt(ctx, activeInteraction, playerState);
  }

  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;

    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
      return;
    }

    if (line) {
      lines.push(line);
    }

    line = word;
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

function drawNineSliceLikeImage(ctx, image, x, y, width, height) {
  if (image) {
    const crop = getUiImageCrop(image);
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      x,
      y,
      width,
      height,
    );
    return;
  }

  ctx.fillStyle = "#fff0bf";
  ctx.strokeStyle = "#211c28";
  ctx.lineWidth = 6;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
}

function getUiImageCrop(image) {
  if (uiImageCropCache.has(image)) {
    return uiImageCropCache.get(image);
  }

  const fallbackCrop = {
    x: 0,
    y: 0,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0);

    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (pixels[getAlphaIndex(x, y, width)] <= PLAYER_ALPHA_THRESHOLD) {
          continue;
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) {
      uiImageCropCache.set(image, fallbackCrop);
      return fallbackCrop;
    }

    const crop = {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };

    uiImageCropCache.set(image, crop);
    return crop;
  } catch (error) {
    console.warn("Alfarizi Plaza: could not crop UI image transparency.", error);
    uiImageCropCache.set(image, fallbackCrop);
    return fallbackCrop;
  }
}

function drawOutlinedText(ctx, text, x, y, options = {}) {
  const {
    fill = "#fff4d6",
    stroke = "rgba(24, 14, 10, 0.92)",
    strokeWidth = 5,
    maxWidth,
  } = options;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  if (maxWidth) {
    ctx.strokeText(text, x, y, maxWidth);
  } else {
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

function drawDialog(ctx, dialogState, imageCache) {
  if (!dialogState?.isOpen) {
    return;
  }

  const dialogBox = imageCache["assets/ui/ui_dialog_box.png"];
  const nameplate = imageCache["assets/ui/ui_dialog_nameplate.png"];
  const arrow = imageCache["assets/ui/ui_dialog_arrow.png"];
  const box = {
    x: 66,
    y: 638,
    width: 1468,
    height: 232,
  };
  const plate = {
    x: 86,
    y: 576,
    width: 430,
    height: 92,
  };
  const textArea = {
    x: box.x + 108,
    y: box.y + 82,
    width: box.width - 230,
    lineHeight: 35,
    maxLines: 3,
  };

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  drawNineSliceLikeImage(ctx, dialogBox, box.x, box.y, box.width, box.height);
  drawNineSliceLikeImage(ctx, nameplate, plate.x, plate.y, plate.width, plate.height);

  ctx.font = '28px "Courier New", monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  drawOutlinedText(ctx, dialogState.speakerName, plate.x + 74, plate.y + plate.height / 2 + 5, {
    fill: "#ffeec2",
    strokeWidth: 5,
    maxWidth: plate.width - 124,
  });

  ctx.font = '25px "Courier New", monospace';
  ctx.textBaseline = "top";
  const textLines = wrapText(ctx, dialogState.currentText, textArea.width).slice(
    0,
    textArea.maxLines,
  );

  textLines.forEach((line, index) => {
    drawOutlinedText(ctx, line, textArea.x, textArea.y + index * textArea.lineHeight, {
      fill: "#fff4d6",
      strokeWidth: 5,
      maxWidth: textArea.width,
    });
  });

  const arrowSize = 34;
  const arrowX = box.x + box.width - 118;
  const arrowY = box.y + box.height - 72;

  if (arrow) {
    ctx.drawImage(arrow, arrowX, arrowY, arrowSize, arrowSize);
  } else {
    drawOutlinedText(ctx, "v", arrowX, arrowY, { fill: "#fff4d6" });
  }

  ctx.restore();
}

function drawPlayer(ctx, image, renderable, animationTime) {
  const source = getPlayerSourceRect(image, renderable.playerState, animationTime);
  const rect = renderable.rect;
  const scaleX = rect.width / source.frameWidth;
  const scaleY = rect.height / source.frameHeight;
  const destinationWidth = source.sw * scaleX;
  const destinationHeight = source.sh * scaleY;
  const destinationX = rect.x + (rect.width - destinationWidth) / 2;
  const destinationY = rect.y + rect.height - destinationHeight;

  ctx.drawImage(
    image,
    source.sx,
    source.sy,
    source.sw,
    source.sh,
    destinationX,
    destinationY,
    destinationWidth,
    destinationHeight,
  );
}

function drawImageRenderable(ctx, renderable, imageCache, missingAssets, animationTime) {
  const image = imageCache[renderable.asset];
  const rect = renderable.rect;

  if (!image) {
    if (!missingAssets.includes(renderable.asset)) {
      missingAssets.push(renderable.asset);
      console.warn(`Alfarizi Plaza: missing image cache for ${renderable.asset}.`);
    }

    drawMissingAssetMarker(ctx, rect);
    return;
  }

  if (renderable.kind === "player") {
    drawPlayer(ctx, image, renderable, animationTime);
    return;
  }

  ctx.imageSmoothingEnabled = false;

  if (renderable.kind === "decoration") {
    const source = getTrimmedDecorationSource(
      image,
      renderable.source ?? {
        x: 0,
        y: 0,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      },
    );

    ctx.drawImage(
      image,
      Math.round(source.x),
      Math.round(source.y),
      Math.round(source.width),
      Math.round(source.height),
      Math.round(rect.x),
      Math.round(rect.y),
      Math.round(rect.width),
      Math.round(rect.height),
    );
    return;
  }

  if (renderable.preserveAspect) {
    const source = getTrimmedDecorationSource(image, {
      x: 0,
      y: 0,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    });
    const sourceRatio = source.width / source.height;
    const rectRatio = rect.width / rect.height;
    let destinationWidth = rect.width;
    let destinationHeight = rect.height;

    if (sourceRatio < rectRatio) {
      destinationWidth = destinationHeight * sourceRatio;
    } else {
      destinationHeight = destinationWidth / sourceRatio;
    }

    destinationWidth = Math.min(
      rect.width,
      destinationWidth * (renderable.aspectWidthScale ?? 1),
    );

    const destinationX = rect.x + (rect.width - destinationWidth) / 2;
    const destinationY = rect.y + rect.height - destinationHeight;

    ctx.drawImage(
      image,
      Math.round(source.x),
      Math.round(source.y),
      Math.round(source.width),
      Math.round(source.height),
      Math.round(destinationX),
      Math.round(destinationY),
      Math.round(destinationWidth),
      Math.round(destinationHeight),
    );
    return;
  }

  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

function makeObjectRenderable(object, layerOrder) {
  const rect = getAnchoredRect(object.position, object.size, object.anchor);

  return {
    kind: "object",
    id: object.id,
    label: object.label,
    layer: object.layer,
    layerOrder: layerOrder[object.layer] ?? 0,
    asset: object.asset,
    rect,
    preserveAspect: object.preserve_aspect === true,
    aspectWidthScale: object.aspect_width_scale ?? 1,
  };
}

function makePlayerRenderable(player, layerOrder, playerState = null) {
  const position = playerState
    ? {
        x: playerState.x,
        y: playerState.y,
      }
    : player.spawn;
  const rect = getAnchoredRect(position, player.size, player.anchor);

  return {
    kind: "player",
    id: player.id,
    label: player.label,
    layer: "player",
    layerOrder: layerOrder.player ?? 0,
    asset: player.asset,
    rect,
    playerState,
  };
}

function sortRenderables(a, b) {
  const groundLayers = new Set(["ground_object"]);
  const aIsGround = groundLayers.has(a.layer);
  const bIsGround = groundLayers.has(b.layer);

  if (aIsGround !== bIsGround) {
    return aIsGround ? -1 : 1;
  }

  if (a.rect.drawY !== b.rect.drawY) {
    return a.rect.drawY - b.rect.drawY;
  }

  if (a.layerOrder !== b.layerOrder) {
    return a.layerOrder - b.layerOrder;
  }

  return a.id.localeCompare(b.id);
}

function getCameraTransform(ctx, mapData, playerState, animationTime) {
  const worldWidth = mapData.settings.world_width;
  const worldHeight = mapData.settings.world_height;
  const zoom = Math.max(1, Number(mapData.settings.camera_zoom) || 1);
  const followSpeed = Math.max(0, Number(mapData.settings.camera_follow_speed) || 8);
  const viewportWidth = ctx.canvas.width / zoom;
  const viewportHeight = ctx.canvas.height / zoom;
  const halfViewportWidth = viewportWidth / 2;
  const halfViewportHeight = viewportHeight / 2;
  const targetX = Math.max(
    halfViewportWidth,
    Math.min(worldWidth - halfViewportWidth, playerState?.x ?? worldWidth / 2),
  );
  const targetY = Math.max(
    halfViewportHeight,
    Math.min(worldHeight - halfViewportHeight, playerState?.y ?? worldHeight / 2),
  );
  let state = cameraStateCache.get(ctx.canvas);

  if (!state || state.zoom !== zoom) {
    state = {
      x: targetX,
      y: targetY,
      zoom,
      previousTime: animationTime,
    };
    cameraStateCache.set(ctx.canvas, state);
  } else {
    const deltaSeconds = Math.min(
      Math.max((animationTime - state.previousTime) / 1000, 0),
      0.05,
    );
    const blend = followSpeed === 0 ? 1 : 1 - Math.exp(-followSpeed * deltaSeconds);

    state.x += (targetX - state.x) * blend;
    state.y += (targetY - state.y) * blend;
    state.previousTime = animationTime;
  }

  const viewX = Math.max(0, Math.min(worldWidth - viewportWidth, state.x - halfViewportWidth));
  const viewY = Math.max(0, Math.min(worldHeight - viewportHeight, state.y - halfViewportHeight));
  const screenOffsetX = Math.round(viewX * zoom);
  const screenOffsetY = Math.round(viewY * zoom);

  return {
    zoom,
    x: viewX,
    y: viewY,
    screenOffsetX,
    screenOffsetY,
  };
}

export function renderMap(ctx, mapData, imageCache, options = {}) {
  const width = mapData.settings.world_width;
  const height = mapData.settings.world_height;
  const layerOrder = getLayerOrder(mapData);
  const missingAssets = [];

  if (ctx.canvas.width !== width) {
    ctx.canvas.width = width;
  }
  if (ctx.canvas.height !== height) {
    ctx.canvas.height = height;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = false;
  const animationTime = options.animationTime ?? performance.now();
  const camera = getCameraTransform(ctx, mapData, options.playerState, animationTime);

  ctx.save();
  ctx.setTransform(
    camera.zoom,
    0,
    0,
    camera.zoom,
    -camera.screenOffsetX,
    -camera.screenOffsetY,
  );
  ctx.imageSmoothingEnabled = false;

  const groundSummary = drawGroundLayer(ctx, options.groundLayer, imageCache);

  if (!groundSummary.rendered) {
    drawWorldBackground(ctx, mapData);
  }

  const visibleObjects = (mapData.objects ?? []).filter((object) => object.visible);
  const hiddenObjects = (mapData.objects ?? []).filter((object) => !object.visible);
  const renderables = visibleObjects.map((object) => makeObjectRenderable(object, layerOrder));
  const decorationRenderables = makeDecorationRenderables(options.decorationLayer, layerOrder);

  renderables.push(...decorationRenderables);
  renderables.push(makePlayerRenderable(mapData.player, layerOrder, options.playerState));
  renderables.sort(sortRenderables);
  renderables.forEach((renderable) =>
    drawImageRenderable(ctx, renderable, imageCache, missingAssets, animationTime),
  );
  if (!options.dialogState?.isOpen) {
    drawInteractionPrompt(ctx, options.activeInteraction, imageCache, options.playerState);
  }

  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawDialog(ctx, options.dialogState, imageCache);

  return {
    totalObjects: mapData.objects?.length ?? 0,
    visibleRendered: visibleObjects.length,
    hiddenSkipped: hiddenObjects.length,
    decorationsRendered: decorationRenderables.length,
    playerRendered: 1,
    missingAssets,
    ground: groundSummary,
    camera,
  };
}
