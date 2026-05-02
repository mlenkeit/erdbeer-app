<?php
declare(strict_types=1);

function queryParam(string $key): string
{
    if (isset($_GET[$key]) && $_GET[$key] !== '') {
        return $_GET[$key];
    }
    foreach (['REDIRECT_QUERY_STRING', 'QUERY_STRING'] as $qs_key) {
        $qs = $_SERVER[$qs_key] ?? '';
        if ($qs !== '') {
            parse_str($qs, $params);
            if (isset($params[$key]) && $params[$key] !== '') {
                return $params[$key];
            }
        }
    }
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($uri, PHP_URL_PATH) ?? '';
    $path = preg_replace('#^/api/#', '', $path);
    if ($key === 'token') {
        if (preg_match('#^(?:group|leaderboard|purchases|setup)/([a-f0-9]+)#', $path, $m)) {
            return $m[1];
        }
    }
    if ($key === 'id') {
        if (preg_match('#^purchases/[a-f0-9]+/(\d+)#', $path, $m)) {
            return $m[1];
        }
    }
    return '';
}

function jsonResponse(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode(['data' => $data]);
    exit;
}

function jsonError(string $code, string $message, int $status): never
{
    http_response_code($status);
    echo json_encode(['error' => ['code' => $code, 'message' => $message]]);
    exit;
}

