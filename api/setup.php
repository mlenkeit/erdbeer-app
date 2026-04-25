<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$token = $_GET['token'] ?? '';
$expectedToken = getenv('SETUP_TOKEN');

if ($expectedToken === false || $expectedToken === '' || !hash_equals($expectedToken, $token)) {
    http_response_code(403);
    echo json_encode(['error' => ['code' => 'FORBIDDEN', 'message' => 'Invalid setup token']]);
    exit;
}

$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'erdbeer';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: '';

$dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";

$pdo = new PDO($dsn, $dbUser, $dbPass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
]);

$stmt = $pdo->query("SHOW TABLES LIKE 'seasons'");
if ($stmt->rowCount() > 0) {
    echo json_encode(['status' => 'already_exists']);
    exit;
}

$schemaFile = __DIR__ . '/../sql/schema.sql';
if (!is_file($schemaFile)) {
    http_response_code(500);
    echo json_encode(['error' => ['code' => 'SCHEMA_NOT_FOUND', 'message' => 'schema.sql not found']]);
    exit;
}

$schema = file_get_contents($schemaFile);
$pdo->exec($schema);

echo json_encode(['status' => 'created']);
