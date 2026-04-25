<?php
declare(strict_types=1);

set_exception_handler(function (\Throwable $e): void {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'error' => [
            'code' => 'INTERNAL_ERROR',
            'message' => 'Ein unerwarteter Fehler ist aufgetreten',
        ],
    ]);
    exit;
});

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

assert($pdo->getAttribute(PDO::ATTR_EMULATE_PREPARES) === false);

$pdo->exec("SET time_zone = '+00:00'");

$allowedOrigins = [
    'http://localhost:5173',
];

$productionOrigin = getenv('ALLOWED_ORIGIN');
if ($productionOrigin !== false && $productionOrigin !== '') {
    $allowedOrigins[] = $productionOrigin;
}

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$corsOrigin = in_array($requestOrigin, $allowedOrigins, true) ? $requestOrigin : '';

if ($corsOrigin !== '') {
    header("Access-Control-Allow-Origin: {$corsOrigin}");
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header('Strict-Transport-Security: max-age=31536000');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/helpers.php';
