<?php

use Aws\S3\S3Client;

// --- HTTP helpers ---

function jsonResponse(int $status, array $data): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function corsHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
    }
}

// --- Rate limiting (file-based, per IP) ---

function checkRateLimit(): void {
    $rateLimitDir = TMP_DIR . '/rate-limit';
    if (!is_dir($rateLimitDir)) {
        mkdir($rateLimitDir, 0755, true);
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $file = $rateLimitDir . '/' . md5($ip) . '.json';

    $now = time();
    $data = ['count' => 0, 'window_start' => $now];

    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true) ?: $data;

        // Reset if window expired
        if ($now - $data['window_start'] >= RATE_LIMIT_WINDOW) {
            $data = ['count' => 0, 'window_start' => $now];
        }
    }

    $data['count']++;
    file_put_contents($file, json_encode($data), LOCK_EX);

    if ($data['count'] > RATE_LIMIT_MAX) {
        jsonResponse(429, ['error' => 'Too many requests. Try again later.']);
    }
}

// --- Image validation ---

function validateUploadedImage(array $file): string|true {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return 'Upload failed with error code: ' . $file['error'];
    }

    if ($file['size'] > MAX_UPLOAD_SIZE) {
        return 'File too large. Maximum size is ' . (MAX_UPLOAD_SIZE / 1024 / 1024) . 'MB';
    }

    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, ALLOWED_MIME_TYPES, true)) {
        return 'Invalid file type. Allowed: JPEG, PNG, WebP';
    }

    $info = getimagesize($file['tmp_name']);
    if ($info === false) {
        return 'File is not a valid image';
    }

    return true;
}

// --- Image processing (GD) ---

function loadImage(string $path): GdImage {
    $mime = mime_content_type($path);

    $image = match ($mime) {
        'image/jpeg' => imagecreatefromjpeg($path),
        'image/png'  => imagecreatefrompng($path),
        'image/webp' => imagecreatefromwebp($path),
        default      => throw new Exception("Unsupported image type: $mime"),
    };

    if ($image === false) {
        throw new Exception('Failed to load image');
    }

    // Fix EXIF orientation for JPEG (phone photos)
    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data($path);
        if ($exif && isset($exif['Orientation'])) {
            $image = match ($exif['Orientation']) {
                3 => imagerotate($image, 180, 0),
                6 => imagerotate($image, -90, 0),
                8 => imagerotate($image, 90, 0),
                default => $image,
            };
        }
    }

    return $image;
}

function resizeImage(GdImage $source, int $targetWidth): GdImage {
    $srcWidth = imagesx($source);
    $srcHeight = imagesy($source);

    // Don't upscale
    if ($srcWidth <= $targetWidth) {
        return $source;
    }

    $ratio = $srcHeight / $srcWidth;
    $targetHeight = (int) round($targetWidth * $ratio);

    $resized = imagescale($source, $targetWidth, $targetHeight, IMG_BICUBIC);
    if ($resized === false) {
        throw new Exception('Failed to resize image');
    }

    return $resized;
}

function convertToWebp(string $jpgPath, string $webpPath): bool {
    // Shell args are escaped; slug is validated to [a-z0-9\-] before reaching here
    $cmd = sprintf(
        'cwebp -quiet -q %d -m 6 -mt %s -o %s 2>&1',
        WEBP_QUALITY,
        escapeshellarg($jpgPath),
        escapeshellarg($webpPath)
    );
    exec($cmd, $output, $returnCode);
    return $returnCode === 0 && file_exists($webpPath);
}

function convertToAvif(string $jpgPath, string $avifPath): bool {
    // Shell args are escaped; slug is validated to [a-z0-9\-] before reaching here
    $cmd = sprintf(
        'avifenc --jobs 4 --min 0 --max 63 -a end-usage=q -a cq-level=%d -a tune=ssim --speed 6 %s %s 2>&1',
        AVIF_QUALITY,
        escapeshellarg($jpgPath),
        escapeshellarg($avifPath)
    );
    exec($cmd, $output, $returnCode);
    return $returnCode === 0 && file_exists($avifPath);
}

