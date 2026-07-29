import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root backend directory path
const backendDir = path.resolve(__dirname, '../../');

const DEFAULT_CONFIG_FILENAME = 'ytdlp-config.json';
const DEFAULT_COOKIES_FILENAME = 'yt-dlp-cookies.txt';

const DEFAULT_CONFIG = {
  ytdlpBinary: 'yt-dlp',
  cookiesFile: DEFAULT_COOKIES_FILENAME,
  defaultArgs: [
    '-f', 'bv*[vcodec^=avc1][height<=1080]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b',
    '--remux-video', 'mp4',
    '--write-info-json'
  ],
  rules: [
    {
      name: 'YouTube',
      domains: ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com'],
      patterns: ['^[a-zA-Z0-9_-]{11}$'],
      args: [
        '--js-runtime', 'node',
        '--cookies', '{cookies_file}'
      ]
    },
    {
      name: 'Default / Other Platforms',
      domains: ['*'],
      args: []
    }
  ]
};

let cachedConfig = null;
let cachedMtime = 0;

/**
 * Gets the path to the config file from ENV or default
 */
export function getConfigFilepath() {
  const envPath = process.env.YTDLP_CONFIG_FILE;
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.join(backendDir, envPath);
  }
  return path.join(backendDir, DEFAULT_CONFIG_FILENAME);
}

/**
 * Gets the path to the cookies file from ENV or config or default
 */
export function getCookiesFilepath(configCookiesFile) {
  const envPath = process.env.YTDLP_COOKIES_FILE;
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.join(backendDir, envPath);
  }
  const relOrAbs = configCookiesFile || DEFAULT_COOKIES_FILENAME;
  return path.isAbsolute(relOrAbs) ? relOrAbs : path.join(backendDir, relOrAbs);
}

/**
 * Loads config from JSON file, creating default file if missing.
 * Caches config in memory and reloads if the file mtime changes.
 */
export function loadYtdlpConfig() {
  const configFilepath = getConfigFilepath();

  if (!fs.existsSync(configFilepath)) {
    try {
      fs.writeFileSync(configFilepath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
      console.log(`[yt-dlp config] Created default config file at: ${configFilepath}`);
    } catch (err) {
      console.error(`[yt-dlp config] Failed to write default config file:`, err);
    }
    cachedConfig = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  }

  try {
    const stats = fs.statSync(configFilepath);
    if (cachedConfig && stats.mtimeMs === cachedMtime) {
      return cachedConfig;
    }

    const raw = fs.readFileSync(configFilepath, 'utf8');
    const parsed = JSON.parse(raw);
    
    cachedConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
      rules: Array.isArray(parsed.rules) ? parsed.rules : DEFAULT_CONFIG.rules,
      defaultArgs: Array.isArray(parsed.defaultArgs) ? parsed.defaultArgs : DEFAULT_CONFIG.defaultArgs
    };
    cachedMtime = stats.mtimeMs;

    return cachedConfig;
  } catch (err) {
    console.error(`[yt-dlp config] Error reading config file at ${configFilepath}, using defaults:`, err);
    return cachedConfig || DEFAULT_CONFIG;
  }
}

/**
 * Gets the yt-dlp binary name/path
 */
export function getYtdlpBinary() {
  if (process.env.YTDLP_PATH || process.env.YTDLP_BINARY) {
    return process.env.YTDLP_PATH || process.env.YTDLP_BINARY;
  }
  const config = loadYtdlpConfig();
  return config.ytdlpBinary || 'yt-dlp';
}

/**
 * Find matching rule for a given URL or video ID
 */
export function getMatchingRule(url, config) {
  if (!url) return null;
  const trimmedUrl = url.trim();
  const rules = config.rules || [];

  let hostname = '';
  try {
    if (trimmedUrl.includes('http://') || trimmedUrl.includes('https://')) {
      const parsed = new URL(trimmedUrl);
      hostname = parsed.hostname.toLowerCase();
    }
  } catch (e) {}

  for (const rule of rules) {
    if (rule.enabled === false) continue;

    // Check domain matches
    if (rule.domains && Array.isArray(rule.domains)) {
      for (const domain of rule.domains) {
        if (domain === '*') continue;
        const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
        if (hostname && (hostname === cleanDomain || hostname.endsWith('.' + cleanDomain) || hostname.includes(cleanDomain))) {
          return rule;
        }
      }
    }

    // Check pattern matches (regex)
    if (rule.patterns && Array.isArray(rule.patterns)) {
      for (const pat of rule.patterns) {
        try {
          const regex = new RegExp(pat);
          if (regex.test(trimmedUrl)) {
            return rule;
          }
        } catch (e) {
          console.error(`[yt-dlp config] Invalid regex pattern "${pat}" in rule "${rule.name || 'Unnamed'}"`);
        }
      }
    }
  }

  // Return wildcard rule if present
  const wildcardRule = rules.find(r => r.domains && Array.isArray(r.domains) && r.domains.includes('*'));
  return wildcardRule || null;
}

