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
  const token = jwt.sign(
    { userId: student._id.toString(), role: 'student' },
    process.env.JWT_SECRET || 'default_jwt_secret',
    { expiresIn: '1d' }
  );

  const browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: "new" });
  const page = await browser.newPage();
  
  // Listen for console logs and pass them through
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  await page.setCookie({ name: 'student_token', value: token, domain: 'localhost', path: '/' });
  await page.setCookie({ name: 'token', value: token, domain: 'localhost', path: '/' });

  console.log("Navigating to student course page...");
  // Use courseId 6a966ad560c263386f9ed691 since it has video 6a9b9fb0fd5507981243c5b4
  await page.goto('http://localhost:3000/student/courses/6a966ad560c263386f9ed691', { waitUntil: 'networkidle0' });

  await page.evaluate(async () => {
    return new Promise((resolve) => {
      const waitInterval = setInterval(() => {
         const player = window.videojs ? window.videojs.players[Object.keys(window.videojs.players)[0]] : null;
         if (player) {
           clearInterval(waitInterval);
           
           console.log("Player found!");
           
           const T0 = performance.now();
           let T1, T2, T3, T4, T5, T6, T7;
           
           player.on('loadstart', () => { T1 = performance.now(); console.log(`[EVENT] loadstart at ${T1 - T0}ms`); });
           player.on('loadedmetadata', () => { T5 = performance.now(); console.log(`[EVENT] loadedmetadata at ${T5 - T0}ms`); });
           player.on('canplay', () => { T6 = performance.now(); console.log(`[EVENT] canplay at ${T6 - T0}ms`); });
           player.on('playing', () => { 
             T7 = performance.now(); 
             console.log(`[EVENT] playing at ${T7 - T0}ms`); 
             
             console.log("[VIDEO TIMING]");
             console.log(`TOTAL STARTUP: ${T7 - T0}ms`);
             
             if (player.qualityLevels) {
                const ql = player.qualityLevels();
                console.log("[QUALITY DEBUG]");
                console.log(`qualityLevels available: ${!!ql}`);
                console.log(`qualityLevels count: ${ql.length}`);
                if (ql.length > 0) {
                  for (let i = 0; i < ql.length; i++) {
                     console.log(`- ${ql[i].height}p (${ql[i].bitrate} bps)`);
                  }
                }
             } else {
                console.log("[QUALITY DEBUG] player.qualityLevels is NOT defined");
             }
             
             resolve();
           });

           // Click play programmatically
           console.log("Clicking play...");
           player.play();
         }
      }, 500);
    });
  });

  await browser.close();
  process.exit(0);
}
run();
