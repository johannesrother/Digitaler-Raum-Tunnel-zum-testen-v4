import { getIdyllSaturation } from "../environment/createIdyllDesaturation.js";

const VIDEO_OPACITY = 0.66;

/** One muted video texture blended across the existing continuous tunnel shell. */
export function createTunnelVideoSkin(scene, material) {
  const video = document.createElement("video");
  // Playback starts automatically with tunnel entry, never during the Rift preview.
  video.autoplay = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = new URL("../../assets/videos/14.mp4", import.meta.url).href;

  const texture = new BABYLON.VideoTexture(
    "tunnel-interior-video-14",
    video,
    scene,
    false,
    true,
    BABYLON.Texture.BILINEAR_SAMPLINGMODE,
    { autoPlay: false, loop: true, muted: true, autoUpdateTexture: true },
  );
  texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

  let active = false;
  let hasFrame = false;
  let tunnelTime = 0;
  let generation = 0;

  class TunnelVideoSkinPlugin extends BABYLON.MaterialPluginBase {
    constructor() {
      super(material, "TunnelVideoSkin", 210, {}, true, true);
    }

    getClassName() { return "TunnelVideoSkinPlugin"; }

    getSamplers(samplers) { samplers.push("tunnelVideoSkinSampler"); }

    getActiveTextures(textures) { textures.push(texture); }

    hasTexture(candidate) { return candidate === texture; }

    getUniforms() {
      return {
        ubo: [{ name: "tunnelVideoSkinState", size: 2, type: "vec2" }],
        fragment: "uniform vec2 tunnelVideoSkinState;",
      };
    }

    bindForSubMesh(buffer) {
      if (active && video.readyState >= 2 && texture.isReady()) {
        texture.update();
        hasFrame = true;
      }
      buffer.updateFloat2(
        "tunnelVideoSkinState",
        active && hasFrame ? VIDEO_OPACITY : 0,
        getIdyllSaturation(tunnelTime),
      );
      buffer.setTexture("tunnelVideoSkinSampler", texture);
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
          uniform sampler2D tunnelVideoSkinSampler;`,
        CUSTOM_FRAGMENT_MAIN_END: `
          float tunnelVideoAlpha = tunnelVideoSkinState.x;
          if (tunnelVideoAlpha > 0.0001) {
            vec2 tunnelVideoUV = vec2(
              clamp(vTunnelVideoSkinCoord.x, 0.0, 1.0),
              fract(atan(vTunnelVideoSkinCoord.z, vTunnelVideoSkinCoord.y) / 6.2831853 + 1.0)
            );
            vec3 tunnelVideoLinear = toLinearSpace(
              texture2D(tunnelVideoSkinSampler, tunnelVideoUV).rgb
            );
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

  const reset = () => {
    generation += 1;
    active = false;
    hasFrame = false;
    tunnelTime = 0;
    video.autoplay = false;
    video.pause();
    if (video.currentTime !== 0) video.currentTime = 0;
  };

  return {
    get opacity() { return VIDEO_OPACITY; },
    update(time) {
      tunnelTime = time;
      if (active) return;
      active = true;
      video.autoplay = true;
      const run = ++generation;
      video.play().catch((error) => {
        if (active && run === generation) {
          console.error("TUNNEL VIDEO 14 PLAY ERROR", error);
        }
      });
    },
    reset,
    dispose() {
      reset();
      texture.dispose();
      video.removeAttribute("src");
      video.load();
    },
  };
}
