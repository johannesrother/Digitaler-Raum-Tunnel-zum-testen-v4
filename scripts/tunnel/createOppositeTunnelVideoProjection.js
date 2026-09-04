import { getIdyllSaturation } from "../environment/createIdyllDesaturation.js";

/** Additional film on the opposite shell wall; video 1 remains independent. */
export function createOppositeTunnelVideoProjection(scene, material) {
  const video = document.createElement("video");
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = new URL("../../assets/videos/4.mp4", import.meta.url).href;
  const texture = new BABYLON.VideoTexture(
    "tunnel-wall-video-4", video, scene, false, true,
    BABYLON.Texture.BILINEAR_SAMPLINGMODE,
    { autoPlay: false, loop: true, muted: true, autoUpdateTexture: true },
  );
  texture.wrapU = texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  let active = false;
  let hasFrame = false;
  let time = 0;
  let generation = 0;

  class OppositeTunnelVideoPlugin extends BABYLON.MaterialPluginBase {
    constructor() { super(material, "OppositeTunnelVideoProjection", 211, {}, true, true); }
    getClassName() { return "OppositeTunnelVideoPlugin"; }
    getSamplers(samplers) { samplers.push("tunnelVideo4Sampler"); }
    getActiveTextures(textures) { textures.push(texture); }
    hasTexture(candidate) { return candidate === texture; }
    getUniforms() {
      return {
        ubo: [{ name: "tunnelVideo4State", size: 3, type: "vec3" }],
        fragment: "uniform vec3 tunnelVideo4State;",
      };
    }
    bindForSubMesh(buffer) {
      if (active && video.readyState >= 2 && texture.isReady()) {
        texture.update();
        hasFrame = true;
      }
      // 20% less opacity than video 1 (0.55); retain decoded frames during loops.
      buffer.updateFloat3("tunnelVideo4State", time, active && hasFrame ? 0.44 : 0, getIdyllSaturation(time));
      buffer.setTexture("tunnelVideo4Sampler", texture);
    }
    getCustomCode(stage) {
      if (stage === "vertex") return {
        CUSTOM_VERTEX_DEFINITIONS: "varying vec3 vTunnelVideo4Coord;",
        CUSTOM_VERTEX_MAIN_END: `vTunnelVideo4Coord = vec3(uv.x / 9.2,
          cos(uv.y / 2.8 * 6.2831853), sin(uv.y / 2.8 * 6.2831853));`,
      };
      if (stage !== "fragment") return null;
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: "varying vec3 vTunnelVideo4Coord; uniform sampler2D tunnelVideo4Sampler;",
        CUSTOM_FRAGMENT_MAIN_END: `
          vec2 film4SurfaceUV = vec2(vTunnelVideo4Coord.x,
            fract(atan(vTunnelVideo4Coord.z, vTunnelVideo4Coord.y) / 6.2831853 + 1.0));
          // Opposite around the local cross-section (0.14 + 0.5), not world X.
          // Slightly farther along the route and smaller than the first film.
          vec2 film4Point = (film4SurfaceUV - vec2(0.27, 0.64)) / vec2(0.10, 0.11);
          float film4Angle = atan(film4Point.y, film4Point.x);
          float film4Boundary = 0.83 + 0.075 * sin(3.0 * film4Angle + 1.1)
            + 0.06 * cos(5.0 * film4Angle + 0.3)
            + 0.018 * sin(tunnelVideo4State.x * 0.35 + film4Angle * 2.0 + 0.8);
          float film4Mask = 1.0 - smoothstep(film4Boundary - 0.32, film4Boundary, length(film4Point));
          float film4Alpha = film4Mask * tunnelVideo4State.y;
          if (film4Alpha > 0.0001) {
            vec3 film4Linear = toLinearSpace(texture2D(tunnelVideo4Sampler,
              vec2(film4Point.x * 0.5 + 0.5, 0.5 - film4Point.y * 0.5)).rgb);
            float film4Luma = dot(film4Linear, vec3(0.2126, 0.7152, 0.0722));
            film4Linear = mix(vec3(film4Luma), film4Linear, tunnelVideo4State.z);
            #ifdef IMAGEPROCESSINGPOSTPROCESS
              vec3 film4Color = film4Linear;
            #else
              vec3 film4Color = toGammaSpace(film4Linear);
            #endif
            float film4CombinedAlpha = film4Alpha + gl_FragColor.a * (1.0 - film4Alpha);
            gl_FragColor.rgb = (film4Color * film4Alpha
              + gl_FragColor.rgb * gl_FragColor.a * (1.0 - film4Alpha)) / max(film4CombinedAlpha, 0.0001);
            gl_FragColor.a = film4CombinedAlpha;
          }
        `,
      };
    }
  }
  new OppositeTunnelVideoPlugin();

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
        if (active && run === generation) console.error("TUNNEL VIDEO 4 PLAY ERROR", error);
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
