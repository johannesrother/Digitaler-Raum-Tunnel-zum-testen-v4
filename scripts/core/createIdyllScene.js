import { createDesktopCamera } from "../camera/createDesktopCamera.js";
import { createIdyllEnvironment } from "../environment/createIdyllEnvironment.js";
import { createDreamyIdyll } from "../environment/createDreamyIdyll.js";
import { createIdyllDesaturation } from "../environment/createIdyllDesaturation.js";
import { createPreRiftLightDisturbance, PRE_RIFT_LIGHT_EVENTS } from "../environment/createPreRiftLightDisturbance.js";
import { createOrganicTunnel } from "../tunnel/createOrganicTunnel.js";
import { clearTunnelTerrain, removeIdyllObjectsFromTunnel } from "../tunnel/clearTunnelTerrain.js";
import { createIdyllTunnelTransition } from "../tunnel/createIdyllTunnelTransition.js";
import { createWhiteRoom } from "../whiteRoom/createWhiteRoom.js";
import { createSuctionWhiteFade } from "../whiteRoom/createSuctionWhiteFade.js";
import { createWhiteRoomTone } from "../audio/createWhiteRoomTone.js";
import { createTunnelSound } from "../audio/createTunnelSound.js";
import { createIdyllSound } from "../audio/createIdyllSound.js";
import { createRiftSound } from "../audio/createRiftSound.js";
import { createSuctionSound } from "../audio/createSuctionSound.js";

