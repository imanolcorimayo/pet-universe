<?php
/**
 * Pure view helpers. No secrets, no external services — safe to track in git.
 */

/**
 * Canonical public origin. Kept here (rather than in the gitignored config.php)
 * because it is not a secret and must be consistent between local and prod.
 */
define('SITE_URL', 'https://petuniversecba.com');

/**
 * Build an asset URL with a filemtime cache-bust so browsers refetch on change.
 */
function asset(string $path): string {
    $rel   = ltrim($path, '/');
    $mtime = @filemtime(__DIR__ . '/../assets/' . $rel);
    return '/assets/' . $rel . ($mtime ? '?v=' . $mtime : '');
}

/**
 * Absolute URL of the current request, built from SITE_URL + path (no query).
 * Controllers can override with $page_canonical when they want to whitelist
 * specific query params (e.g. `?categoria=foo` on /productos).
 */
function currentCanonical(): string {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $path = rtrim($path, '/') ?: '/';
    return SITE_URL . $path;
}

/**
 * Absolute URL for a site-local asset path. Used for OG/Twitter images since
 * social scrapers reject relative URLs.
 */
function absoluteUrl(string $path): string {
    if (preg_match('#^https?://#', $path)) return $path;
    return SITE_URL . '/' . ltrim($path, '/');
}