function processImage(string $sourcePath, string $slug): array {
    if (!is_dir(TMP_DIR)) {
        mkdir(TMP_DIR, 0755, true);
    }

    $source = loadImage($sourcePath);
    $files = [];

    foreach (IMAGE_SIZES as $sizeName => $width) {
        $resized = resizeImage($source, $width);

        // Save as JPEG first (base for cwebp/avifenc)
        $jpgPath = TMP_DIR . "/{$slug}-{$sizeName}.jpg";
        imagejpeg($resized, $jpgPath, JPEG_QUALITY);

        // Convert to WebP via cwebp (better compression than GD)
        $webpPath = TMP_DIR . "/{$slug}-{$sizeName}.webp";
        if (!convertToWebp($jpgPath, $webpPath)) {
            // Fallback to GD if cwebp not available
            imagewebp($resized, $webpPath, WEBP_QUALITY);
        }

        $formats = [
            'jpg'  => $jpgPath,
            'webp' => $webpPath,
        ];

        // Convert to AVIF via avifenc (only include if available)
        $avifPath = TMP_DIR . "/{$slug}-{$sizeName}.avif";
        if (convertToAvif($jpgPath, $avifPath)) {
            $formats['avif'] = $avifPath;
        }

        $files[$sizeName] = $formats;

        if ($resized !== $source) {
            imagedestroy($resized);
        }
    }

    imagedestroy($source);

    return $files;
}

// --- S3 / DO Spaces ---

function getS3Client(): S3Client {
    static $client = null;
    if (!$client) {
        $client = new S3Client([
            'version'     => '2006-03-01',
            'region'      => SPACES_REGION,
            'endpoint'    => SPACES_ENDPOINT,
            'credentials' => [
                'key'    => SPACES_KEY,
                'secret' => SPACES_SECRET,
            ],
        ]);
    }
    return $client;
}

function uploadToSpaces(array $localFiles, string $slug, string $subpath = 'products'): array {
    $s3 = getS3Client();
    $cdnUrls = [];

    $mimeTypes = [
        'jpg'  => 'image/jpeg',
        'webp' => 'image/webp',
        'avif' => 'image/avif',
    ];

    foreach ($localFiles as $sizeName => $formats) {
        foreach ($formats as $format => $localPath) {
            $key = SPACES_PROJECT_PREFIX . "/{$subpath}/{$slug}-{$sizeName}.{$format}";

            $s3->putObject([
                'Bucket'       => SPACES_BUCKET,
                'Key'          => $key,
                'SourceFile'   => $localPath,
                'ACL'          => 'public-read',
                'ContentType'  => $mimeTypes[$format],
                'CacheControl' => 'public, max-age=31536000, immutable',
            ]);

            $cdnUrls[$sizeName][$format] = CDN_BASE_URL . '/' . $key;
        }
    }

    return $cdnUrls;
}

// Uploads a single invoice image to the pending prefix. Unlike product images,
// invoices only need one legible variant (shown in a details modal, never
// responsive), so we skip the multi-size/multi-format pipeline and ship a
// single 1200px webp. Returns the pending CDN URL.
function uploadInvoiceImage(string $sourcePath, string $slug): string {
    if (!is_dir(TMP_DIR)) {
        mkdir(TMP_DIR, 0755, true);
    }

    $source = loadImage($sourcePath);
    $resized = resizeImage($source, 1200);

    $jpgPath  = TMP_DIR . "/{$slug}.jpg";
    $webpPath = TMP_DIR . "/{$slug}.webp";
    imagejpeg($resized, $jpgPath, JPEG_QUALITY);

    if (!convertToWebp($jpgPath, $webpPath)) {
        imagewebp($resized, $webpPath, WEBP_QUALITY);
    }

    if ($resized !== $source) {
        imagedestroy($resized);
    }
    imagedestroy($source);

    try {
        $key = SPACES_PROJECT_PREFIX . '/' . SPACES_INVOICE_PENDING_SUBPATH . "/{$slug}.webp";
        getS3Client()->putObject([
            'Bucket'       => SPACES_BUCKET,
            'Key'          => $key,
            'SourceFile'   => $webpPath,
            'ACL'          => 'public-read',
            'ContentType'  => 'image/webp',
            'CacheControl' => 'public, max-age=31536000, immutable',
        ]);
    } finally {
        @unlink($jpgPath);
        @unlink($webpPath);
    }

    return CDN_BASE_URL . '/' . $key;
}

