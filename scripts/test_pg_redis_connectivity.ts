import net from 'net';
import Redis from 'ioredis';

async function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(2000);
    s.on('connect', () => {
      s.destroy();
      resolve(true);
    });
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.on('error', () => {
      s.destroy();
      resolve(false);
    });
    s.connect(port, host);
  });
}

async function main() {
  console.log('Testing raw TCP connectivity:');
  const pgPort = await checkPort('127.0.0.1', 5432);
  const redisPort = await checkPort('127.0.0.1', 6379);
  console.log(`- PostgreSQL 127.0.0.1:5432 -> ${pgPort ? 'ONLINE (OPEN)' : 'OFFLINE'}`);
  console.log(`- Redis 127.0.0.1:6379      -> ${redisPort ? 'ONLINE (OPEN)' : 'OFFLINE'}`);

  console.log('\nTesting Redis client connection:');
  const redis = new Redis('redis://localhost:6379', { connectTimeout: 3000 });
  await redis.set('bmsce:infra:test', 'redis_verified_' + Date.now());
  const val = await redis.get('bmsce:infra:test');
  console.log(`- Redis Read/Write Check    -> SUCCESS (${val})`);
  await redis.quit();

  console.log('\nStep 1 Connectivity Test completed successfully!');
  process.exit(0);
}

main().catch((e) => {
  console.error('Connectivity test error:', e);
  process.exit(1);
});

