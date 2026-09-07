import videojs from "video.js";
try {
  require("videojs-contrib-quality-levels");
  console.log("quality-levels loaded");
} catch(e) {
  console.log("Error loading quality-levels:", e);
}