// Copies a scanned invoice image from the pending prefix to the permanent one.
// Idempotent — safe to call twice for the same slug. The pending copy is NOT
// deleted here; the DO Spaces lifecycle rule on the pending prefix handles
// cleanup. That way, if the purchase save fails after commit, the user can
// retry and still find the pending image. Returns the committed CDN URL, or
// '' if nothing could be committed.
function commitInvoiceImage(string $slug): string {
    $s3 = getS3Client();
    $pendingKey   = SPACES_PROJECT_PREFIX . '/' . SPACES_INVOICE_PENDING_SUBPATH . "/{$slug}.webp";
    $permanentKey = SPACES_PROJECT_PREFIX . '/' . SPACES_INVOICE_SUBPATH         . "/{$slug}.webp";

    try {
        $s3->copyObject([
            'Bucket'            => SPACES_BUCKET,
            'Key'               => $permanentKey,
            'CopySource'        => SPACES_BUCKET . '/' . $pendingKey,
            'ACL'               => 'public-read',
            'ContentType'       => 'image/webp',
            'CacheControl'      => 'public, max-age=31536000, immutable',
            'MetadataDirective' => 'REPLACE',
        ]);
        return CDN_BASE_URL . '/' . $permanentKey;
    } catch (Throwable $e) {
        // Idempotency fallback: previous commit may already have moved it.
        try {
            $s3->headObject(['Bucket' => SPACES_BUCKET, 'Key' => $permanentKey]);
            return CDN_BASE_URL . '/' . $permanentKey;
        } catch (Throwable $_) {
            error_log("commitInvoiceImage failed for $slug: " . $e->getMessage());
            return '';
        }
    }
}

function cleanupTempFiles(array $localFiles): void {
    foreach ($localFiles as $formats) {
        foreach ($formats as $path) {
            if (file_exists($path)) {
                @unlink($path);
            }
        }
    }
}

// --- AI image prep ---

// Downscale + recompress so the upload to Gemini is fast without losing OCR detail.
// 2000px wide keeps small text readable on multi-column supplier invoices.
function prepareImageForAi(string $sourcePath): array {
    $source = loadImage($sourcePath);
    $resized = resizeImage($source, 2000);

    ob_start();
    imagejpeg($resized, null, 85);
    $jpegBytes = ob_get_clean();

    if ($resized !== $source) {
        imagedestroy($resized);
    }
    imagedestroy($source);

    if ($jpegBytes === false || $jpegBytes === '') {
        throw new Exception('Failed to encode image for AI');
    }

    return [
        'base64'   => base64_encode($jpegBytes),
        'mimeType' => 'image/jpeg',
    ];
}

// --- Locale-aware number parsing ---

