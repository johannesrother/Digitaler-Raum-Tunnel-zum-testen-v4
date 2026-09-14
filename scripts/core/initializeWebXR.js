import { setStatus } from "../utils/dom.js";

const IMMERSIVE_VR = "immersive-vr";
const LOCAL_FLOOR = "local-floor";
const LOCAL = "local";

/**
 * Adds an optional WebXR entry path without affecting desktop rendering.
 */
export async function initializeWebXR({ scene, enterVrButton, statusElement, onEntered }) {
  if (!navigator.xr) {
    showVrUnavailable(enterVrButton);
    setStatus(statusElement, "WebXR ist in diesem Browser nicht verfügbar. Desktop-Test aktiv.");
    return null;
  }

  try {
    const immersiveVrSupported = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync(
      IMMERSIVE_VR,
    );

    if (!immersiveVrSupported) {
      showVrUnavailable(enterVrButton);
      setStatus(statusElement, "Immersives VR wird hier nicht unterstützt. Desktop-Test aktiv.");
      return null;
    }

    // The base helper supplies the XR camera and session lifecycle only.
    // Locomotion, interactions and artistic XR behaviour are intentionally deferred.
    const xr = await BABYLON.WebXRExperienceHelper.CreateAsync(scene);

    // local-floor lets a headset use its tracked standing height above y = 0.
    xr.onInitialXRPoseSetObservable.add((xrCamera) => {
      xrCamera.position.y = 0;
    });

    enableVrEntry({ xr, enterVrButton, statusElement, onEntered });
    setStatus(statusElement, "WebXR bereit. VR kann betreten werden.");
    return xr;
  } catch (error) {
    showVrUnavailable(enterVrButton);
    console.warn("WebXR konnte nicht initialisiert werden; der Desktop-Test bleibt verfügbar.", error);
    setStatus(statusElement, "WebXR konnte nicht vorbereitet werden. Desktop-Test aktiv.");
    return null;
  }
}

function enableVrEntry({ xr, enterVrButton, statusElement, onEntered }) {
  delete enterVrButton.dataset.xrUnavailable;
  enterVrButton.hidden = false;
  enterVrButton.disabled = false;
  enterVrButton.textContent = "VR betreten";

  xr.onStateChangedObservable.add((state) => {
    const inVr = state === BABYLON.WebXRState.IN_XR;
    enterVrButton.hidden = inVr;

    if (inVr) {
      setStatus(statusElement, "VR ist aktiv.");
    } else if (!enterVrButton.disabled) {
      enterVrButton.textContent = "VR betreten";
      setStatus(statusElement, "WebXR bereit. VR kann betreten werden.");
    }
  });

  enterVrButton.addEventListener("click", async () => {
    enterVrButton.disabled = true;
    enterVrButton.textContent = "VR wird gestartet…";
    setStatus(statusElement, "VR-Session wird gestartet …");

    try {
      await enterImmersiveVr(xr);
      onEntered?.();
    } catch (error) {
      enterVrButton.textContent = "VR erneut versuchen";
      console.error("Die immersive VR-Session konnte nicht gestartet werden.", error);
      setStatus(statusElement, "VR-Session konnte nicht gestartet werden. Desktop-Test aktiv.");
    } finally {
      enterVrButton.disabled = false;
    }
  });
}

function showVrUnavailable(enterVrButton) {
  enterVrButton.dataset.xrUnavailable = "true";
  enterVrButton.hidden = false;
  enterVrButton.disabled = true;
  enterVrButton.textContent = "VR nicht verfügbar";
}

async function enterImmersiveVr(xr) {
  try {
    await xr.enterXRAsync(IMMERSIVE_VR, LOCAL_FLOOR);
  } catch (localFloorError) {
    // A few WebXR implementations lack local-floor; keep a safe VR fallback.
    console.info("local-floor ist nicht verfügbar; WebXR startet mit lokalem Referenzraum.", localFloorError);
    await xr.enterXRAsync(IMMERSIVE_VR, LOCAL);
  }
}
