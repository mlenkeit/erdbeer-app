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
    SELECT g.id AS group_id, g.name
    FROM groups g
    WHERE g.season_id = ?
');
$stmt->execute([$group['season_id']]);
$groups = $stmt->fetchAll();

$itemStmt = $pdo->prepare('
    SELECT p.group_id, pi.bag_size_grams, pi.quantity, pi.price_cents, pi.price_unit
    FROM purchases p
    JOIN purchase_items pi ON pi.purchase_id = p.id
    WHERE p.group_id IN (SELECT id FROM groups WHERE season_id = ?)
');
$itemStmt->execute([$group['season_id']]);
$allItems = $itemStmt->fetchAll();

$groupData = [];
foreach ($groups as $g) {
    $groupData[$g['group_id']] = [
        'groupId' => (int) $g['group_id'],
        'name' => $g['name'],
        'totalGrams' => 0,
        'purchaseCount' => 0,
    ];
}

$purchasesSeen = [];
foreach ($allItems as $item) {
    $gid = $item['group_id'];
    $totalItemGrams = $item['bag_size_grams'] * $item['quantity'];
    $groupData[$gid]['totalGrams'] += $totalItemGrams;
}

$purchaseCountStmt = $pdo->prepare('
    SELECT p.group_id, COUNT(*) AS cnt
    FROM purchases p
    JOIN groups g ON g.id = p.group_id
    WHERE g.season_id = ?
    GROUP BY p.group_id
');
$purchaseCountStmt->execute([$group['season_id']]);
$counts = $purchaseCountStmt->fetchAll();
foreach ($counts as $c) {
    if (isset($groupData[$c['group_id']])) {
        $groupData[$c['group_id']]['purchaseCount'] = (int) $c['cnt'];
    }
}

$entries = array_values($groupData);

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