// Handles Argentine (1.500,50) and US (1,500.50) formats. Returns 0 on failure.
function parseLocalizedAmount($raw): float {
    if (is_int($raw) || is_float($raw)) return (float) $raw;
    if (!is_string($raw)) return 0.0;

    $str = preg_replace('/[^0-9.,]/', '', $raw);
    if ($str === '' || $str === null) return 0.0;

    $hasComma = strpos($str, ',') !== false;
    $hasDot   = strpos($str, '.') !== false;

    if ($hasComma && $hasDot) {
        $lastComma = strrpos($str, ',');
        $lastDot   = strrpos($str, '.');
        if ($lastComma > $lastDot) {
            // 1.500,50 → Argentine
            return (float) str_replace(',', '.', str_replace('.', '', $str));
        }
        // 1,500.50 → US
        return (float) str_replace(',', '', $str);
    }

    if ($hasComma) {
        if (substr_count($str, ',') > 1) return (float) str_replace(',', '', $str);
        $afterComma = substr($str, strrpos($str, ',') + 1);
        if (strlen($afterComma) === 3) return (float) str_replace(',', '', $str);
        return (float) str_replace(',', '.', $str);
    }

    if ($hasDot) {
        if (substr_count($str, '.') > 1) return (float) str_replace('.', '', $str);
        [$beforeDot, $afterDot] = explode('.', $str);
        if (strlen($afterDot) === 3 && $beforeDot !== '0') return (float) str_replace('.', '', $str);
        return (float) $str;
    }

    return (float) $str;
}

// Lowercase + strip accents + collapse whitespace. Used for case/accent-insensitive
// comparison of brand names and invoice text tokens.
function normalizeText(string $s): string {
    $s = mb_strtolower(trim($s), 'UTF-8');
    $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
    if ($ascii !== false && $ascii !== '') {
        $s = $ascii;
    }
    return trim(preg_replace('/\s+/', ' ', $s));
}

// Extracts the first weight mentioned in an invoice line as kilograms. Handles
// "20 Kg", "7,5kg", "500 grs", "1.5 kg". Grams are converted to kg. Returns
// null if no weight token is present.
function extractWeightKg(string $rawText): ?float {
    if (preg_match('/(\d+(?:[.,]\d+)?)\s*(kg|grs?|g)\b/i', $rawText, $m)) {
        $value = parseLocalizedAmount($m[1]);
        $unit = strtolower($m[2]);
        if ($unit === 'g' || $unit === 'gr' || $unit === 'grs') {
            return $value / 1000.0;
        }
        return $value;
    }
    return null;
}

// Fallback brand detector: returns the first brand from $brands whose
// normalized form appears as a whole word in $rawText. Runs when Pass 1 of
// scan-invoice didn't map the line to a catalog brand. Word boundaries are
// important so "mini" inside "ENERCAN MINI" doesn't match a brand called
// "MINI" — but a true whole-word brand mention still matches through
// surrounding punctuation.
function matchBrandInText(string $rawText, array $brands): ?string {
    $normText = normalizeText($rawText);
    foreach ($brands as $brand) {
        $normBrand = normalizeText($brand);
        if ($normBrand === '') continue;
        if (preg_match('/\b' . preg_quote($normBrand, '/') . '\b/', $normText)) {
            return $brand;
        }
    }
    return null;
}

// Distinct non-empty brands from a catalog array. Dedupes case/accent-insensitively
// but preserves the first catalog casing so the AI sees brands written naturally.
function distinctBrands(array $catalog): array {
    $seen = [];
    $result = [];
    foreach ($catalog as $p) {
        $brand = trim($p['brand'] ?? '');
        if ($brand === '') continue;
        $key = normalizeText($brand);
        if (isset($seen[$key])) continue;
        $seen[$key] = true;
        $result[] = $brand;
    }
    sort($result, SORT_STRING | SORT_FLAG_CASE);
    return $result;
}

// Normalizes a date string to YYYY-MM-DD. Returns '' if unparseable.
function parseInvoiceDate(?string $raw): string {
    if ($raw === null) return '';
    $raw = trim($raw);
    if ($raw === '') return '';

    $formats = [
        'd/m/Y', 'j/n/Y', 'd-m-Y', 'j-n-Y', 'd.m.Y', 'j.n.Y',
        'Y-m-d', 'Y/m/d',
        'd/m/y', 'j/n/y', 'd-m-y', 'j-n-y',
    ];
    foreach ($formats as $fmt) {
        $d = DateTime::createFromFormat($fmt, $raw);
        if ($d !== false && $d->format($fmt) === $raw) {
            return $d->format('Y-m-d');
        }
    }
    return '';
}

