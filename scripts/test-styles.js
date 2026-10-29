const http = require('http');

const baseUrl = new URL(process.env.HUSH_TEST_URL || 'http://127.0.0.1:3000');
const cases = [
  ['quick-fix', 'What is recursion? Reply in one sentence.'],
  ['explain-it', 'What is recursion in programming? Keep it under two sentences.'],
  ['think-with-me', 'Should I learn Rust or Go? Ask one reflective question.'],
  ['challenge-me', 'Remote work is strictly better than in-office. Give one counterpoint.'],
];

function testStyle(style, prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ messages: [{ role: 'user', content: prompt }], style });
    const request = http.request({
      hostname: baseUrl.hostname,
      port: baseUrl.port || (baseUrl.protocol === 'https:' ? 443 : 80),
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 180000,
    }, (response) => {
      let output = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { output += chunk; });
      response.on('end', () => {
        const passed = response.statusCode === 200 && output.trim().length > 0 && response.headers['x-hush-style'] === style;
        console.log(`\n=== Style: [${style}] ===`);
        console.log('HTTP Status:', response.statusCode);
        console.log('X-Hush-Style Header:', response.headers['x-hush-style']);
        console.log('Output preview:', output.slice(0, 160).replace(/\n/g, ' '));
        if (passed) resolve();
        else reject(new Error(`${style} did not produce a valid streamed response.`));
      });
    });
    request.on('timeout', () => request.destroy(new Error(`${style} timed out after 180 seconds.`)));
    request.on('error', reject);
    request.write(data);
    request.end();
  });
}

async function run() {
  console.log(`Testing four styles against ${baseUrl.origin}...`);
  for (const [style, prompt] of cases) await testStyle(style, prompt);
  console.log('\nAll four live Ollama style checks passed.');
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
