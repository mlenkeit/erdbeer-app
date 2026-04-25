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
    SELECT p.id AS purchase_id,
           pi.bag_size_grams, pi.quantity, pi.price_cents, pi.price_unit
    FROM purchases p
    JOIN purchase_items pi ON pi.purchase_id = p.id
    WHERE p.group_id = ?
');
$stmt->execute([$group['group_id']]);
$rows = $stmt->fetchAll();

$purchases = [];
foreach ($rows as $row) {
    $pid = $row['purchase_id'];
    if (!isset($purchases[$pid])) {
        $purchases[$pid] = ['items' => []];
    }
    $purchases[$pid]['items'][] = [
        'bagSizeGrams' => $row['bag_size_grams'],
        'quantity' => $row['quantity'],
        'priceCents' => $row['price_cents'],
        'priceUnit' => $row['price_unit'],
    ];
}

$stats = computeGroupStats(array_values($purchases));

jsonResponse([
    'id' => (int) $group['group_id'],
    'name' => $group['group_name'],
    'season' => [
        'id' => (int) $group['season_id'],
        'name' => $group['season_name'],
        'startDate' => $group['start_date'],
        'endDate' => $group['end_date'],
    ],
    'totalGrams' => $stats['totalGrams'],
    'purchaseCount' => $stats['purchaseCount'],
    'avgPricePerKgCents' => $stats['avgPricePerKgCents'],
]);