function validateToken(PDO $pdo, string $token): array
{
    $stmt = $pdo->prepare('
        SELECT g.id AS group_id, g.name AS group_name, g.season_id,
               s.name AS season_name, s.start_date, s.end_date
        FROM `groups` g
        JOIN seasons s ON s.id = g.season_id
        WHERE g.invite_token = ?
    ');
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if ($row === false) {
        jsonError('GROUP_NOT_FOUND', 'Gruppe nicht gefunden', 404);
    }

    return $row;
}

function isSeasonActive(array $group): bool
{
    $tz = new DateTimeZone('Europe/Berlin');
    $today = new DateTimeImmutable('today', $tz);
    $start = new DateTimeImmutable($group['start_date'], $tz);
    $end = new DateTimeImmutable($group['end_date'], $tz);

    return $today >= $start && $today <= $end;
}

function validatePurchaseDate(string $dateStr, array $group): string
{
    $date = \DateTime::createFromFormat('Y-m-d', $dateStr);
    if ($date === false || $date->format('Y-m-d') !== $dateStr) {
        jsonError('VALIDATION_ERROR', 'Ungültiges Datum', 400);
    }

    $tz = new DateTimeZone('Europe/Berlin');
    $start = new DateTimeImmutable($group['start_date'], $tz);
    $end = new DateTimeImmutable($group['end_date'], $tz);
    $dateIm = new DateTimeImmutable($dateStr, $tz);

    if ($dateIm < $start || $dateIm > $end) {
        jsonError('VALIDATION_ERROR', 'Datum muss innerhalb der Saison liegen', 400);
    }

    return $dateStr;
}

function validatePurchaseItems(mixed $items): array
{
    if (!is_array($items) || count($items) === 0) {
        jsonError('VALIDATION_ERROR', 'Mindestens eine Position erforderlich', 400);
    }

    if (count($items) > 20) {
        jsonError('VALIDATION_ERROR', 'Maximal 20 Positionen pro Einkauf', 400);
    }

    $validPriceUnits = ['kg', '500g', '250g'];
    $validBagSizes = [250, 500];
    $validated = [];

    foreach ($items as $i => $item) {
        if (!is_array($item)) {
            jsonError('VALIDATION_ERROR', "Position " . ($i + 1) . " ist ungültig", 400);
        }

        $bagSizeGrams = $item['bagSizeGrams'] ?? null;
        if (!is_int($bagSizeGrams) || !in_array($bagSizeGrams, $validBagSizes, true)) {
            jsonError('VALIDATION_ERROR', "Position " . ($i + 1) . ": Ungültige Beutelgröße", 400);
        }

        $quantity = $item['quantity'] ?? null;
        if (!is_int($quantity) || $quantity < 1 || $quantity > 99) {
            jsonError('VALIDATION_ERROR', "Position " . ($i + 1) . ": Ungültige Anzahl (1-99)", 400);
        }

        $priceCents = $item['priceCents'] ?? null;
        if (!is_int($priceCents) || $priceCents < 1 || $priceCents > 99999) {
            jsonError('VALIDATION_ERROR', "Position " . ($i + 1) . ": Ungültiger Preis", 400);
        }

        $priceUnit = $item['priceUnit'] ?? null;
        if (!is_string($priceUnit) || !in_array($priceUnit, $validPriceUnits, true)) {
            jsonError('VALIDATION_ERROR', "Position " . ($i + 1) . ": Ungültige Preiseinheit", 400);
        }

        $validated[] = [
            'bagSizeGrams' => $bagSizeGrams,
            'quantity' => $quantity,
            'priceCents' => $priceCents,
            'priceUnit' => $priceUnit,
        ];
    }

    return $validated;
}

function computePricePerKgCents(int $priceCents, string $priceUnit): int
{
    $unitGrams = match ($priceUnit) {
        'kg' => 1000,
        '500g' => 500,
        '250g' => 250,
    };

    return (int) round($priceCents * 1000 / $unitGrams);
}

function computePurchaseTotals(array $items): array
{
    $totalGrams = 0;
    $totalPriceCents = 0;

    foreach ($items as $item) {
        $unitGrams = match ($item['priceUnit']) {
            'kg' => 1000,
            '500g' => 500,
            '250g' => 250,
        };

        $totalGrams += $item['bagSizeGrams'] * $item['quantity'];
        $totalPriceCents += (int) round($item['priceCents'] * $item['bagSizeGrams'] / $unitGrams) * $item['quantity'];
    }

    return [
        'totalGrams' => $totalGrams,
        'totalPriceCents' => $totalPriceCents,
    ];
}

function computeGroupStats(array $purchases): array
{
    $totalGrams = 0;
    $totalPriceCents = 0;
    $purchaseCount = count($purchases);

    foreach ($purchases as $purchase) {
        $totals = computePurchaseTotals($purchase['items']);
        $totalGrams += $totals['totalGrams'];
        $totalPriceCents += $totals['totalPriceCents'];
    }

    $avgPricePerKgCents = $totalGrams > 0
        ? (int) round($totalPriceCents * 1000 / $totalGrams)
        : null;

    return [
        'totalGrams' => $totalGrams,
        'totalPriceCents' => $totalPriceCents,
        'purchaseCount' => $purchaseCount,
        'avgPricePerKgCents' => $avgPricePerKgCents,
    ];
}

function checkRateLimit(string $token): void
{
    $dir = sys_get_temp_dir() . '/erdbeer_rate';
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }

    $file = $dir . '/' . hash('sha256', $token);
    $window = 600;
    $limit = 100;
    $now = time();

    $fp = fopen($file, 'c+');
    if ($fp === false) {
        return;
    }

    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        return;
    }

    $raw = stream_get_contents($fp);
    $entries = [];
    if ($raw !== false && $raw !== '') {
        $entries = array_filter(
            array_map('intval', explode("\n", trim($raw))),
            fn(int $ts) => ($now - $ts) < $window
        );
    }

    if (count($entries) >= $limit) {
        $oldest = min($entries);
        $retryAfter = $window - ($now - $oldest);
        flock($fp, LOCK_UN);
        fclose($fp);
        header("Retry-After: {$retryAfter}");
        jsonError('RATE_LIMITED', 'Zu viele Anfragen, bitte warte kurz', 429);
    }

    $entries[] = $now;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, implode("\n", $entries) . "\n");
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

function requireJsonContentType(): void
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') === false) {
        jsonError('UNSUPPORTED_MEDIA_TYPE', 'Content-Type muss application/json sein', 415);
    }
}

function requireContentLength(int $maxBytes = 65536): void
{
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $maxBytes) {
        jsonError('PAYLOAD_TOO_LARGE', 'Anfrage ist zu groß', 413);
    }
}

function parseJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        jsonError('VALIDATION_ERROR', 'Leerer Request-Body', 400);
    }

    try {
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (\JsonException) {
        jsonError('VALIDATION_ERROR', 'Ungültiges JSON', 400);
    }

    if (!is_array($data)) {
        jsonError('VALIDATION_ERROR', 'JSON muss ein Objekt sein', 400);
    }

    return $data;
}

function requireActiveSeason(array $group): void
{
    if (!isSeasonActive($group)) {
        jsonError('SEASON_ENDED', 'Die Saison ist beendet', 403);
    }
}

function formatTimestamp(string $timestamp): string
{
    $dt = new DateTimeImmutable($timestamp, new DateTimeZone('UTC'));
    return $dt->format('Y-m-d\TH:i:s\Z');
}
