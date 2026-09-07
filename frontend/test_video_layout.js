const fs = require('fs');
let code = fs.readFileSync('/home/akhilesh-yadav/Desktop/lms-jains/frontend/components/HlsVideoPlayer.js', 'utf8');
code = code.replace(/fluid: true,/g, 'fluid: true,');
console.log("File loaded.");
