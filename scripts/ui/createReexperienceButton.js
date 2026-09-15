/** A transparent White-Room overlay that offers a repeat only after silence. */
export function createReexperienceButton(onRestart) {
  const overlay = document.createElement("div");
  overlay.className = "reexperience-overlay";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");

  const button = document.createElement("button");
  button.className = "start-experience-button reexperience-button";
  button.type = "button";
  button.textContent = "REEXPERIENCE";
  overlay.append(button);
  document.body.append(overlay);

  let revealTimer = null;
  let xrPresentation = null;
  let shouldBeVisible = false;

  const hideDom = () => {
    overlay.classList.remove("reexperience-overlay--visible");
    overlay.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
  };

  const showDom = () => {
    overlay.hidden = false;
    window.setTimeout(() => {
      if (!overlay.hidden) {
        overlay.classList.add("reexperience-overlay--visible");
      }
    }, 0);
    overlay.setAttribute("aria-hidden", "false");
    button.focus({ preventScroll: true });
  };

  const syncPresentation = () => {
    if (!shouldBeVisible) {
      hideDom();
      xrPresentation?.hide();
      return;
    }

    if (xrPresentation?.isImmersive()) {
      hideDom();
      xrPresentation.show();
    } else {
      xrPresentation?.hide();
      showDom();
    }
  };

  const hide = () => {
    if (revealTimer !== null) {
      window.clearTimeout(revealTimer);
      revealTimer = null;
    }
    shouldBeVisible = false;
    syncPresentation();
  };

  const showAfterSilence = () => {
    hide();
    revealTimer = window.setTimeout(() => {
      revealTimer = null;
      shouldBeVisible = true;
      syncPresentation();
    }, 5000);
  };

  button.addEventListener("click", () => {
    hide();
    onRestart();
  });

  return {
    hide,
    showAfterSilence,
    attachWebXR(scene, xr) {
      xrPresentation?.dispose();
      xrPresentation = xr ? createXrPresentation(scene, xr, () => {
        hide();
        onRestart();
      }, syncPresentation) : null;
      syncPresentation();
    },
    dispose: () => {
      hide();
      xrPresentation?.dispose();
      xrPresentation = null;
      overlay.remove();
    },
  };
}

function createXrPresentation(scene, xr, onRestart, onXrStateChanged) {
  const texture = new BABYLON.DynamicTexture(
    "reexperience-xr-texture",
    { width: 1024, height: 256 },
    scene,
    false,
  );
  texture.hasAlpha = true;
  const context = texture.getContext();
  context.clearRect(0, 0, 1024, 256);
  context.fillStyle = "rgba(10, 12, 16, 0.82)";
  context.fillRect(8, 8, 1008, 240);
  context.strokeStyle = "rgba(255, 255, 255, 0.95)";
  context.lineWidth = 8;
  context.strokeRect(8, 8, 1008, 240);
  context.fillStyle = "white";
  context.font = "600 92px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("REEXPERIENCE", 512, 132);
  texture.update();

  const material = new BABYLON.StandardMaterial("reexperience-xr-material", scene);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.opacityTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.disableLighting = true;
  material.backFaceCulling = false;

  const mesh = BABYLON.MeshBuilder.CreatePlane(
    "reexperience-xr-button",
    { width: 1.7, height: 0.425 },
    scene,
  );
  mesh.parent = xr.camera;
  mesh.position.set(0, -0.2, scene.useRightHandedSystem ? -1.8 : 1.8);
  mesh.rotation.y = scene.useRightHandedSystem ? Math.PI : 0;
  mesh.material = material;
  mesh.isPickable = true;
  mesh.renderingGroupId = 3;
  mesh.setEnabled(false);
  mesh.actionManager = new BABYLON.ActionManager(scene);
  mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnPickTrigger,
    () => {
      if (mesh.isEnabled()) {
        onRestart();
      }
    },
  ));

  let xrInput = null;
  let ownsPointerSelection = false;
  const pointerFeatureName = BABYLON.WebXRFeatureName.POINTER_SELECTION;
  if (!xr.featuresManager.getEnabledFeature(pointerFeatureName)) {
    xrInput = new BABYLON.WebXRInput(xr.sessionManager, xr.camera, {
      doNotLoadControllerMeshes: true,
    });
    xr.featuresManager.enableFeature(
      pointerFeatureName,
      "latest",
      {
        xrInput,
        disablePointerUpOnTouchOut: false,
        forceGazeMode: false,
        disableScenePointerVectorUpdate: true,
        enablePointerSelectionOnAllControllers: true,
        maxPointerDistance: 10,
      },
      true,
      false,
    );
    ownsPointerSelection = true;
  }

  const stateObserver = xr.onStateChangedObservable.add(onXrStateChanged);

  return {
    isImmersive: () => xr.state === BABYLON.WebXRState.IN_XR,
    show: () => mesh.setEnabled(true),
    hide: () => mesh.setEnabled(false),
    dispose: () => {
      xr.onStateChangedObservable.remove(stateObserver);
      mesh.dispose(false, true);
      if (ownsPointerSelection) {
        xr.featuresManager.disableFeature(pointerFeatureName);
        xrInput.dispose();
      }
    },
  };
}