/**
 * Resolves rule arguments (replacing placeholders like {cookies_file})
 */
function resolveRuleArgs(rawArgs, cookiesFilepath) {
  if (!Array.isArray(rawArgs)) return [];
  const resolved = [];
  const cookiesExist = fs.existsSync(cookiesFilepath);

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    
    // Handle pair '--cookies', '{cookies_file}'
    if (arg === '--cookies' && i + 1 < rawArgs.length && rawArgs[i + 1] === '{cookies_file}') {
      if (cookiesExist) {
        resolved.push('--cookies', cookiesFilepath);
      } else {
        console.log(`[yt-dlp config] Cookies file not found at ${cookiesFilepath}, skipping --cookies flag.`);
      }
      i++;
      continue;
    }

    if (typeof arg === 'string') {
      if (arg.includes('{cookies_file}')) {
        if (cookiesExist) {
          resolved.push(arg.replace('{cookies_file}', cookiesFilepath));
        } else {
          console.log(`[yt-dlp config] Cookies file not found at ${cookiesFilepath}, omitting argument ${arg}.`);
        }
      } else {
        resolved.push(arg);
      }
    } else {
      resolved.push(arg);
    }
  }

  return resolved;
}

/**
 * Helper to split shell string format into argument tokens
 */
function parseFormatString(formatStr, replacements) {
  let str = formatStr;
  for (const [key, val] of Object.entries(replacements)) {
    const placeholder = `{${key}}`;
    str = str.replaceAll(placeholder, Array.isArray(val) ? val.join(' ') : (val || ''));
  }
  return str.trim().split(/\s+/).filter(Boolean);
}

/**
 * Builds complete yt-dlp arguments for fetching video title
 */
export function getYtdlpTitleArgs(url) {
  const config = loadYtdlpConfig();
  const cookiesFilepath = getCookiesFilepath(config.cookiesFile);
  const matchingRule = getMatchingRule(url, config);

  const args = [];
  if (matchingRule) {
    if (matchingRule.titleArgs && Array.isArray(matchingRule.titleArgs)) {
      args.push(...resolveRuleArgs(matchingRule.titleArgs, cookiesFilepath));
    } else if (matchingRule.args && Array.isArray(matchingRule.args)) {
      args.push(...resolveRuleArgs(matchingRule.args, cookiesFilepath));
    }
  }

  args.push('--get-title', url);
  return args;
}

/**
 * Builds complete yt-dlp arguments for downloading video
 */
export function getYtdlpDownloadArgs(url, outputFilePath) {
  const config = loadYtdlpConfig();
  const cookiesFilepath = getCookiesFilepath(config.cookiesFile);
  const matchingRule = getMatchingRule(url, config);

  let defaultArgs = (matchingRule && Array.isArray(matchingRule.defaultArgs)) 
    ? matchingRule.defaultArgs 
    : (config.defaultArgs || DEFAULT_CONFIG.defaultArgs);
  if (process.env.YTDLP_DEFAULT_ARGS) {
    defaultArgs = process.env.YTDLP_DEFAULT_ARGS.trim().split(/\s+/);
  }

  // If matching rule specifies a custom commandFormat (array or string)
  if (matchingRule && matchingRule.commandFormat) {
    const resolvedRuleArgs = resolveRuleArgs(matchingRule.args || [], cookiesFilepath);
    const replacements = {
      default_args: defaultArgs,
      rule_args: resolvedRuleArgs,
      cookies_file: fs.existsSync(cookiesFilepath) ? cookiesFilepath : '',
      output: outputFilePath,
      url: url
    };

    if (Array.isArray(matchingRule.commandFormat)) {
      return matchingRule.commandFormat.flatMap(token => {
        if (token === '{default_args}') return defaultArgs;
        if (token === '{rule_args}') return resolvedRuleArgs;
        if (token === '{output}') return outputFilePath;
        if (token === '{url}') return url;
        if (token === '{cookies_file}') return fs.existsSync(cookiesFilepath) ? cookiesFilepath : '';
        return token;
      });
    } else if (typeof matchingRule.commandFormat === 'string') {
      return parseFormatString(matchingRule.commandFormat, replacements);
    }
  }

  const args = [...defaultArgs, '-o', outputFilePath];

  if (matchingRule && matchingRule.args) {
    const resolvedRuleArgs = resolveRuleArgs(matchingRule.args, cookiesFilepath);
    args.push(...resolvedRuleArgs);
  }

  args.push(url);
  return args;
}
