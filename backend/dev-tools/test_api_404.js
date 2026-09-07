import express from "express";

const app = express();
app.get("/courses/:courseId/videos/:videoId/hls/:rendition/playlist.m3u8", (req, res) => res.send("Matched variant"));
app.get("/courses/:courseId/videos/:videoId/hls/master.m3u8", (req, res) => res.send("Matched master"));

const req = { method: "GET", url: "/courses/123/videos/456/hls/360p.m3u8" };
let match = false;
app._router.stack.forEach(r => {
  if (r.route && r.route.path) {
    if (r.regexp.test(req.url)) {
      match = true;
      console.log("Matched route:", r.route.path);
    }
  }
});
if (!match) console.log("NO ROUTE MATCHED for /hls/360p.m3u8");
