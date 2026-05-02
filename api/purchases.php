<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

$token = queryParam('token');
$group = validateToken($pdo, $token);

checkRateLimit($token);

$method = $_SERVER['REQUEST_METHOD'];
$idParam = queryParam('id');
$purchaseId = $idParam !== '' ? (int) $idParam : null;

if ($purchaseId !== null) {
    handleSinglePurchase($pdo, $group, $token, $purchaseId, $method);
} else {
    handlePurchaseCollection($pdo, $group, $token, $method);
}

function handlePurchaseCollection(PDO $pdo, array $group, string $token, string $method): void
{
    match ($method) {
        'GET' => listPurchases($pdo, $group),
        'POST' => createPurchase($pdo, $group, $token),
        default => methodNotAllowed(),
    };
}

function handleSinglePurchase(PDO $pdo, array $group, string $token, int $purchaseId, string $method): void
{
    match ($method) {
        'GET' => getSinglePurchase($pdo, $group, $purchaseId),
        'PUT' => updatePurchase($pdo, $group, $purchaseId),
        'DELETE' => deletePurchase($pdo, $group, $purchaseId),
        default => methodNotAllowed(),
    };
}

function methodNotAllowed(): never
{
    http_response_code(405);
    echo json_encode(['error' => ['code' => 'METHOD_NOT_ALLOWED', 'message' => 'Methode nicht erlaubt']]);
    exit;
}

