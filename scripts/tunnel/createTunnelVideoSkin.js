import { getIdyllSaturation } from "../environment/createIdyllDesaturation.js";

const VIDEO_OPACITY = 0.66;

/** Two prepared sources share one material mapping on the continuous tunnel shell. */
export function createTunnelVideoSkin(scene, material) {
  const source14 = createVideoSource(scene, 14);
  const source13 = createVideoSource(scene, 13);
  let active = false;
  let source13Started = false;
  let switchRequested = false;
  let useSource13 = false;
  let tunnelTime = 0;
  let generation = 0;

  class TunnelVideoSkinPlugin extends BABYLON.MaterialPluginBase {
    constructor() {
      super(material, "TunnelVideoSkin", 210, {}, true, true);
    }

    getClassName() { return "TunnelVideoSkinPlugin"; }

    getSamplers(samplers) {
      samplers.push("tunnelVideo14Sampler", "tunnelVideo13Sampler");
    }

    getActiveTextures(textures) {
      textures.push(source14.texture, source13.texture);
    }

    hasTexture(candidate) {
      return candidate === source14.texture || candidate === source13.texture;
    }

    getUniforms() {
      return {
        ubo: [{ name: "tunnelVideoSkinState", size: 3, type: "vec3" }],
        fragment: "uniform vec3 tunnelVideoSkinState;",
      };
    }

    bindForSubMesh(buffer) {
      updateSourceFrame(source14, active && !useSource13);
      updateSourceFrame(source13, active && source13Started);
      if (switchRequested && source13.hasFrame && !useSource13) {
        useSource13 = true;
        source14.video.pause();
      }
      const visibleSourceReady = useSource13 ? source13.hasFrame : source14.hasFrame;
      buffer.updateFloat3(
        "tunnelVideoSkinState",
        active && visibleSourceReady ? VIDEO_OPACITY : 0,
        getIdyllSaturation(tunnelTime),
        useSource13 ? 1 : 0,
      );
      buffer.setTexture("tunnelVideo14Sampler", source14.texture);
      buffer.setTexture("tunnelVideo13Sampler", source13.texture);
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
          uniform sampler2D tunnelVideo14Sampler;
          uniform sampler2D tunnelVideo13Sampler;`,
        CUSTOM_FRAGMENT_MAIN_END: `
          float tunnelVideoAlpha = tunnelVideoSkinState.x;
          if (tunnelVideoAlpha > 0.0001) {
            vec2 tunnelVideoUV = vec2(
              clamp(vTunnelVideoSkinCoord.x, 0.0, 1.0),
              fract(atan(vTunnelVideoSkinCoord.z, vTunnelVideoSkinCoord.y) / 6.2831853 + 1.0)
            );
            vec3 tunnelVideoSample;
            if (tunnelVideoSkinState.z > 0.5) {
              tunnelVideoSample = texture2D(tunnelVideo13Sampler, tunnelVideoUV).rgb;
            } else {
              tunnelVideoSample = texture2D(tunnelVideo14Sampler, tunnelVideoUV).rgb;
            }
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

  const playSource = (source, label) => {
    source.video.autoplay = true;
    const run = generation;
    source.video.play().catch((error) => {
      if (active && run === generation) {
        console.error(`TUNNEL VIDEO ${label} PLAY ERROR`, error);
      }
    });
  };

  const reset = () => {
    generation += 1;
    active = false;
    source13Started = false;
    switchRequested = false;
    useSource13 = false;
    tunnelTime = 0;
    resetSource(source14);
    resetSource(source13);
  };

  return {
    get opacity() { return VIDEO_OPACITY; },
    update(time) {
      tunnelTime = time;
      if (active) return;
      active = true;
      generation += 1;
      playSource(source14, 14);
    },
    prepareSource13() {
      if (!active || source13Started) return;
      source13Started = true;
      playSource(source13, 13);
    },
    switchToSource13() {
      if (!active || useSource13 || switchRequested) return;
      switchRequested = true;
      if (!source13Started) {
        source13Started = true;
        playSource(source13, 13);
      }
    },
    reset,
    dispose() {
      reset();
      disposeSource(source14);
      disposeSource(source13);
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
  return { video, texture, hasFrame: false };
}

function updateSourceFrame(source, shouldUpdate) {
  if (!shouldUpdate || source.video.readyState < 2 || !source.texture.isReady()) return;
  source.texture.updateTexture(true);
  source.hasFrame = true;
}

function resetSource(source) {
  source.hasFrame = false;
  source.video.autoplay = false;
  source.video.pause();
  if (source.video.currentTime !== 0) source.video.currentTime = 0;
}

function disposeSource(source) {
  source.texture.dispose();
  source.video.removeAttribute("src");
  source.video.load();
}
