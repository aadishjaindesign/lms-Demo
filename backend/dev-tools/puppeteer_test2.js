import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const students = mongoose.connection.collection('students');
  const student = await students.findOne({});
  // In the real auth, the payload needs to match what verifyStudent middleware expects
  // "verifyStudent" checks if (decoded.role === 'student'). It expects req.user = decoded.
  const token = jwt.sign({ userId: student._id.toString(), role: 'student', studentId: student.studentId }, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1d' });

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: "new" });
  const page = await browser.newPage();
  
  const networkLogs = [];
  const consoleLogs = [];

  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));
  page.on('requestfailed', request => {
      networkLogs.push(`[FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });
  page.on('response', response => {
      const url = response.url();
      if (url.includes('.m3u8') || url.includes('.ts') || url.includes('.m4s') || url.includes('.mp4')) {
          networkLogs.push(`[RESPONSE] ${url} | Status: ${response.status()} | Type: ${response.headers()['content-type']}`);
      }
  });

  await page.setCookie({ name: 'student_token', value: token, domain: 'localhost', path: '/' });
  await page.setCookie({ name: 'token', value: token, domain: 'localhost', path: '/' });

  console.log("Navigating to student course page: 6a993a2447b54817ae7f96ad");
  await page.goto('http://localhost:3000/student/courses/6a993a2447b54817ae7f96ad', { waitUntil: 'networkidle0' });

  await new Promise(r => setTimeout(r, 5000));
  
  const videoStatus = await page.evaluate(() => {
      const video = document.querySelector('video');
      const videojsContainer = document.querySelector('.video-js');
      const controlBar = document.querySelector('.vjs-control-bar');
      const bigPlay = document.querySelector('.vjs-big-play-button');
      
      let computed = null;
      if (videojsContainer) {
          const style = window.getComputedStyle(videojsContainer);
          computed = { display: style.display, visibility: style.visibility, width: style.width, height: style.height };
      }
      
      const reactError = document.body.innerText.includes("Source not supported or unreachable") || document.body.innerText.includes("Playback Error");

      return {
         hasVideoElement: !!video,
         hasVideoJsContainer: !!videojsContainer,
         hasControlBar: !!controlBar,
         hasBigPlay: !!bigPlay,
         containerStyles: computed,
         isShowingReactErrorComponent: reactError
      };
  });
  
  console.log("=== DOM STATUS ===");
  console.log(videoStatus);

  console.log("=== CONSOLE LOGS ===");
  console.log(consoleLogs.join('\n'));

  console.log("=== NETWORK LOGS ===");
  console.log(networkLogs.join('\n'));

  await browser.close();
  process.exit(0);
}
run();