/** Creates the static, standing-height idyll scene. WebXR is added separately. */
export async function createIdyllScene(
  engine,
  canvas,
  { onWhiteRoomEntry, onWhiteRoomSoundStarted, onWhiteRoomSoundEnded } = {},
) {
  const scene = new BABYLON.Scene(engine);
  scene.skipPointerMovePicking = true;

  const environment = await createIdyllEnvironment(scene);
  const dreamyIdyll = await createDreamyIdyll(scene, environment.startPosition);
  disableOldIdyllVisuals(environment);
  disablePreviousIdyllLighting(environment);
  // Rift, tunnel route and White Room share this independent landscape anchor.
  // The house remains a static idyll object and provides no portal transform.
  environment.architecture.entrance = createMeadowRiftEntrance();
  const desktopCamera = createDesktopCamera(
    scene,
    canvas,
    dreamyIdyll.startPosition,
    dreamyIdyll.house.approachTarget,
  );
  const tunnel = createOrganicTunnel(scene, {
    entrance: environment.architecture.entrance,
    grassMaterial: environment.materials.terrain,
    getGroundHeight: environment.terrain.getGroundHeight,
  });
  // The V3 tunnel is a transparent membrane. Extend the existing idyll along
  // its real route before the transition snapshots the world mesh set.
  dreamyIdyll.extendAlongTunnelRoute(tunnel.route);
  const idyllDesaturation = createIdyllDesaturation(dreamyIdyll.world);
  const idyllTwilight = createIdyllTwilightState(scene, dreamyIdyll, idyllDesaturation);
  clearTunnelTerrain(
    [
      environment.terrain.terrain,
      environment.terrain.distantHorizon,
      ...environment.terrain.groundCoverZones,
    ],
    tunnel.route,
  );
  removeIdyllObjectsFromTunnel(environment.assets.placed, tunnel.route);
  environment.lighting.excludeFromTunnel(tunnel.mesh);
  dreamyIdyll.excludeFromTunnel(tunnel.mesh);
  const tunnelExit = tunnel.route.positionAt(0.986);
  const exitDirection = tunnel.route.tangentAt(0.986);
  exitDirection.y = 0;
  exitDirection.normalize();
  const whiteRoom = createWhiteRoom(scene, tunnelExit, exitDirection);
  const suctionWhiteFade = createSuctionWhiteFade(scene);
  const idyllSound = createIdyllSound();
  const riftSound = createRiftSound();
  const suctionSound = createSuctionSound();
  const tunnelSound = createTunnelSound();
  let preRiftLightDisturbance = null;
  const whiteRoomTone = createWhiteRoomTone({
    onActivate: onWhiteRoomSoundStarted,
    onFadeStart: () => {
      transition.reset({ preserveWhiteRoomEnding: true });
      // The image is still completely white here. Prepare the returning world
      // before lowering that white layer so no warm idyll frame can leak in.
      idyllTwilight.activate();
      suctionWhiteFade.returnToIdyll(0);
    },
    onFadeProgress: (progress) => suctionWhiteFade.returnToIdyll(progress),
    onEnded: onWhiteRoomSoundEnded,
  });
  const transition = createIdyllTunnelTransition(scene, {
    startPosition: dreamyIdyll.startPosition,
    entrance: environment.architecture.entrance,
    desktopCamera,
    tunnel,
    tunnelEntrance: environment.architecture.tunnel,
    entranceFade: environment.architecture.tunnel.fade,
    initialForward: desktopCamera.getForwardRay(1).direction.clone(),
    whiteRoom,
    whiteRoomTone,
    onIdyllUpdate: (elapsed, riftFormationStart, riftState) => {
      preRiftLightDisturbance?.update(elapsed, riftFormationStart, riftState);
      if (!riftState.entered && elapsed - riftFormationStart >= PRE_RIFT_LIGHT_EVENTS[0].offset) {
        idyllSound.startStress();
      }
    },
    onRiftOpening: () => riftSound.start(),
    onTunnelUpdate: (tunnelTime) => {
      idyllDesaturation.update(tunnelTime);
      suctionWhiteFade.update(tunnelTime);
    },
    onSuctionStart: (tunnelTime, tunnelEndTime) => {
      suctionSound.start();
      suctionWhiteFade.start(tunnelTime, tunnelEndTime);
      tunnelSound.fadeTo(0.28, 8);
    },
    onWhiteRoomEntry: () => {
      suctionWhiteFade.finish();
      idyllDesaturation.reset();
      onWhiteRoomEntry?.();
      tunnelSound.fadeOutAndStop(2);
      suctionSound.fadeOutAndStop(2);
    },
    onTunnelEntry: () => {
      idyllSound.fadeOutAndStop(2.5);
      riftSound.fadeOutAndStop(2.5);
      tunnelSound.start({ fadeInDuration: 2.5 });
    },
    onIdyllHidden: () => dreamyIdyll.hide(),
    onExperienceReset: ({ preserveWhiteRoomEnding = false } = {}) => {
      preRiftLightDisturbance?.reset();
      if (!preserveWhiteRoomEnding) {
        idyllTwilight.reset();
        suctionWhiteFade.reset();
        whiteRoomTone.deactivate();
      }
      idyllDesaturation.reset();
      idyllSound.stop();
      riftSound.stop();
      suctionSound.stop();
      tunnelSound.stop();
      dreamyIdyll.show();
    },
    idyllWorldMeshes: scene.meshes.filter((mesh) => (
      mesh !== tunnel.mesh && mesh.name !== "white-room-endless-void"
    )),
    previousWorldMeshes: scene.meshes.filter((mesh) => mesh.name !== "white-room-endless-void"),
    previousWorldLights: [...scene.lights],
  });
  // Create after the transition's mesh/light snapshots: the temporary glints
  // must never enter the Rift stencil, tunnel or White-Room world groups.
  preRiftLightDisturbance = createPreRiftLightDisturbance(scene, dreamyIdyll.world);
  scene.metadata = {
    environment,
    dreamyIdyll,
    idyllDesaturation,
    idyllTwilight,
    preRiftLightDisturbance,
    desktopCamera,
    tunnel,
    transition,
    whiteRoom,
    whiteRoomTone,
    idyllSound,
    suctionWhiteFade,
    riftSound,
    suctionSound,
    tunnelSound,
  };

  return scene;
}

