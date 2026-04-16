<?php
/**
 * Pure view helpers. No secrets, no external services — safe to track in git.
 */

/**
 * Build an asset URL with a filemtime cache-bust so browsers refetch on change.
 */
function asset(string $path): string {
    $rel   = ltrim($path, '/');
    $mtime = @filemtime(__DIR__ . '/../assets/' . $rel);
    return '/assets/' . $rel . ($mtime ? '?v=' . $mtime : '');
}
