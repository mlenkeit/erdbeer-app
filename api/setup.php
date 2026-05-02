<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function env(string $key, string $default = ''): string {
    static $fileEnv = null;
    if ($fileEnv === null) {
        $envFile = __DIR__ . '/env.php';
        $fileEnv = is_file($envFile) ? (require $envFile) : [];
    }
    if (isset($fileEnv[$key]) && $fileEnv[$key] !== '') return $fileEnv[$key];
    $val = getenv($key);
    if ($val !== false && $val !== '') return $val;
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') return $_SERVER[$key];
    if (isset($_SERVER['REDIRECT_' . $key]) && $_SERVER['REDIRECT_' . $key] !== '') return $_SERVER['REDIRECT_' . $key];
    return $default;
}

$token = $_GET['token'] ?? '';
if ($token === '') {
    $qs = $_SERVER['REDIRECT_QUERY_STRING'] ?? '';
    if ($qs !== '') {
        parse_str($qs, $qsParams);
        $token = $qsParams['token'] ?? '';
    }
}
$expectedToken = env('SETUP_TOKEN');

if ($expectedToken === '' || !hash_equals($expectedToken, $token)) {
    http_response_code(403);
    echo json_encode(['error' => ['code' => 'FORBIDDEN', 'message' => 'Invalid setup token']]);
    exit;
}

$dbHost = env('DB_HOST', 'localhost');
$dbName = env('DB_NAME', 'erdbeer');
$dbUser = env('DB_USER', 'root');
$dbPass = env('DB_PASS');

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
