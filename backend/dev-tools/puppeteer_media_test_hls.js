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
    args: ['--no-sandbox', '--disable-setuid-sandbox'], 
    headless: "new"
  });
  
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[CONSOLE] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));

  await page.setCookie({ name: 'student_token', value: token, domain: 'localhost', path: '/' });
  await page.setCookie({ name: 'token', value: token, domain: 'localhost', path: '/' });

  await page.goto('http://localhost:3000/student/courses/6a993a2447b54817ae7f96ad', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // The first video is automatically selected, so just play it.
  console.log("Clicking Play button in Video.js...");
  await page.evaluate(() => {
      const btn = document.querySelector('.vjs-big-play-button');
      if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 8000));

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
          vjsError
      };
  });
  
  console.log("=== FINAL STATE ===");
  console.log(JSON.stringify(finalState, null, 2));
  console.log("=== CONSOLE LOGS ===");
  console.log(consoleLogs.join('\n'));

  await browser.close();
  process.exit(0);
}
run();
