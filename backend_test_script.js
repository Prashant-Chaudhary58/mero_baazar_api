const http = require('http');

function makeRequest(port) {
  const options = {
    hostname: 'localhost',
    port: port,
    path: '/api/v1/products',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`Port ${port}: Status ${res.statusCode}`);
      console.log(`Body: ${data.substring(0, 500)}`); // First 500 chars
    });
  });

  req.on('error', (error) => {
    console.error(`Port ${port} Error: ${error.message}`);
  });

  req.end();
}

console.log("Testing Backend Connection...");
makeRequest(5000);
makeRequest(5001);
