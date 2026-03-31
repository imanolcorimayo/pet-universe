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

function uploadToSpaces(array $localFiles, string $slug): array {
    $s3 = getS3Client();
    $cdnUrls = [];

    $mimeTypes = [
        'jpg'  => 'image/jpeg',
        'webp' => 'image/webp',
        'avif' => 'image/avif',
    ];

    foreach ($localFiles as $sizeName => $formats) {
        foreach ($formats as $format => $localPath) {
            $key = SPACES_PROJECT_PREFIX . "/products/{$slug}-{$sizeName}.{$format}";

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

function cleanupTempFiles(array $localFiles): void {
    foreach ($localFiles as $formats) {
        foreach ($formats as $path) {
            if (file_exists($path)) {
                @unlink($path);
            }
        }
    }
}
