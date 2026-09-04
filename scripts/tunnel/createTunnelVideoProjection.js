import { getIdyllSaturation } from "../environment/createIdyllDesaturation.js";

/** One video layer on the existing shell: shared UVs, morphs, depth and stencil. */
export function createTunnelVideoProjection(scene, material) {
  const video = document.createElement("video");
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = new URL("../../assets/videos/1.mp4", import.meta.url).href;
  const texture = new BABYLON.VideoTexture(
    "tunnel-wall-video-1", video, scene, false, true,
    BABYLON.Texture.BILINEAR_SAMPLINGMODE,
    { autoPlay: false, loop: true, muted: true, autoUpdateTexture: true },
  );
  texture.wrapU = texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  let active = false;
  let hasFrame = false;
  let time = 0;
  let generation = 0;

  class TunnelVideoPlugin extends BABYLON.MaterialPluginBase {
    constructor() { super(material, "TunnelVideoProjection", 210, {}, true, true); }
    getClassName() { return "TunnelVideoPlugin"; }
    getSamplers(samplers) { samplers.push("tunnelVideoSampler"); }
    getActiveTextures(textures) { textures.push(texture); }
    hasTexture(candidate) { return candidate === texture; }
    getUniforms() {
      return {
        ubo: [{ name: "tunnelVideoState", size: 3, type: "vec3" }],
        fragment: "uniform vec3 tunnelVideoState;",
      };
    }
    bindForSubMesh(buffer) {
      if (active && video.readyState >= 2 && texture.isReady()) {
        texture.update();
        hasFrame = true;
      }
      // Keep the last uploaded frame during a brief native loop seek instead
      // of blinking the mask off whenever readyState temporarily drops.
      buffer.updateFloat3("tunnelVideoState", time, active && hasFrame ? 0.55 : 0, getIdyllSaturation(time));
      buffer.setTexture("tunnelVideoSampler", texture);
    }
    getCustomCode(stage) {
      if (stage === "vertex") return {
        CUSTOM_VERTEX_DEFINITIONS: "varying vec3 vTunnelVideoCoord;",
        // Interpolate the circular coordinate as a direction: the shell's
        // existing UV seam must not repeat the patch across its closing strip.
        CUSTOM_VERTEX_MAIN_END: `vTunnelVideoCoord = vec3(uv.x / 9.2,
          cos(uv.y / 2.8 * 6.2831853), sin(uv.y / 2.8 * 6.2831853));`,
      };
      if (stage !== "fragment") return null;
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: "varying vec3 vTunnelVideoCoord; uniform sampler2D tunnelVideoSampler;",
        CUSTOM_FRAGMENT_MAIN_END: `
          // Fixed upper side-wall patch in the first part of the route.
          // UVs belong to the original vertices, so the film follows every morph.
          vec2 filmSurfaceUV = vec2(vTunnelVideoCoord.x,
            fract(atan(vTunnelVideoCoord.z, vTunnelVideoCoord.y) / 6.2831853 + 1.0));
          vec2 filmPoint = (filmSurfaceUV - vec2(0.25, 0.14)) / vec2(0.11, 0.12);
          float filmAngle = atan(filmPoint.y, filmPoint.x);
          float filmBoundary = 0.83 + 0.085 * sin(3.0 * filmAngle + 0.4)
            + 0.055 * cos(5.0 * filmAngle - 0.7)
            + 0.018 * sin(tunnelVideoState.x * 0.35 + filmAngle * 2.0);
          float filmMask = 1.0 - smoothstep(filmBoundary - 0.32, filmBoundary, length(filmPoint));
          float filmAlpha = filmMask * tunnelVideoState.y;
          if (filmAlpha > 0.0001) {
            vec3 filmLinear = toLinearSpace(texture2D(tunnelVideoSampler,
              vec2(filmPoint.x * 0.5 + 0.5, 0.5 - filmPoint.y * 0.5)).rgb);
            float filmLuma = dot(filmLinear, vec3(0.2126, 0.7152, 0.0722));
            filmLinear = mix(vec3(filmLuma), filmLinear, tunnelVideoState.z);
            #ifdef IMAGEPROCESSINGPOSTPROCESS
              vec3 filmColor = filmLinear;
            #else
              vec3 filmColor = toGammaSpace(filmLinear);
            #endif
            // Source-over composition preserves the original membrane outside
            // the patch and retains background transmission inside it.
            float filmCombinedAlpha = filmAlpha + gl_FragColor.a * (1.0 - filmAlpha);
            gl_FragColor.rgb = (filmColor * filmAlpha
              + gl_FragColor.rgb * gl_FragColor.a * (1.0 - filmAlpha)) / max(filmCombinedAlpha, 0.0001);
            gl_FragColor.a = filmCombinedAlpha;
          }
        `,
      };
    }
  }
  new TunnelVideoPlugin();

  const reset = () => {
    generation += 1;
    active = false;
    hasFrame = false;
    time = 0;
    video.pause();
    video.currentTime = 0;
  };
  return {
    setActive(value) {
      if (value === active) return;
      active = value;
      if (!active) { reset(); return; }
      const run = ++generation;
      video.play().catch((error) => {
        if (active && run === generation) console.error("TUNNEL VIDEO PLAY ERROR", error);
      });
    },
    update(tunnelTime) { time = tunnelTime; },
    reset,
    dispose() {
      reset();
      texture.dispose();
      video.removeAttribute("src");
      video.load();
    },
  };
}
