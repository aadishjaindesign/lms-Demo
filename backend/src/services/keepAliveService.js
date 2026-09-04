import https from 'https';
import http from 'http';

export const startKeepAlive = () => {
  // Render sets RENDER_EXTERNAL_URL automatically. 
  // You can also set SERVER_URL manually in your .env file.
  const serverUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL;

  if (!serverUrl) {
    console.log('Keep-alive service skipped: No RENDER_EXTERNAL_URL or SERVER_URL found in env.');
    return;
  }

  // Ping every 9 minutes (9 * 60 * 1000 milliseconds)
  const pingInterval = 9 * 60 * 1000; 

  setInterval(() => {
    const protocol = serverUrl.startsWith('https') ? https : http;
    
    protocol.get(serverUrl, (res) => {
      if (res.statusCode === 200) {
        console.log(`Keep-alive ping successful at ${new Date().toLocaleString()}`);
      } else {
        console.log(`Keep-alive ping failed with status code: ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.error(`Keep-alive ping error: ${err.message}`);
    });
  }, pingInterval);
  
  console.log(`Keep-alive service started, pinging ${serverUrl} every 9 minutes`);
};
