import { 
  loadYtdlpConfig, 
  getMatchingRule, 
  getYtdlpTitleArgs, 
  getYtdlpDownloadArgs,
  getYtdlpBinary 
} from '../src/config/ytdlpConfig.js';
import assert from 'assert';

console.log('--- Running yt-dlp Configuration Tests ---');

// Test 1: Load config
const config = loadYtdlpConfig();
assert(config, 'Config should be loaded');
assert(Array.isArray(config.rules), 'Config rules should be an array');
console.log('✔ Test 1 passed: Config loaded successfully');

// Test 2: Match YouTube URL
const ytRule = getMatchingRule('https://www.youtube.com/watch?v=dQw4w9WgXcQ', config);
assert.strictEqual(ytRule.name, 'YouTube', 'Should match YouTube rule');
console.log('✔ Test 2 passed: YouTube URL matched YouTube rule');

// Test 3: Match YouTube ID (11-char pattern)
const ytIdRule = getMatchingRule('dQw4w9WgXcQ', config);
assert.strictEqual(ytIdRule.name, 'YouTube', 'Should match 11-char YouTube ID rule');
console.log('✔ Test 3 passed: YouTube 11-char ID matched YouTube rule');

// Test 4: Match Vimeo URL
const vimeoRule = getMatchingRule('https://vimeo.com/123456789', config);
assert.strictEqual(vimeoRule.name, 'Vimeo', 'Should match Vimeo rule');
console.log('✔ Test 4 passed: Vimeo URL matched Vimeo rule');

// Test 5: Match TikTok URL
const tikTokRule = getMatchingRule('https://www.tiktok.com/@user/video/123456', config);
assert.strictEqual(tikTokRule.name, 'TikTok', 'Should match TikTok rule');
console.log('✔ Test 5 passed: TikTok URL matched TikTok rule');

// Test 6: Fallback for unknown platform / direct URL
const fallbackRule = getMatchingRule('https://example.com/sample.mp4', config);
assert.strictEqual(fallbackRule.name, 'Default Fallback', 'Should match Default Fallback rule');
console.log('✔ Test 6 passed: Unknown platform matched Default Fallback rule');

// Test 7: Verify Title Args for YouTube vs Non-YouTube
const ytTitleArgs = getYtdlpTitleArgs('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
assert(ytTitleArgs.includes('--get-title'), 'Title args must include --get-title');
assert(ytTitleArgs.includes('--js-runtime'), 'YouTube title args should include --js-runtime');

const vimeoTitleArgs = getYtdlpTitleArgs('https://vimeo.com/123456789');
assert(vimeoTitleArgs.includes('--get-title'), 'Vimeo title args must include --get-title');
assert(!vimeoTitleArgs.includes('--js-runtime'), 'Vimeo title args should NOT include --js-runtime');
assert(!vimeoTitleArgs.includes('--cookies'), 'Vimeo title args should NOT include --cookies');
console.log('✔ Test 7 passed: Title args generated correctly per domain');

// Test 8: Download Args for YouTube vs Non-YouTube
const ytDlArgs = getYtdlpDownloadArgs('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '/tmp/yt.mp4');
assert(ytDlArgs.includes('/tmp/yt.mp4'), 'YouTube download args must include output path');
assert(ytDlArgs.includes('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'YouTube download args must include download URL');
assert(ytDlArgs.includes('--js-runtime'), 'YouTube download args must include --js-runtime');

const vimeoDlArgs = getYtdlpDownloadArgs('https://vimeo.com/123456789', '/tmp/vimeo.mp4');
assert(vimeoDlArgs.includes('/tmp/vimeo.mp4'), 'Vimeo download args must include output path');
assert(vimeoDlArgs.includes('--remux-video'), 'Download args must include --remux-video');
assert(!vimeoDlArgs.includes('--js-runtime'), 'Vimeo download args should NOT include --js-runtime');
assert(!vimeoDlArgs.includes('--cookies'), 'Vimeo download args should NOT include --cookies');
console.log('✔ Test 8 passed: Download args generated correctly per domain');

// Test 9: Binary lookup
const binary = getYtdlpBinary();
assert.strictEqual(binary, 'yt-dlp', 'Default binary should be yt-dlp');
console.log('✔ Test 9 passed: Binary lookup correct');

console.log('\n✅ All 9 yt-dlp config tests passed successfully!');
