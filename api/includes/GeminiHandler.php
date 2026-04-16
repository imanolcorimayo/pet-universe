<?php

/**
 * Minimal Gemini client with model rotation.
 *
 * Rotation rules (ported from gasto-obra):
 *   - 429 (rate limit / quota):       mark model exhausted for today and rotate.
 *   - 503 (unavailable):              retry twice (2s, 5s), then rotate.
 *   - transport / other HTTP errors:  retry twice (2s, 5s), then rotate.
 *
 * Exhaustion is persisted in tmp/gemini-exhausted.json so subsequent requests in
 * the same day skip models that already ran out of quota.
 */
class GeminiHandler {
    private string $apiKey;
    private array $models;
    private string $exhaustedCachePath;
    private int $timeout;

    public function __construct(string $apiKey, array $models, int $timeout = 45) {
        if (empty($apiKey))  throw new RuntimeException('GeminiHandler requires an API key');
        if (empty($models)) throw new RuntimeException('GeminiHandler requires at least one model');

        $this->apiKey  = $apiKey;
        $this->models  = $models;
        $this->timeout = $timeout;
        $this->exhaustedCachePath = TMP_DIR . '/gemini-exhausted.json';
    }

    /**
     * Generates structured JSON content from a prompt + optional inline image.
     *
     * @param string      $systemPrompt
     * @param string      $userPrompt
     * @param array       $responseSchema  Gemini responseSchema (OBJECT/ARRAY/STRING/NUMBER)
     * @param string|null $imageB64        Optional base64-encoded image
     * @param string|null $mimeType        Required when $imageB64 is given
     * @return array                       Decoded JSON payload
     * @throws RuntimeException            If every model fails or the response is malformed
     */
    public function generateStructured(
        string $systemPrompt,
        string $userPrompt,
        array $responseSchema,
        ?string $imageB64 = null,
        ?string $mimeType = null
    ): array {
        $parts = [];
        if ($imageB64 !== null) {
            if ($mimeType === null) throw new RuntimeException('mimeType required when imageB64 is given');
            $parts[] = ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]];
        }
        $parts[] = ['text' => $userPrompt];

        $body = [
            'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
            'contents' => [['parts' => $parts]],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'responseSchema'   => $responseSchema,
                'temperature'      => 0.1,
            ],
        ];

        foreach ($this->models as $model) {
            if ($this->isExhaustedToday($model)) {
                error_log("Gemini: skipping exhausted model $model");
                continue;
            }

            $result = $this->tryWithModel($model, $body);

            if ($result === 'rate_limit') {
                $this->markExhaustedToday($model);
                error_log("Gemini: model $model hit 429, rotating");
                continue;
            }

            if ($result === 'rotate') {
                error_log("Gemini: model $model unavailable, rotating");
                continue;
            }

            // Success — parse the text part as JSON
            $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;
            if (!$text) {
                error_log('Gemini: empty response text from ' . $model);
                continue;
            }

            $payload = json_decode($text, true);
            if (!is_array($payload)) {
                error_log("Gemini: malformed JSON from $model: $text");
                continue;
            }

            return $payload;
        }

        throw new RuntimeException('All Gemini models exhausted or unavailable');
    }

    // --- Internal ---

    /**
     * Tries a single model with 2 retries on transient failures.
     * Return values:
     *   - array        on success (raw decoded response body)
     *   - 'rate_limit' on 429 (caller should mark exhausted)
     *   - 'rotate'     on persistent 503 / transport error (caller should rotate)
     */
    private function tryWithModel(string $model, array $body) {
        $maxRetries = 2;
        $delays = [2, 5]; // seconds

        for ($attempt = 0; $attempt <= $maxRetries; $attempt++) {
            $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
                 . $model . ':generateContent?key=' . $this->apiKey;

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS     => json_encode($body),
                CURLOPT_TIMEOUT        => $this->timeout,
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr  = curl_error($ch);
            curl_close($ch);

            if ($response === false) {
                if ($attempt < $maxRetries) {
                    sleep($delays[$attempt]);
                    continue;
                }
                error_log("Gemini transport failure on $model: $curlErr");
                return 'rotate';
            }

            if ($httpCode === 429) {
                return 'rate_limit';
            }

            if ($httpCode === 503) {
                if ($attempt < $maxRetries) {
                    sleep($delays[$attempt]);
                    continue;
                }
                return 'rotate';
            }

            if ($httpCode < 200 || $httpCode >= 300) {
                error_log("Gemini HTTP $httpCode on $model: $response");
                if ($attempt < $maxRetries) {
                    sleep($delays[$attempt]);
                    continue;
                }
                return 'rotate';
            }

            $decoded = json_decode($response, true);
            if (!is_array($decoded)) {
                error_log("Gemini: unparseable response on $model");
                return 'rotate';
            }
            return $decoded;
        }

        return 'rotate';
    }

    private function loadExhaustedMap(): array {
        if (!file_exists($this->exhaustedCachePath)) return [];
        $data = json_decode(@file_get_contents($this->exhaustedCachePath), true);
        return is_array($data) ? $data : [];
    }

    private function isExhaustedToday(string $model): bool {
        $map = $this->loadExhaustedMap();
        $today = date('Y-m-d');
        return ($map[$model] ?? null) === $today;
    }

    private function markExhaustedToday(string $model): void {
        $map = $this->loadExhaustedMap();
        $map[$model] = date('Y-m-d');
        file_put_contents($this->exhaustedCachePath, json_encode($map), LOCK_EX);
    }
}
