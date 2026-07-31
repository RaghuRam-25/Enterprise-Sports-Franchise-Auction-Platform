import http from 'http';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 5000, path,
      method: 'POST',
      // Explicitly NO Authorization header — this is a clean login attempt
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const cases = [
  { email: 'superadmin@auction.com', password: 'Admin@1234',   expected: 'SUPER_ADMIN'  },
  { email: 'podium@auction.com',     password: 'Podium@1234',  expected: 'PODIUM_ADMIN' },
  { email: 'manager@auction.com',    password: 'Manager@1234', expected: 'TEAM_MANAGER' },
  { email: 'player@auction.com',     password: 'Player@1234',  expected: 'PLAYER'       },
  { email: 'bad@test.com',           password: 'wrongpass',    expected: 'REJECT'       },
];

console.log('\n=== ROLE RESOLUTION TEST (all roles) ===\n');
let pass = 0, fail = 0;

for (const tc of cases) {
  try {
    const { status, body } = await post('/api/auth/login', { email: tc.email, password: tc.password });
    const gotRole = body?.user?.role;

    if (tc.expected === 'REJECT') {
      if (!body.success) {
        console.log(`✅ PASS  Rejected invalid creds (status=${status}, msg='${body.message}')`);
        pass++;
      } else {
        console.log(`❌ FAIL  Bad creds accepted! status=${status} body=${JSON.stringify(body)}`);
        fail++;
      }
    } else {
      if (body.success && gotRole === tc.expected) {
        console.log(`✅ PASS  ${tc.email.padEnd(32)} → ${gotRole}`);
        pass++;
      } else {
        console.log(`❌ FAIL  ${tc.email.padEnd(32)} expected=${tc.expected}  got=${gotRole || body?.message} (${status})`);
        fail++;
      }
    }
  } catch(e) {
    console.log(`❌ ERR   ${tc.email}: ${e.message}`);
    fail++;
  }
}

console.log(`\n${'─'.repeat(55)}`);
console.log(`  ${pass} PASS  /  ${fail} FAIL  (${cases.length} total)`);
console.log(`${'─'.repeat(55)}\n`);
