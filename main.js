import { createEngine } from "./scripts/core/engine.js";
import { createIdyllScene } from "./scripts/core/createIdyllScene.js";
import { initializeWebXR } from "./scripts/core/initializeWebXR.js";
import { createExperienceStartScreen } from "./scripts/ui/createExperienceStartScreen.js";
import { createReexperienceButton } from "./scripts/ui/createReexperienceButton.js";
import { configureResizeHandling, setStatus } from "./scripts/utils/dom.js";

async function startExperience() {
  const canvas = document.getElementById("renderCanvas");
  const statusElement = document.getElementById("runtime-status");
  const enterVrButton = document.getElementById("enter-vr");
  const startScreen = createExperienceStartScreen();
  let scene = null;
  const reexperienceState = {
    experienceStarted: false,
    hasEnteredWhiteRoom: false,
    whiteRoomSoundStartedThisRun: false,
    whiteRoomSoundEndedThisRun: false,
    reexperienceScheduled: false,
    reexperienceVisible: false,
  };
  const resetReexperienceState = () => {
    Object.assign(reexperienceState, {
      experienceStarted: false,
      hasEnteredWhiteRoom: false,
      whiteRoomSoundStartedThisRun: false,
      whiteRoomSoundEndedThisRun: false,
      reexperienceScheduled: false,
      reexperienceVisible: false,
    });
  };
  const startRun = ({ resetTransition = false } = {}) => {
    if (enterVrButton.dataset.xrUnavailable === "true") {
      enterVrButton.hidden = true;
    }
    reexperienceButton.hide();
    resetReexperienceState();
    if (resetTransition) {
      scene.metadata.transition.reset();
    }
    reexperienceState.experienceStarted = true;
    scene.metadata.idyllSound.start();
    scene.metadata.transition.start();
  };
  const reexperienceButton = createReexperienceButton(() => {
    startRun({ resetTransition: true });
  });

  const engine = createEngine(canvas);
  scene = await createIdyllScene(engine, canvas, {
    onWhiteRoomEntry: () => {
      reexperienceState.hasEnteredWhiteRoom = true;
    },
    onWhiteRoomSoundStarted: () => {
      if (reexperienceState.experienceStarted && reexperienceState.hasEnteredWhiteRoom) {
        reexperienceState.whiteRoomSoundStartedThisRun = true;
      }
    },
    onWhiteRoomSoundEnded: () => {
      const canSchedule = reexperienceState.experienceStarted
        && reexperienceState.hasEnteredWhiteRoom
        && reexperienceState.whiteRoomSoundStartedThisRun
        && !reexperienceState.whiteRoomSoundEndedThisRun
        && !reexperienceState.reexperienceScheduled;
      if (!canSchedule) return;
      reexperienceState.whiteRoomSoundEndedThisRun = true;
      reexperienceState.reexperienceScheduled = true;
      reexperienceState.reexperienceVisible = true;
      reexperienceButton.showAfterSilence();
    },
  });
  const removeResizeHandling = configureResizeHandling(engine);

  // Rendering prepares the paused initial view, but the experience timeline
  // itself remains gated until the explicit start.
  engine.runRenderLoop(() => scene.render());
  setStatus(statusElement, "WebXR wird vorbereitet …");
  const xr = await initializeWebXR({
    scene,
    enterVrButton,
    statusElement,
    onEntered: () => startScreen.requestStart(),
  });
  scene.metadata.transition.attachWebXR(xr);
  reexperienceButton.attachWebXR(scene, xr);
  await scene.whenReadyAsync();
  startScreen.setReady(() => {
    // This direct click is also the browser gesture for the existing HTML
    // audio elements. The timeline is reset and begins here at exactly t = 0.
    startRun();
  });

  window.addEventListener(
    "beforeunload",
    () => {
      removeResizeHandling();
      scene.metadata.transition.dispose();
      scene.metadata.tunnel.dispose();
      scene.metadata.idyllSound.dispose();
      scene.metadata.riftSound.dispose();
      scene.metadata.suctionSound.dispose();
      scene.metadata.tunnelSound.dispose();
      scene.metadata.whiteRoomTone.dispose();
      scene.metadata.whiteRoom.dispose();
      scene.metadata.dreamyIdyll.dispose();
      reexperienceButton.dispose();
      scene.dispose();
      engine.dispose();
    },
    { once: true },
  );
}

startExperience().catch((error) => {
  console.error("Die Idylle konnte nicht gestartet werden.", error);
  const startMessage = document.getElementById("experience-start-message");
  if (startMessage) {
    startMessage.textContent = "EXPERIENCE COULD NOT LOAD";
  }
  setStatus(
    document.getElementById("runtime-status"),
    "Die Idylle konnte nicht gestartet werden. Details stehen in der Browser-Konsole.",
  );
});
