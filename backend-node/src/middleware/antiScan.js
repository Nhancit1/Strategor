/**
 * antiScan — early request filter that blocks automated scanners / path probes.
 *
 * Inspired by the CIH AntiScanFilter. It silently returns 404 (never 403) so a scanner
 * cannot tell a blocked probe from a non-existent route, which kills the enumeration signal.
 *
 * It blocks:
 *   1. Known scanner / brute-force tool User-Agents (sqlmap, nikto, gobuster, hydra, …).
 *   2. Probes for paths that never exist in this API (.php, wp-admin, /.env, /.git, …).
 *
 * It is intentionally conservative: only obvious attack signatures match, so legitimate
 * browser / API traffic is never affected.
 */

// Lower-cased substrings that appear in scanner/brute-force tool User-Agents.
const BAD_AGENTS = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'gobuster', 'dirbuster', 'dirb', 'wfuzz',
  'ffuf', 'hydra', 'medusa', 'nuclei', 'wpscan', 'acunetix', 'nessus', 'openvas',
  'zgrab', 'whatweb', 'httrack', 'libwww-perl', 'python-requests/0', 'curl/7.0',
];

// Path fragments that only a scanner would request against this API (it serves no PHP,
// no WordPress, no version-control or dotfiles). Matched case-insensitively.
const BAD_PATHS = [
  '.php', '.asp', '.aspx', '.jsp', '.cgi', '.env', '.git', '.svn', '.htaccess',
  'wp-admin', 'wp-login', 'wp-content', 'phpmyadmin', 'xmlrpc', '/vendor/',
  '/.aws', '/.ssh', 'id_rsa', 'eval-stdin', 'shell', 'config.php', '/actuator',
];

function notFound(res) {
  return res.status(404).json({ status: 404, message: 'Not Found' });
}

export function antiScan(req, res, next) {
  const ua = String(req.headers['user-agent'] || '').toLowerCase();
  if (ua && BAD_AGENTS.some((sig) => ua.includes(sig))) {
    return notFound(res);
  }
  const url = (req.originalUrl || req.url || '').toLowerCase();
  if (BAD_PATHS.some((frag) => url.includes(frag))) {
    return notFound(res);
  }
  next();
}
