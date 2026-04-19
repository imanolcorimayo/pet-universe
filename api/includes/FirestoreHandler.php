<?php

/**
 * Minimal Firestore REST client using a Google service account.
 * No gRPC, no Google SDK — just cURL + openssl_sign.
 *
 * Caches the OAuth access token on disk (~55 min TTL) to avoid re-signing on every call.
 */
class FirestoreHandler {
    private string $projectId;
    private array $serviceAccount;
    private string $tokenCachePath;

    public function __construct(string $serviceAccountJsonPath, string $projectId) {
        if (!file_exists($serviceAccountJsonPath)) {
            throw new RuntimeException("Service account file not found: $serviceAccountJsonPath");
        }
        $json = file_get_contents($serviceAccountJsonPath);
        $data = json_decode($json, true);
        if (!$data || empty($data['client_email']) || empty($data['private_key'])) {
            throw new RuntimeException('Invalid service account JSON');
        }
        $this->serviceAccount = $data;
        $this->projectId = $projectId;
        $this->tokenCachePath = TMP_DIR . '/firestore-token.json';
    }

    /**
     * Runs a structured query against a top-level collection.
     *
     * @param string $collection    Collection name (e.g. 'product')
     * @param array  $whereClauses  [['field' => ..., 'op' => 'EQUAL'|'ARRAY_CONTAINS'|..., 'value' => ...], ...]
     * @param array  $selectFields  Optional field mask — only these fields are returned
     * @return array  List of documents as associative arrays, each with a '__id' key
     */
    public function queryCollection(string $collection, array $whereClauses, array $selectFields = []): array {
        $structuredQuery = [
            'from' => [['collectionId' => $collection]],
        ];

        if (!empty($selectFields)) {
            $structuredQuery['select'] = [
                'fields' => array_map(fn($f) => ['fieldPath' => $f], $selectFields),
            ];
        }

        if (count($whereClauses) === 1) {
            $structuredQuery['where'] = $this->buildFieldFilter($whereClauses[0]);
        } elseif (count($whereClauses) > 1) {
            $structuredQuery['where'] = [
                'compositeFilter' => [
                    'op' => 'AND',
                    'filters' => array_map(fn($c) => $this->buildFieldFilter($c), $whereClauses),
                ],
            ];
        }

        $url = "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/(default)/documents:runQuery";
        $response = $this->sendPost($url, ['structuredQuery' => $structuredQuery]);

        $results = [];
        foreach ($response as $row) {
            if (empty($row['document'])) continue;
            $doc = $this->decodeFields($row['document']['fields'] ?? []);
            $doc['__id'] = basename($row['document']['name']);
            $results[] = $doc;
        }
        return $results;
    }

    /**
     * Patches specific fields on an existing document. Uses updateMask so
     * other fields stay untouched.
     */
    public function patchDocument(string $collection, string $docId, array $fields): void {
        if (empty($fields)) return;
        $mask = array_map(fn($k) => 'updateMask.fieldPaths=' . urlencode($k), array_keys($fields));
        $url = "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/(default)/documents/{$collection}/{$docId}?"
             . implode('&', $mask);

        $body = [
            'fields' => array_map(fn($v) => $this->encodeValue($v), $fields),
        ];
        $this->sendPatch($url, $body);
    }

    /**
     * Fetches a single document by ID. Returns null if not found.
     */
    public function getDocument(string $collection, string $docId): ?array {
        $url = "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/(default)/documents/{$collection}/{$docId}";
        try {
            $response = $this->sendGet($url);
        } catch (RuntimeException $e) {
            if (str_contains($e->getMessage(), 'HTTP 404')) return null;
            throw $e;
        }
        $doc = $this->decodeFields($response['fields'] ?? []);
        $doc['__id'] = $docId;
        return $doc;
    }

    // --- Internal ---

    private function buildFieldFilter(array $clause): array {
        return [
            'fieldFilter' => [
                'field' => ['fieldPath' => $clause['field']],
                'op'    => $clause['op'],
                'value' => $this->encodeValue($clause['value']),
            ],
        ];
    }