function listPurchases(PDO $pdo, array $group): never
{
    $stmt = $pdo->prepare('
        SELECT p.id, p.purchased_at, p.created_at
        FROM purchases p
        WHERE p.group_id = ?
        ORDER BY p.purchased_at DESC, p.id DESC
    ');
    $stmt->execute([$group['group_id']]);
    $purchaseRows = $stmt->fetchAll();

    $purchases = [];
    $allPurchasesWithItems = [];

    if (count($purchaseRows) > 0) {
        $ids = array_column($purchaseRows, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $itemStmt = $pdo->prepare("
            SELECT purchase_id, id, bag_size_grams, quantity, price_cents, price_unit
            FROM purchase_items
            WHERE purchase_id IN ({$placeholders})
            ORDER BY id ASC
        ");
        $itemStmt->execute($ids);
        $allItems = $itemStmt->fetchAll();

        $itemsByPurchase = [];
        foreach ($allItems as $item) {
            $itemsByPurchase[$item['purchase_id']][] = $item;
        }

        foreach ($purchaseRows as $pr) {
            $items = $itemsByPurchase[$pr['id']] ?? [];
            $formattedItems = [];
            foreach ($items as $item) {
                $formattedItems[] = [
                    'id' => (int) $item['id'],
                    'bagSizeGrams' => (int) $item['bag_size_grams'],
                    'quantity' => (int) $item['quantity'],
                    'priceCents' => (int) $item['price_cents'],
                    'priceUnit' => $item['price_unit'],
                    'pricePerKgCents' => computePricePerKgCents((int) $item['price_cents'], $item['price_unit']),
                ];
            }

            $computeItems = array_map(fn($it) => [
                'bagSizeGrams' => (int) $it['bag_size_grams'],
                'quantity' => (int) $it['quantity'],
                'priceCents' => (int) $it['price_cents'],
                'priceUnit' => $it['price_unit'],
            ], $items);

            $totals = computePurchaseTotals($computeItems);

            $allPurchasesWithItems[] = ['items' => $computeItems];

            $purchases[] = [
                'id' => (int) $pr['id'],
                'purchasedAt' => $pr['purchased_at'],
                'createdAt' => formatTimestamp($pr['created_at']),
                'items' => $formattedItems,
                'totalGrams' => $totals['totalGrams'],
                'totalPriceCents' => $totals['totalPriceCents'],
            ];
        }
    }

    $stats = computeGroupStats($allPurchasesWithItems);

    jsonResponse([
        'summary' => [
            'totalGrams' => $stats['totalGrams'],
            'totalPriceCents' => $stats['totalPriceCents'],
            'avgPricePerKgCents' => $stats['avgPricePerKgCents'],
        ],
        'purchases' => $purchases,
    ]);
}

function createPurchase(PDO $pdo, array $group, string $token): never
{
    requireActiveSeason($group);
    requireJsonContentType();
    requireContentLength();

    $body = parseJsonBody();

    $purchasedAt = validatePurchaseDate($body['purchasedAt'] ?? '', $group);
    $items = validatePurchaseItems($body['items'] ?? null);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO purchases (group_id, purchased_at) VALUES (?, ?)');
        $stmt->execute([$group['group_id'], $purchasedAt]);
        $purchaseId = (int) $pdo->lastInsertId();

        $itemStmt = $pdo->prepare('
            INSERT INTO purchase_items (purchase_id, bag_size_grams, quantity, price_cents, price_unit)
            VALUES (?, ?, ?, ?, ?)
        ');
        foreach ($items as $item) {
            $itemStmt->execute([
                $purchaseId,
                $item['bagSizeGrams'],
                $item['quantity'],
                $item['priceCents'],
                $item['priceUnit'],
            ]);
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $createdPurchase = fetchPurchaseWithItems($pdo, $purchaseId);

    header("Location: /api/purchases/{$token}/{$purchaseId}");
    jsonResponse($createdPurchase, 201);
}

function getSinglePurchase(PDO $pdo, array $group, int $purchaseId): never
{
    $purchase = fetchOwnedPurchase($pdo, $group, $purchaseId);
    $result = fetchPurchaseWithItems($pdo, (int) $purchase['id']);
    jsonResponse($result);
}

function updatePurchase(PDO $pdo, array $group, int $purchaseId): never
{
    requireActiveSeason($group);
    requireJsonContentType();
    requireContentLength();

    $purchase = fetchOwnedPurchase($pdo, $group, $purchaseId);

    $body = parseJsonBody();
    $purchasedAt = validatePurchaseDate($body['purchasedAt'] ?? '', $group);
    $items = validatePurchaseItems($body['items'] ?? null);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('UPDATE purchases SET purchased_at = ? WHERE id = ?');
        $stmt->execute([$purchasedAt, $purchaseId]);

        $delStmt = $pdo->prepare('DELETE FROM purchase_items WHERE purchase_id = ?');
        $delStmt->execute([$purchaseId]);

        $itemStmt = $pdo->prepare('
            INSERT INTO purchase_items (purchase_id, bag_size_grams, quantity, price_cents, price_unit)
            VALUES (?, ?, ?, ?, ?)
        ');
        foreach ($items as $item) {
            $itemStmt->execute([
                $purchaseId,
                $item['bagSizeGrams'],
                $item['quantity'],
                $item['priceCents'],
                $item['priceUnit'],
            ]);
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $result = fetchPurchaseWithItems($pdo, $purchaseId);
    jsonResponse($result);
}

function deletePurchase(PDO $pdo, array $group, int $purchaseId): never
{
    requireActiveSeason($group);

    $purchase = fetchOwnedPurchase($pdo, $group, $purchaseId);

    $stmt = $pdo->prepare('DELETE FROM purchases WHERE id = ?');
    $stmt->execute([$purchaseId]);

    http_response_code(204);
    exit;
}

function fetchOwnedPurchase(PDO $pdo, array $group, int $purchaseId): array
{
    $stmt = $pdo->prepare('
        SELECT p.id, p.purchased_at, p.created_at, p.updated_at
        FROM purchases p
        WHERE p.id = ? AND p.group_id = ?
    ');
    $stmt->execute([$purchaseId, $group['group_id']]);
    $row = $stmt->fetch();

    if ($row === false) {
        jsonError('PURCHASE_NOT_FOUND', 'Einkauf nicht gefunden', 404);
    }

    return $row;
}

function fetchPurchaseWithItems(PDO $pdo, int $purchaseId): array
{
    $stmt = $pdo->prepare('SELECT id, purchased_at, created_at, updated_at FROM purchases WHERE id = ?');
    $stmt->execute([$purchaseId]);
    $purchase = $stmt->fetch();

    $itemStmt = $pdo->prepare('
        SELECT id, bag_size_grams, quantity, price_cents, price_unit
        FROM purchase_items
        WHERE purchase_id = ?
        ORDER BY id ASC
    ');
    $itemStmt->execute([$purchaseId]);
    $items = $itemStmt->fetchAll();

    $formattedItems = [];
    $computeItems = [];
    foreach ($items as $item) {
        $formattedItems[] = [
            'id' => (int) $item['id'],
            'bagSizeGrams' => (int) $item['bag_size_grams'],
            'quantity' => (int) $item['quantity'],
            'priceCents' => (int) $item['price_cents'],
            'priceUnit' => $item['price_unit'],
            'pricePerKgCents' => computePricePerKgCents((int) $item['price_cents'], $item['price_unit']),
        ];
        $computeItems[] = [
            'bagSizeGrams' => (int) $item['bag_size_grams'],
            'quantity' => (int) $item['quantity'],
            'priceCents' => (int) $item['price_cents'],
            'priceUnit' => $item['price_unit'],
        ];
    }

    $totals = computePurchaseTotals($computeItems);

    $result = [
        'id' => (int) $purchase['id'],
        'purchasedAt' => $purchase['purchased_at'],
        'createdAt' => formatTimestamp($purchase['created_at']),
    ];

    if ($purchase['updated_at'] !== null) {
        $result['updatedAt'] = formatTimestamp($purchase['updated_at']);
    }

    $result['items'] = $formattedItems;
    $result['totalGrams'] = $totals['totalGrams'];
    $result['totalPriceCents'] = $totals['totalPriceCents'];

    return $result;
}
