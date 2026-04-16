<?php

// One-off script: installs the DO Spaces lifecycle rule that auto-deletes
// unsaved invoice scan images after 2 days (48-72h window in practice).
//
// Run once from the repo root:
//   php api/scripts/set-invoice-lifecycle.php
//
// Idempotent — re-running just overwrites the existing rule with the same config.
// Pass --dry-run to print what would be sent without making changes.
// Pass --show   to only read the current lifecycle config and exit.

require_once __DIR__ . '/../includes/config.php';

$dryRun = in_array('--dry-run', $argv, true);
$showOnly = in_array('--show', $argv, true);

$rule = [
    'ID'     => 'expire-invoice-pending',
    'Status' => 'Enabled',
    'Filter' => ['Prefix' => SPACES_PROJECT_PREFIX . '/' . SPACES_INVOICE_PENDING_SUBPATH . '/'],
    'Expiration' => ['Days' => 2],
];

$s3 = getS3Client();

echo "Bucket:   " . SPACES_BUCKET . "\n";
echo "Endpoint: " . SPACES_ENDPOINT . "\n";
echo "Prefix:   " . $rule['Filter']['Prefix'] . "\n";
echo "Rule:\n";
echo json_encode($rule, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";

// Always read the existing config so we can see what's already in place.
echo "Current lifecycle configuration on bucket:\n";
try {
    $current = $s3->getBucketLifecycleConfiguration(['Bucket' => SPACES_BUCKET]);
    echo json_encode($current->get('Rules'), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if (strpos($msg, 'NoSuchLifecycleConfiguration') !== false) {
        echo "(none)\n\n";
    } else {
        echo "Could not read existing config: $msg\n\n";
    }
}

if ($showOnly) {
    echo "--show passed, exiting without changes.\n";
    exit(0);
}

if ($dryRun) {
    echo "--dry-run passed, not applying.\n";
    exit(0);
}

echo "Applying lifecycle configuration...\n";
try {
    $s3->putBucketLifecycleConfiguration([
        'Bucket' => SPACES_BUCKET,
        'LifecycleConfiguration' => [
            'Rules' => [$rule],
        ],
    ]);
    echo "OK — rule installed.\n\n";
} catch (Throwable $e) {
    fwrite(STDERR, "FAILED: " . $e->getMessage() . "\n");
    exit(1);
}

echo "Verifying...\n";
$after = $s3->getBucketLifecycleConfiguration(['Bucket' => SPACES_BUCKET]);
echo json_encode($after->get('Rules'), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
