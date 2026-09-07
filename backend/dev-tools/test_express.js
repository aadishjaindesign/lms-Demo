import express from 'express';
const app = express();
app.get("/api/courses/:courseId/videos/:videoId/hls/master.m3u8", (req, res) => res.send("master"));
app.get("/api/courses/:courseId/videos/:videoId/hls/:rendition", (req, res) => res.json({ rendition: req.params.rendition }));

app.listen(9000, async () => {
   console.log("Server listening on 9000");
   try {
     const res = await fetch("http://localhost:9000/api/courses/123/videos/456/hls/360p.m3u8");
     console.log("Status:", res.status);
     console.log("Body:", await res.text());
   } catch(e) {
     console.error(e);
   }
   process.exit(0);
});
