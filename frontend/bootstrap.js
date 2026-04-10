import { startBackgroundAnimation } from "./background_renderer.js";
import { ConverterUI } from "./converter_panel.js";

window.addEventListener("DOMContentLoaded", () => {
  const backgroundCanvas = document.getElementById("backgroundCanvas");
  if (backgroundCanvas) {
    startBackgroundAnimation(backgroundCanvas);
  }

  const converterRoot = document.getElementById("converterPanel");
  if (converterRoot) {
    new ConverterUI(converterRoot);
  }
});