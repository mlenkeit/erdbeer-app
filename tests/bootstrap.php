<?php
declare(strict_types=1);

function getTestPdo(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: 'db';
    $name = getenv('DB_NAME') ?: 'erdbeer_test';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASS') ?: 'test';

    $pdo = new PDO(
        "mysql:host={$host};dbname={$name};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    return $pdo;
}

function getApiBaseUrl(): string
{
    return getenv('API_BASE_URL') ?: 'http://api/api';
}

function truncateAllTables(PDO $pdo): void
{
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    $pdo->exec('TRUNCATE TABLE purchase_items');
    $pdo->exec('TRUNCATE TABLE purchases');
    $pdo->exec('TRUNCATE TABLE `groups`');
    $pdo->exec('TRUNCATE TABLE seasons');
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}

function seedSeason(PDO $pdo, array $overrides = []): int
{
    $data = array_merge([
        'name' => 'Testsaison 2026',
        'start_date' => '2026-04-01',
        'end_date' => '2026-07-31',
    ], $overrides);

    $stmt = $pdo->prepare('INSERT INTO seasons (name, start_date, end_date) VALUES (?, ?, ?)');
    $stmt->execute([$data['name'], $data['start_date'], $data['end_date']]);

    return (int) $pdo->lastInsertId();
}

function seedGroup(PDO $pdo, int $seasonId, string $token, array $overrides = []): int
{
    $data = array_merge([
        'name' => 'Testgruppe',
    ], $overrides);

    $stmt = $pdo->prepare('INSERT INTO `groups` (season_id, name, invite_token) VALUES (?, ?, ?)');
    $stmt->execute([$seasonId, $data['name'], $token]);

    return (int) $pdo->lastInsertId();
}

function seedPurchase(PDO $pdo, int $groupId, string $date, array $items): int
{
    $stmt = $pdo->prepare('INSERT INTO purchases (group_id, purchased_at) VALUES (?, ?)');
    $stmt->execute([$groupId, $date]);
    $purchaseId = (int) $pdo->lastInsertId();

    $itemStmt = $pdo->prepare(
        'INSERT INTO purchase_items (purchase_id, bag_size_grams, quantity, price_cents, price_unit) VALUES (?, ?, ?, ?, ?)'
    );

    foreach ($items as $item) {
        $itemStmt->execute([
            $purchaseId,
            $item['bagSizeGrams'],
            $item['quantity'],
            $item['priceCents'],
            $item['priceUnit'],
        ]);
    }

    return $purchaseId;
}
