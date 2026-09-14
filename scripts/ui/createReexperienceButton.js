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

  const hide = () => {
    if (revealTimer !== null) {
      window.clearTimeout(revealTimer);
      revealTimer = null;
    }
    overlay.classList.remove("reexperience-overlay--visible");
    overlay.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
  };

  const showAfterSilence = () => {
    hide();
    revealTimer = window.setTimeout(() => {
      revealTimer = null;
      overlay.hidden = false;
      window.setTimeout(() => {
        overlay.classList.add("reexperience-overlay--visible");
      }, 0);
      overlay.setAttribute("aria-hidden", "false");
      button.focus({ preventScroll: true });
    }, 5000);
  };

  button.addEventListener("click", () => {
    hide();
    onRestart();
  });

  return { hide, showAfterSilence, dispose: () => { hide(); overlay.remove(); } };
}
