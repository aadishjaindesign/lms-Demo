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
  await page.setViewport({ width: 1440, height: 900 });

  await page.setCookie({ name: 'student_token', value: token, domain: 'localhost', path: '/' });
  await page.setCookie({ name: 'token', value: token, domain: 'localhost', path: '/' });

  await page.goto('http://localhost:3000/student/courses/6a993a2447b54817ae7f96ad', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const uiState = await page.evaluate(() => {
      const container = document.querySelector('.lms-video-container');
      const videojs = document.querySelector('.video-js');
      const tech = document.querySelector('.vjs-tech');
      const controlBar = document.querySelector('.vjs-control-bar');

      const cRect = container ? container.getBoundingClientRect() : null;
      const vRect = videojs ? videojs.getBoundingClientRect() : null;
      const cbRect = controlBar ? controlBar.getBoundingClientRect() : null;
      
      const techStyle = tech ? window.getComputedStyle(tech).objectFit : null;
      const vjsStyle = videojs ? window.getComputedStyle(videojs) : null;

      return {
          containerBounds: cRect,
          videojsBounds: vRect,
          controlBarBounds: cbRect,
          techObjectFit: techStyle,
          vjsHeight: vjsStyle ? vjsStyle.height : null,
          vjsPaddingTop: vjsStyle ? vjsStyle.paddingTop : null,
      };
  });
  
  console.log("=== UI STATE ===");
  console.log(JSON.stringify(uiState, null, 2));

  await browser.close();
  process.exit(0);
}
run();