    private function encodeValue($value): array {
        if (is_bool($value))   return ['booleanValue' => $value];
        if (is_int($value))    return ['integerValue' => (string)$value];
        if (is_float($value))  return ['doubleValue' => $value];
        if (is_null($value))   return ['nullValue' => null];
        if ($value instanceof DateTimeInterface) {
            return ['timestampValue' => $value->format('Y-m-d\TH:i:s.v\Z')];
        }
        if (is_array($value)) {
            return ['arrayValue' => [
                'values' => array_map(fn($v) => $this->encodeValue($v), $value),
            ]];
        }
        return ['stringValue' => (string)$value];
    }

    private function decodeFields(array $fields): array {
        $out = [];
        foreach ($fields as $key => $wrapped) {
            $out[$key] = $this->decodeValue($wrapped);
        }
        return $out;
    }

    private function decodeValue(array $wrapped) {
        if (isset($wrapped['stringValue']))    return $wrapped['stringValue'];
        if (isset($wrapped['integerValue']))   return (int)$wrapped['integerValue'];
        if (isset($wrapped['doubleValue']))    return (float)$wrapped['doubleValue'];
        if (isset($wrapped['booleanValue']))   return (bool)$wrapped['booleanValue'];
        if (array_key_exists('nullValue', $wrapped)) return null;
        if (isset($wrapped['timestampValue'])) return $wrapped['timestampValue'];
        if (isset($wrapped['arrayValue'])) {
            $values = $wrapped['arrayValue']['values'] ?? [];
            return array_map(fn($v) => $this->decodeValue($v), $values);
        }
        if (isset($wrapped['mapValue'])) {
            return $this->decodeFields($wrapped['mapValue']['fields'] ?? []);
        }
        if (isset($wrapped['referenceValue'])) return $wrapped['referenceValue'];
        return null;
    }

    private function getAccessToken(): string {
        // Try cached token
        if (file_exists($this->tokenCachePath)) {
            $cached = json_decode(file_get_contents($this->tokenCachePath), true);
            if ($cached && ($cached['expires_at'] ?? 0) > time() + 60) {
                return $cached['access_token'];
            }
        }

        // Build JWT
        $now = time();
        $header = $this->base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claims = $this->base64Url(json_encode([
            'iss'   => $this->serviceAccount['client_email'],
            'scope' => 'https://www.googleapis.com/auth/datastore',
            'aud'   => 'https://oauth2.googleapis.com/token',
            'iat'   => $now,
            'exp'   => $now + 3600,
        ]));

        $signingInput = "$header.$claims";
        $signature = '';
        $ok = openssl_sign(
            $signingInput,
            $signature,
            $this->serviceAccount['private_key'],
            'sha256WithRSAEncryption'
        );
        if (!$ok) throw new RuntimeException('Failed to sign service account JWT');

        $jwt = $signingInput . '.' . $this->base64Url($signature);

        // Exchange JWT for access token
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]),
            CURLOPT_TIMEOUT        => 10,
        ]);
        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($body === false || $httpCode !== 200) {
            throw new RuntimeException("Token exchange failed: HTTP $httpCode $curlErr $body");
        }

        $data = json_decode($body, true);
        if (empty($data['access_token'])) {
            throw new RuntimeException('Token exchange returned no access_token');
        }

        // Cache with a safety margin
        file_put_contents($this->tokenCachePath, json_encode([
            'access_token' => $data['access_token'],
            'expires_at'   => $now + 3300,
        ]), LOCK_EX);

        return $data['access_token'];
    }

    private function sendPost(string $url, array $body): array {
        $token = $this->getAccessToken();
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_TIMEOUT        => 15,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($response === false || $httpCode < 200 || $httpCode >= 300) {
            throw new RuntimeException("Firestore HTTP $httpCode $curlErr $response");
        }
        return json_decode($response, true) ?? [];
    }

    private function sendPatch(string $url, array $body): array {
        $token = $this->getAccessToken();
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_TIMEOUT        => 15,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($response === false || $httpCode < 200 || $httpCode >= 300) {
            throw new RuntimeException("Firestore HTTP $httpCode $curlErr $response");
        }
        return json_decode($response, true) ?? [];
    }

    private function sendGet(string $url): array {
        $token = $this->getAccessToken();
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $token],
            CURLOPT_TIMEOUT        => 15,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($response === false || $httpCode < 200 || $httpCode >= 300) {
            throw new RuntimeException("Firestore HTTP $httpCode $curlErr $response");
        }
        return json_decode($response, true) ?? [];
    }

    private function base64Url(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
