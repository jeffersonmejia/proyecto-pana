<?php
declare(strict_types=1);

require dirname(__DIR__) . '/config/bootstrap.php';

$allowedOrigin = env_value('FRONTEND_URL', 'http://localhost:4200');
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($requestOrigin !== '' && hash_equals($allowedOrigin, $requestOrigin)) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    if ($requestOrigin !== '' && !hash_equals($allowedOrigin, $requestOrigin)) {
        http_response_code(403);
        exit;
    }

    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

$basePath = rtrim((string) parse_url(env_value('APP_URL', ''), PHP_URL_PATH), '/');
$requestPath = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if ($basePath !== '' && strpos($requestPath, $basePath) === 0) {
    $requestPath = substr($requestPath, strlen($basePath));
}

$routeKey = ($_SERVER['REQUEST_METHOD'] ?? 'GET') . ' ' . '/' . trim($requestPath, '/');
$routes = require dirname(__DIR__) . '/routes/api.php';
$handler = $routes[$routeKey] ?? null;

header('Content-Type: application/json; charset=utf-8');

if ($handler === null) {
    http_response_code(404);
    echo json_encode(['error' => 'not_found']);
    exit;
}

$handler();
