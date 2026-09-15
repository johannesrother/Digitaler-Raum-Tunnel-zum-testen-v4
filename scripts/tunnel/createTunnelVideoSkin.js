import { getIdyllSaturation } from "../environment/createIdyllDesaturation.js";

const VIDEO_OPACITY = 0.66;
const START_VIDEO = 14;

/** Reuses one full-shell material mapping with at most current + prepared video. */
export function createTunnelVideoSkin(scene, material) {
  let currentSource = createVideoSource(scene, START_VIDEO);
  let preparedSource = null;
  let requestedSwitch = null;
  let active = false;
  let tunnelTime = 0;
  let generation = 0;

  class TunnelVideoSkinPlugin extends BABYLON.MaterialPluginBase {
    constructor() {
      super(material, "TunnelVideoSkin", 210, {}, true, true);
    }

    getClassName() { return "TunnelVideoSkinPlugin"; }

    getSamplers(samplers) {
      samplers.push("tunnelVideoSampler");
    }

    getActiveTextures(textures) {
      textures.push(currentSource.texture);
      if (preparedSource) textures.push(preparedSource.texture);
    }

    hasTexture(candidate) {
      return candidate === currentSource.texture || candidate === preparedSource?.texture;
    }

    getUniforms() {
      return {
        ubo: [{ name: "tunnelVideoSkinState", size: 2, type: "vec2" }],
        fragment: "uniform vec2 tunnelVideoSkinState;",
      };
    }

    bindForSubMesh(buffer) {
      updateSourceFrame(currentSource, active);
      if (preparedSource) updateSourceFrame(preparedSource, active);
      if (requestedSwitch === preparedSource?.number && preparedSource.hasFrame) {
        promotePreparedSource();
      }
      buffer.updateFloat2(
        "tunnelVideoSkinState",
        active && currentSource.hasFrame ? VIDEO_OPACITY : 0,
        getIdyllSaturation(tunnelTime),
      );
      buffer.setTexture("tunnelVideoSampler", currentSource.texture);
    }

    getCustomCode(stage) {
      if (stage === "vertex") {
        return {
          CUSTOM_VERTEX_DEFINITIONS: "varying vec3 vTunnelVideoSkinCoord;",
          // Convert the authored longitudinal/circular UVs into one continuous
          // 0..1 film surface. The circular direction avoids interpolation
          // across the shell's closing UV seam.
          CUSTOM_VERTEX_MAIN_END: `vTunnelVideoSkinCoord = vec3(uv.x / 9.2,
            cos(uv.y / 2.8 * 6.2831853), sin(uv.y / 2.8 * 6.2831853));`,
        };
      }
      if (stage !== "fragment") return null;
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `varying vec3 vTunnelVideoSkinCoord;
          uniform sampler2D tunnelVideoSampler;`,
        CUSTOM_FRAGMENT_MAIN_END: `
          float tunnelVideoAlpha = tunnelVideoSkinState.x;
          if (tunnelVideoAlpha > 0.0001) {
            vec2 tunnelVideoUV = vec2(
              clamp(vTunnelVideoSkinCoord.x, 0.0, 1.0),
              fract(atan(vTunnelVideoSkinCoord.z, vTunnelVideoSkinCoord.y) / 6.2831853 + 1.0)
            );
            vec3 tunnelVideoSample = texture2D(tunnelVideoSampler, tunnelVideoUV).rgb;
            vec3 tunnelVideoLinear = toLinearSpace(tunnelVideoSample);
            float tunnelVideoLuma = dot(
              tunnelVideoLinear,
              vec3(0.2126, 0.7152, 0.0722)
            );
            tunnelVideoLinear = mix(
              vec3(tunnelVideoLuma),
              tunnelVideoLinear,
              tunnelVideoSkinState.y
            );
            #ifdef IMAGEPROCESSINGPOSTPROCESS
              vec3 tunnelVideoColor = tunnelVideoLinear;
            #else
              vec3 tunnelVideoColor = toGammaSpace(tunnelVideoLinear);
            #endif
            float tunnelVideoCombinedAlpha = tunnelVideoAlpha
              + gl_FragColor.a * (1.0 - tunnelVideoAlpha);
            gl_FragColor.rgb = (
              tunnelVideoColor * tunnelVideoAlpha
              + gl_FragColor.rgb * gl_FragColor.a * (1.0 - tunnelVideoAlpha)
            ) / max(tunnelVideoCombinedAlpha, 0.0001);
            gl_FragColor.a = tunnelVideoCombinedAlpha;
          }
        `,
      };
    }
  }

  new TunnelVideoSkinPlugin();

  const playSource = (source) => {
    source.video.autoplay = true;
    source.playing = true;
    const run = generation;
    source.video.play().catch((error) => {
      source.playing = false;
      if (active && run === generation) {
        console.error(`TUNNEL VIDEO ${source.number} PLAY ERROR`, error);
      }
    });
  };

  const promotePreparedSource = () => {
    if (!preparedSource || requestedSwitch !== preparedSource.number) return;
    const previousSource = currentSource;
    currentSource = preparedSource;
    preparedSource = null;
    requestedSwitch = null;
    disposeSource(previousSource);
  };

  const prepare = (number) => {
    if (!active || currentSource.number === number || preparedSource?.number === number) return;
    if (preparedSource) disposeSource(preparedSource);
    preparedSource = createVideoSource(scene, number);
    playSource(preparedSource);
  };

  const reset = () => {
    generation += 1;
    active = false;
    requestedSwitch = null;
    tunnelTime = 0;
    if (preparedSource) {
      disposeSource(preparedSource);
      preparedSource = null;
    }
    if (currentSource.number === START_VIDEO) {
      resetSource(currentSource);
    } else {
      disposeSource(currentSource);
      currentSource = createVideoSource(scene, START_VIDEO);
    }
  };

  return {
    get opacity() { return VIDEO_OPACITY; },
    get currentVideo() { return currentSource.number; },
    get activeDecodeCount() {
      return Number(currentSource.playing) + Number(preparedSource?.playing ?? false);
    },
    update(time) {
      tunnelTime = time;
      if (active) return;
      active = true;
      generation += 1;
      playSource(currentSource);
    },
    prepare(number) {
      prepare(number);
    },
    switchTo(number) {
      if (!active || currentSource.number === number) return;
      if (preparedSource?.number !== number) prepare(number);
      requestedSwitch = number;
      if (preparedSource?.hasFrame) promotePreparedSource();
    },
    reset,
    dispose() {
      generation += 1;
      if (preparedSource) disposeSource(preparedSource);
      disposeSource(currentSource);
      preparedSource = null;
    },
  };
}

function createVideoSource(scene, number) {
  const video = document.createElement("video");
  video.autoplay = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = new URL(`../../assets/videos/${number}.mp4`, import.meta.url).href;
  const texture = new BABYLON.VideoTexture(
    `tunnel-interior-video-${number}`,
    video,
    scene,
    false,
    true,
    BABYLON.Texture.BILINEAR_SAMPLINGMODE,
    { autoPlay: false, loop: true, muted: true, autoUpdateTexture: false },
  );
  texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  return { number, video, texture, hasFrame: false, playing: false };
}

function updateSourceFrame(source, shouldUpdate) {
  if (!shouldUpdate || source.video.readyState < 2 || !source.texture.isReady()) return;
  source.texture.updateTexture(true);
  source.hasFrame = true;
}

function resetSource(source) {
  source.hasFrame = false;
  source.playing = false;
  source.video.autoplay = false;
  source.video.pause();
  if (source.video.currentTime !== 0) source.video.currentTime = 0;
}

function disposeSource(source) {
  source.playing = false;
  source.video.pause();
  source.texture.dispose();
  source.video.removeAttribute("src");
  source.video.load();
}
