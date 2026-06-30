import { collectImagePaths, preloadImages } from "./assetLoader.js";
import { createCollisionManager } from "./collisionManager.js";
import { createDialogManager } from "./dialogManager.js";
import { createInteractionManager } from "./interactionManager.js";
import { loadProjectData } from "./dataLoader.js";
import { createModalManager } from "./modalManager.js";
import { renderMap } from "./mapRenderer.js";
import { createPlayerController } from "./playerController.js";

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;

const canvas = document.getElementById("gameCanvas");
const context = canvas?.getContext("2d");
const statusText = document.querySelector(".status-text");
const modalRoot = document.getElementById("modalRoot");
const DEBUG_MODE = new URLSearchParams(window.location.search).has("debug");

function debugInfo(message, payload) {
  if (DEBUG_MODE) {
    console.info(message, payload);
  }
}

function drawTilePattern(ctx) {
  const tileSize = 64;

  for (let y = 0; y < WORLD_HEIGHT; y += tileSize) {
    for (let x = 0; x < WORLD_WIDTH; x += tileSize) {
      const isAlt = (x / tileSize + y / tileSize) % 2 === 0;
      ctx.fillStyle = isAlt ? "#7dbb5a" : "#73ad55";
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }

  ctx.fillStyle = "#d7b36a";
  ctx.fillRect(0, 398, WORLD_WIDTH, 104);
  ctx.fillRect(748, 0, 104, WORLD_HEIGHT);

  ctx.fillStyle = "#b88a52";
  ctx.fillRect(0, 398, WORLD_WIDTH, 8);
  ctx.fillRect(0, 494, WORLD_WIDTH, 8);
  ctx.fillRect(748, 0, 8, WORLD_HEIGHT);
  ctx.fillRect(844, 0, 8, WORLD_HEIGHT);
}

function drawPixelText(ctx, text, x, y, size, color, align = "center") {
  ctx.fillStyle = color;
  ctx.font = `${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function renderShell(status = "Interactive Portfolio") {
  if (!context) {
    console.error("Alfarizi Plaza: canvas context is unavailable.");
    return;
  }

  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;
  context.imageSmoothingEnabled = false;

  drawTilePattern(context);

  context.fillStyle = "#fff0bf";
  context.fillRect(486, 318, 628, 154);
  context.strokeStyle = "#211c28";
  context.lineWidth = 8;
  context.strokeRect(486, 318, 628, 154);
  context.fillStyle = "#7b4f2a";
  context.fillRect(498, 460, 628, 12);

  drawPixelText(context, "Alfarizi Plaza", 800, 374, 56, "#211c28");
  drawPixelText(context, status, 800, 428, 24, "#3f3142");

  context.fillStyle = "#211c28";
  context.fillRect(774, 528, 52, 52);
  context.fillStyle = "#c9483d";
  context.fillRect(786, 540, 28, 28);
  context.fillStyle = "#fff0bf";
  context.fillRect(792, 546, 16, 10);
}

function setStatus(message, options = {}) {
  if (statusText) {
    statusText.textContent = message;
  }

  if (options.renderShell !== false) {
    renderShell(message);
  }
}

function getLoadingSummary(projectData, assetResult, renderSummary = null) {
  return {
    jsonLoaded: projectData.meta.loadedCount,
    mapObjects: projectData.maps.plaza.objects.length,
    interactions: projectData.interactions.interactions.length,
    colliders: projectData.collisions.colliders.length,
    imagesLoaded: assetResult.loaded.length,
    imagesFailed: assetResult.failed.length,
    renderedObjects: renderSummary?.visibleRendered ?? 0,
    decorationsRendered: renderSummary?.decorationsRendered ?? 0,
    hiddenObjectsSkipped: renderSummary?.hiddenSkipped ?? 0,
    missingRenderAssets: renderSummary?.missingAssets.length ?? 0,
    groundLayerLoaded: Boolean(projectData.maps.groundLayer),
    groundFallbackUsed: renderSummary?.ground?.fallbackUsed ?? true,
  };
}

async function init() {
  renderShell("Interactive Portfolio");
  debugInfo("Alfarizi Plaza shell loaded.");

  try {
    if (!context) {
      throw new Error("Canvas context is unavailable.");
    }
    if (!modalRoot) {
      throw new Error("Modal root is unavailable.");
    }

    setStatus("Loading JSON...");
    const projectData = await loadProjectData();

    setStatus("Preloading assets...");
    const imagePaths = collectImagePaths(projectData);
    const assetResult = await preloadImages(imagePaths);
    const collisionManager = createCollisionManager(projectData.collisions);
    const interactionManager = createInteractionManager(
      projectData.interactions,
      projectData.maps.plaza,
    );
    const dialogManager = createDialogManager(projectData.portfolioData.npcDialogs);
    const modalManager = createModalManager(modalRoot, projectData.portfolioData);
    const playerController = createPlayerController(projectData.maps.plaza, {
      collisionManager,
    });
    const initialPlayerState = playerController.getState();
    let activeInteraction = interactionManager.getActiveInteraction(initialPlayerState);
    const renderSummary = renderMap(context, projectData.maps.plaza, assetResult.cache, {
      groundLayer: projectData.maps.groundLayer,
      decorationLayer: projectData.maps.decorationLayer,
      playerState: initialPlayerState,
      animationTime: performance.now(),
      activeInteraction,
      dialogState: dialogManager.getCurrentDialogState(),
    });
    const summary = getLoadingSummary(projectData, assetResult, renderSummary);

    if (DEBUG_MODE) {
      window.alfariziPlazaDebug = {
        data: projectData,
        imageCache: assetResult.cache,
        imageFailures: assetResult.failed,
        renderSummary,
        collisionManager,
        interactionManager,
        dialogManager,
        modalManager,
        playerController,
        summary,
      };
    }

    console.info("Alfarizi Plaza ready.", {
      jsonLoaded: summary.jsonLoaded,
      imagesLoaded: summary.imagesLoaded,
      imagesFailed: summary.imagesFailed,
      interactions: summary.interactions,
      colliders: summary.colliders,
      groundLayerLoaded: summary.groundLayerLoaded,
      groundFallbackUsed: summary.groundFallbackUsed,
      decorationsRendered: summary.decorationsRendered,
      debug: DEBUG_MODE,
    });
    console.info("Alfarizi Plaza ground summary:", {
      loaded: Boolean(projectData.maps.groundLayer),
      assets: Object.keys(projectData.maps.groundLayer?.tile_sources?.tiles ?? {}).length,
      layers: projectData.maps.groundLayer?.layers?.length ?? 0,
      fallbackUsed: renderSummary.ground?.fallbackUsed ?? true,
      renderedTiles: renderSummary.ground?.renderedTiles ?? 0,
    });
    console.info("Alfarizi Plaza decoration summary:", {
      loaded: Boolean(projectData.maps.decorationLayer),
      assets: Object.keys(projectData.maps.decorationLayer?.assets ?? {}).length,
      decorations: projectData.maps.decorationLayer?.decorations?.length ?? 0,
      rendered: renderSummary.decorationsRendered ?? 0,
    });
    debugInfo("Alfarizi Plaza render summary:", renderSummary);
    debugInfo("Alfarizi Plaza movement summary:", {
      initialPosition: initialPlayerState,
      speed: playerController.speed,
      speedPerFrame: playerController.speedPerFrame,
      worldBounds: playerController.bounds,
      movementActive: true,
    });
    debugInfo("Alfarizi Plaza collision summary:", {
      colliders: collisionManager.colliders.length,
      bounds: collisionManager.bounds.length,
      playerHitbox: collisionManager.playerHitbox,
      collisionActive: true,
    });
    debugInfo("Alfarizi Plaza interaction summary:", {
      interactions: interactionManager.interactions.length,
      validTargets: interactionManager.targets.length,
      missingTargets: interactionManager.missingTargets.length,
      promptActive: true,
    });
    debugInfo("Alfarizi Plaza dialog summary:", {
      npcDialogGroups: dialogManager.npcDialogCount,
      dialogTargets: interactionManager.targets.filter(
        (target) => target.action?.type === "dialog",
      ).length,
      dialogActive: true,
    });
    debugInfo("Alfarizi Plaza modal summary:", {
      modalTargets: interactionManager.targets.filter(
        (target) => target.action?.type === "modal",
      ).length,
      modalActive: true,
    });
    setStatus("Interactive Portfolio", { renderShell: false });

    playerController.attach();

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const isAdvanceKey = key === "f" || key === "enter" || key === " ";

      if (key === "escape" && modalManager.isOpen()) {
        event.preventDefault();
        modalManager.closeModal();
        return;
      }

      if (key === "escape" && dialogManager.isOpen()) {
        event.preventDefault();
        dialogManager.closeDialog();
        return;
      }

      if (!isAdvanceKey) {
        return;
      }

      event.preventDefault();

      if (modalManager.isOpen()) {
        return;
      }

      if (dialogManager.isOpen()) {
        dialogManager.nextLine();
        return;
      }

      const currentInteraction = interactionManager.getActiveInteraction(
        playerController.getState(),
      );
      activeInteraction = currentInteraction;
      if (DEBUG_MODE) {
        window.alfariziPlazaDebug.activeInteraction = activeInteraction;
      }

      if (!currentInteraction) {
        return;
      }

      if (currentInteraction.action?.type === "dialog") {
        dialogManager.openInteractionDialog(currentInteraction);
        return;
      }

      if (currentInteraction.action?.type === "modal") {
        modalManager.openInteractionModal(currentInteraction);
        return;
      }

      interactionManager.handleInteractKey(currentInteraction);
    });

    let previousTime = performance.now();

    function frame(currentTime) {
      const deltaSeconds = Math.min((currentTime - previousTime) / 1000, 0.05);
      previousTime = currentTime;

      if (!dialogManager.isOpen() && !modalManager.isOpen()) {
        playerController.update(deltaSeconds);
      }
      document.body.classList.toggle("dialog-open", dialogManager.isOpen());
      activeInteraction = interactionManager.getActiveInteraction(playerController.getState());
      if (DEBUG_MODE) {
        window.alfariziPlazaDebug.activeInteraction = activeInteraction;
        window.alfariziPlazaDebug.dialogState = dialogManager.getCurrentDialogState();
        window.alfariziPlazaDebug.modalState = modalManager.getModalState();
      }
      renderMap(context, projectData.maps.plaza, assetResult.cache, {
        groundLayer: projectData.maps.groundLayer,
        decorationLayer: projectData.maps.decorationLayer,
        playerState: playerController.getState(),
        animationTime: currentTime,
        activeInteraction: modalManager.isOpen() ? null : activeInteraction,
        dialogState: dialogManager.getCurrentDialogState(),
      });

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  } catch (error) {
    setStatus("Loader error. Check console.");
    console.error("Alfarizi Plaza: setup failed.", error);
  }
}

init();
