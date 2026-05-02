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
    SELECT g.id AS group_id, g.name,
           COALESCE(SUM(pi.bag_size_grams * pi.quantity), 0) AS total_grams,
           COUNT(DISTINCT p.id) AS purchase_count
    FROM `groups` g
    LEFT JOIN purchases p ON p.group_id = g.id
    LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
    WHERE g.season_id = ?
    GROUP BY g.id, g.name
');
$stmt->execute([$group['season_id']]);
$rows = $stmt->fetchAll();

$entries = [];
foreach ($rows as $row) {
    $entries[] = [
        'groupId' => (int) $row['group_id'],
        'name' => $row['name'],
        'totalGrams' => (int) $row['total_grams'],
        'purchaseCount' => (int) $row['purchase_count'],
    ];
}

usort($entries, function (array $a, array $b): int {
    if ($b['totalGrams'] !== $a['totalGrams']) {
        return $b['totalGrams'] - $a['totalGrams'];
    }
    return strcmp($a['name'], $b['name']);
});

$leaderboard = [];
$prevGrams = null;
$rank = 0;
foreach ($entries as $i => $entry) {
    if ($entry['totalGrams'] !== $prevGrams) {
        $rank = $i + 1;
    }
    $prevGrams = $entry['totalGrams'];

    $gapToNextGrams = $i === 0
        ? null
        : $entries[$i - 1]['totalGrams'] - $entry['totalGrams'];

    $leaderboard[] = [
        'groupId' => $entry['groupId'],
        'name' => $entry['name'],
        'totalGrams' => $entry['totalGrams'],
        'purchaseCount' => $entry['purchaseCount'],
        'rank' => $rank,
        'gapToNextGrams' => $gapToNextGrams,
    ];
}

jsonResponse([
    'season' => [
        'id' => (int) $group['season_id'],
        'name' => $group['season_name'],
        'startDate' => $group['start_date'],
        'endDate' => $group['end_date'],
    ],
    'currentGroupId' => (int) $group['group_id'],
    'leaderboard' => $leaderboard,
]);
