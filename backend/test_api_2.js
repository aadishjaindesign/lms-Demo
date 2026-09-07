import express from 'express';
const app = express();
app.get("/api/courses/:courseId/videos/:videoId/hls/:rendition", (req, res) => res.json({ rendition: req.params.rendition }));
app.get("/api/courses/:courseId/videos/:videoId/hls/master.m3u8", (req, res) => res.send("master"));

const req = { method: "GET", url: "/api/courses/123/videos/456/hls/360p.m3u8" };
let match = false;
app._router.stack.forEach(r => {
  if (r.route && r.route.path) {
    const matchData = r.regexp.exec(req.url);
    if (matchData) {
      match = true;
      console.log("Matched route:", r.route.path, matchData);
    }
  }
});
