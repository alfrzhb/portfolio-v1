const FALLBACK_DIALOG = "Dialog belum tersedia.";

function normalizeLines(lines) {
  if (Array.isArray(lines) && lines.length > 0) {
    return lines.map((line) => String(line));
  }

  console.warn("Alfarizi Plaza: empty dialog payload. Using fallback text.");
  return [FALLBACK_DIALOG];
}

function getNpcDialog(npcDialogData, npcId) {
  return npcDialogData.npcs?.[npcId] ?? null;
}

export function createDialogManager(npcDialogData) {
  const state = {
    isOpen: false,
    speakerName: "",
    lines: [],
    currentLineIndex: 0,
  };

  function getCurrentDialogState() {
    const currentText = state.lines[state.currentLineIndex] ?? "";

    return {
      isOpen: state.isOpen,
      speakerName: state.speakerName,
      lines: [...state.lines],
      currentLineIndex: state.currentLineIndex,
      currentText,
      isLastLine: state.currentLineIndex >= state.lines.length - 1,
    };
  }

  function openDialog(dialogPayload) {
    state.isOpen = true;
    state.speakerName = dialogPayload.speakerName || "Dialog";
    state.lines = normalizeLines(dialogPayload.lines);
    state.currentLineIndex = 0;

    return getCurrentDialogState();
  }

  function openInteractionDialog(interaction) {
    const action = interaction?.action;

    if (!action || action.type !== "dialog") {
      return false;
    }

    if (action.npc_id) {
      const npcDialog = getNpcDialog(npcDialogData, action.npc_id);

      if (!npcDialog) {
        console.warn(`Alfarizi Plaza: NPC dialog not found for ${action.npc_id}.`);
        openDialog({
          speakerName: interaction.label ?? "NPC",
          lines: [FALLBACK_DIALOG],
        });
        return true;
      }

      openDialog({
        speakerName: npcDialog.name ?? interaction.label ?? action.npc_id,
        lines: npcDialog.dialogues,
      });
      return true;
    }

    if (Array.isArray(action.dialogues)) {
      openDialog({
        speakerName: action.speaker ?? interaction.label ?? "Read",
        lines: action.dialogues,
      });
      return true;
    }

    console.warn("Alfarizi Plaza: dialog action has no supported payload.", interaction);
    openDialog({
      speakerName: action.speaker ?? interaction.label ?? "Dialog",
      lines: [FALLBACK_DIALOG],
    });
    return true;
  }

  function closeDialog() {
    state.isOpen = false;
    state.speakerName = "";
    state.lines = [];
    state.currentLineIndex = 0;
  }

  function nextLine() {
    if (!state.isOpen) {
      return getCurrentDialogState();
    }

    if (state.currentLineIndex >= state.lines.length - 1) {
      closeDialog();
      return getCurrentDialogState();
    }

    state.currentLineIndex += 1;
    return getCurrentDialogState();
  }

  function isOpen() {
    return state.isOpen;
  }

  return {
    openDialog,
    openInteractionDialog,
    closeDialog,
    nextLine,
    isOpen,
    getCurrentDialogState,
    npcDialogCount: Object.keys(npcDialogData.npcs ?? {}).length,
  };
}