/**
 * A lightweight end-state grade for the already loaded idyll. It only changes
 * existing light, fog, environment and sky-material values, so desktop and XR
 * share the exact same look without an additional postprocess or render pass.
 */
function createIdyllTwilightState(scene, dreamyIdyll, idyllDesaturation) {
  const fill = dreamyIdyll.lights.find((light) => light.name === "dreamy-idyll-soft-fill");
  const sun = dreamyIdyll.lights.find((light) => light.name === "dreamy-idyll-late-afternoon-sun");
  const skyMaterial = dreamyIdyll.sky.sky.material;
  const original = {
    environmentIntensity: scene.environmentIntensity,
    ambientColor: scene.ambientColor.clone(),
    fogColor: scene.fogColor.clone(),
    fogDensity: scene.fogDensity,
    saturation: idyllDesaturation.saturation,
    fillIntensity: fill?.intensity,
    fillDiffuse: fill?.diffuse?.clone(),
    fillGroundColor: fill?.groundColor?.clone(),
    sunIntensity: sun?.intensity,
    sunDiffuse: sun?.diffuse?.clone(),
    skyEmissive: skyMaterial?.emissiveColor?.clone(),
  };
  let active = false;

  return {
    get active() { return active; },
    activate() {
      active = true;
      scene.environmentIntensity = 0.23;
      scene.ambientColor.copyFrom(BABYLON.Color3.FromHexString("#101b2c"));
      scene.fogColor.copyFrom(BABYLON.Color3.FromHexString("#8498ad"));
      scene.fogDensity = 0.0125;
      idyllDesaturation.setSaturation(0.72);
      if (fill) {
        fill.intensity = 0.46;
        fill.diffuse.copyFrom(BABYLON.Color3.FromHexString("#9fb9d2"));
        fill.groundColor.copyFrom(BABYLON.Color3.FromHexString("#42566a"));
      }
      if (sun) {
        sun.intensity = 0.62;
        sun.diffuse.copyFrom(BABYLON.Color3.FromHexString("#9bb6db"));
      }
      if (skyMaterial?.emissiveColor) {
        skyMaterial.emissiveColor.copyFrom(BABYLON.Color3.FromHexString("#91a6bd"));
      }
    },
    reset() {
      active = false;
      scene.environmentIntensity = original.environmentIntensity;
      scene.ambientColor.copyFrom(original.ambientColor);
      scene.fogColor.copyFrom(original.fogColor);
      scene.fogDensity = original.fogDensity;
      idyllDesaturation.setSaturation(original.saturation);
      if (fill) {
        fill.intensity = original.fillIntensity;
        fill.diffuse.copyFrom(original.fillDiffuse);
        fill.groundColor.copyFrom(original.fillGroundColor);
      }
      if (sun) {
        sun.intensity = original.sunIntensity;
        sun.diffuse.copyFrom(original.sunDiffuse);
      }
      if (skyMaterial?.emissiveColor && original.skyEmissive) {
        skyMaterial.emissiveColor.copyFrom(original.skyEmissive);
      }
    },
  };
}

function createMeadowRiftEntrance() {
  const center = new BABYLON.Vector3(-20, 0, 17.5);
  const forward = new BABYLON.Vector3(0, 0, 1);
  return {
    center,
    forward,
    lateral: new BABYLON.Vector3(forward.z, 0, -forward.x),
  };
}

function disablePreviousIdyllLighting(environment) {
  environment.lighting.skyFill.setEnabled(false);
  environment.lighting.sun.setEnabled(false);
}

function disableOldIdyllVisuals(environment) {
  [
    environment.lighting.sky,
    environment.terrain.terrain,
    environment.terrain.distantHorizon,
    ...environment.terrain.groundCoverZones,
    ...environment.water.pools,
    environment.water.stream,
    ...environment.assets.placed.flatMap((entry) => entry.meshes),
  ].forEach((mesh) => mesh.setEnabled(false));
}
