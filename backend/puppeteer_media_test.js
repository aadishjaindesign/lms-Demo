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
  const token = jwt.sign({ userId: student._id.toString(), role: 'student', studentId: student.studentId }, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1d' });

  const browser = await puppeteer.launch({ 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--enable-features=NetworkService'], 
    headless: "new"
  });
  
  const page = await browser.newPage();
  
  const networkLogs = [];
  const mediaEvents = [];
  
  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  page.on('request', request => {
      const url = request.url();
      if (url.includes('.mp4') || url.includes('.m3u8') || url.includes('.ts')) {
          networkLogs.push(`[REQ] ${url} | Range: ${request.headers()['range'] || 'none'}`);
      }
  });

  page.on('response', async response => {
      const url = response.url();
      if (url.includes('.mp4') || url.includes('.m3u8') || url.includes('.ts') || url.includes('playback-url')) {
          networkLogs.push(`[RES] ${url} | Status: ${response.status()} | Content-Type: ${response.headers()['content-type']} | Content-Length: ${response.headers()['content-length']} | Content-Range: ${response.headers()['content-range']} | Accept-Ranges: ${response.headers()['accept-ranges']}`);
      }
  });

  page.on('requestfailed', request => {
      const url = request.url();
      if (url.includes('.mp4') || url.includes('.m3u8') || url.includes('.ts') || url.includes('playback-url')) {
          networkLogs.push(`[FAILED] ${url} - ${request.failure()?.errorText}`);
      }
  });

  await page.setCookie({ name: 'student_token', value: token, domain: 'localhost', path: '/' });
  await page.setCookie({ name: 'token', value: token, domain: 'localhost', path: '/' });

  console.log("Navigating to student course page: 6a993a2447b54817ae7f96ad");
  await page.goto('http://localhost:3000/student/courses/6a993a2447b54817ae7f96ad', { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Click on "web-bb"
  await page.evaluate(() => {
     const h3s = Array.from(document.querySelectorAll('h3'));
     const webBb = h3s.find(h => h.textContent.includes('web-bb'));
     if (webBb) {
         const parent = webBb.closest('div');
         if (parent) parent.click();
     }
  });

  await new Promise(r => setTimeout(r, 3000));

  // Step 8: Capture media events
  await page.evaluate(() => {
      window.mediaEvents = [];
      const video = document.querySelector('video');
      if (video) {
          const events = ['loadedmetadata', 'loadeddata', 'canplay', 'playing', 'waiting', 'stalled', 'progress', 'error', 'abort', 'emptied', 'durationchange', 'play'];
          events.forEach(e => {
              video.addEventListener(e, () => {
                  window.mediaEvents.push(`[VIDEO EVENT] ${e}`);
              });
          });
      }
  });

  // Try to play using Video.js Big Play Button
  console.log("Clicking Play button in Video.js...");
  await page.evaluate(() => {
      const btn = document.querySelector('.vjs-big-play-button');
      if (btn) btn.click();
  });

  // Wait 10 seconds for playback to start or stall
  await new Promise(r => setTimeout(r, 10000));

  const finalState = await page.evaluate(() => {
      const video = document.querySelector('video');
      let vjsError = null;
      if (window.videojs) {
          const players = Object.values(window.videojs.players);
          if (players.length > 0 && players[0].error()) {
              vjsError = players[0].error();
          }
      }
      return {
          src: video ? video.src : null,
          currentSrc: video ? video.currentSrc : null,
          readyState: video ? video.readyState : null,
          networkState: video ? video.networkState : null,
          error: video && video.error ? video.error.code : null,
          duration: video ? video.duration : null,
          videoWidth: video ? video.videoWidth : null,
          videoHeight: video ? video.videoHeight : null,
          paused: video ? video.paused : null,
          buffered: video && video.buffered.length > 0 ? true : false,
          vjsError,
          mediaEvents: window.mediaEvents
      };
  });
  
  console.log("=== NETWORK LOGS ===");
  console.log(networkLogs.join('\n'));

  console.log("=== FINAL STATE ===");
  console.log(JSON.stringify(finalState, null, 2));

  // STEP 10: TEST NATIVE VIDEO
  console.log("=== NATIVE VIDEO TEST ===");
  const nativeResult = await page.evaluate(async () => {
      const currentSrc = document.querySelector('video')?.currentSrc;
      if (!currentSrc) return "NO SRC FOUND";
      
      return new Promise((resolve) => {
          const v = document.createElement('video');
          v.src = currentSrc;
          v.controls = true;
          document.body.appendChild(v);
          
          v.addEventListener('loadedmetadata', () => resolve('loadedmetadata fired'));
          v.addEventListener('error', () => resolve(`error: ${v.error.code} ${v.error.message}`));
          v.addEventListener('stalled', () => resolve('stalled'));
          v.load();
          
          setTimeout(() => resolve(`timeout reached, readyState=${v.readyState}, networkState=${v.networkState}`), 5000);
      });
  });
  console.log("Native test result:", nativeResult);

  await browser.close();
  process.exit(0);
}
run();
