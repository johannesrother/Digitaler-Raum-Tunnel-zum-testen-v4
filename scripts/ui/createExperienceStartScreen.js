/**
 * A fullscreen gate that keeps the rendered idyll motionless until the visitor
 * explicitly starts the experience. Its background is a real static snapshot
 * from the initial active camera, never a substitute asset.
 */
export function createExperienceStartScreen() {
  const screen = document.getElementById("experience-start-screen");
  const message = document.getElementById("experience-start-message");
  const button = document.getElementById("start-experience");
  let ready = false;
  let startRequested = false;
  let startHandler = null;

  const start = () => {
    if (!ready || !startHandler) {
      startRequested = true;
      return;
    }
    ready = false;
    startRequested = false;
    button.disabled = true;
    startHandler();
    screen.classList.add("experience-start-screen--leaving");
    screen.addEventListener("transitionend", () => screen.remove(), { once: true });
  };

  const setReady = (onStart) => {
    ready = true;
    startHandler = onStart;
    if (startRequested) {
      start();
      return;
    }
    message.classList.add("experience-start-message--hidden");
    button.hidden = false;
    button.disabled = false;
    button.focus({ preventScroll: true });
  };

  button.addEventListener("click", () => {
    start();
  });

  return {
    setReady,
    requestStart: start,
    showError() {
      message.textContent = "EXPERIENCE COULD NOT LOAD";
      message.classList.remove("experience-start-message--hidden");
    },
  };
}
