<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

$token = $_GET['token'] ?? '';
$group = validateToken($pdo, $token);

checkRateLimit($token);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => ['code' => 'METHOD_NOT_ALLOWED', 'message' => 'Nur GET erlaubt']]);
    exit;
}

$stmt = $pdo->prepare('
    SELECT COUNT(DISTINCT p.id) AS purchase_count,
           COALESCE(SUM(pi.bag_size_grams * pi.quantity), 0) AS total_grams,
           COALESCE(SUM(
               ROUND(pi.price_cents * pi.bag_size_grams / CASE pi.price_unit
                   WHEN \'kg\' THEN 1000
                   WHEN \'500g\' THEN 500
                   WHEN \'250g\' THEN 250
               END) * pi.quantity
           ), 0) AS total_price_cents
    FROM `groups` g
    LEFT JOIN purchases p ON p.group_id = g.id
    LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
    WHERE g.id = ?
');
$stmt->execute([$group['group_id']]);
$row = $stmt->fetch();

$totalGrams = (int) $row['total_grams'];
$totalPriceCents = (int) $row['total_price_cents'];
$purchaseCount = (int) $row['purchase_count'];
$avgPricePerKgCents = $totalGrams > 0
    ? (int) round($totalPriceCents * 1000 / $totalGrams)
    : null;

jsonResponse([
    'id' => (int) $group['group_id'],
    'name' => $group['group_name'],
    'season' => [
        'id' => (int) $group['season_id'],
        'name' => $group['season_name'],
        'startDate' => $group['start_date'],
        'endDate' => $group['end_date'],
    ],
    'totalGrams' => $totalGrams,
    'purchaseCount' => $purchaseCount,
    'avgPricePerKgCents' => $avgPricePerKgCents,
]);
