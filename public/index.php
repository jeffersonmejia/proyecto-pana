<?php
declare(strict_types=1);

use App\Exceptions\ApiException;

$projectRoot = rtrim((string) (getenv('PANA_API_ROOT') ?: dirname(__DIR__)), '/');
require $projectRoot . '/src/config/bootstrap.php';

$allowedOrigin = env_value('FRONTEND_URL', 'http://localhost:4200');
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
header('Content-Type: application/json; charset=utf-8');

if ($requestOrigin !== '' && !hash_equals($allowedOrigin, $requestOrigin)) {
    http_response_code(403);
    echo json_encode(['error' => 'origin_not_allowed']);
    exit;
}

if ($requestOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    http_response_code(204);
    exit;
}

$basePath = rtrim((string) parse_url(env_value('APP_URL', ''), PHP_URL_PATH), '/');
$requestPath = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if ($basePath !== '' && strpos($requestPath, $basePath) === 0) {
    $requestPath = substr($requestPath, strlen($basePath));
}

$routeKey = ($_SERVER['REQUEST_METHOD'] ?? 'GET') . ' ' . '/' . trim($requestPath, '/');
$routes = require $projectRoot . '/src/routes/api.php';
$handler = $routes[$routeKey] ?? null;

if ($handler === null) {
    http_response_code(404);
    echo json_encode(['error' => 'not_found']);
    exit;
}

try {
    $handler();
} catch (ApiException $exception) {
    http_response_code($exception->status);
    echo json_encode(['error' => $exception->errorCode]);
} catch (Throwable $exception) {
    error_log('API error: ' . get_class($exception) . ' at ' . $exception->getFile() . ':' . $exception->getLine());
    http_response_code(500);
    echo json_encode(['error' => 'internal_error']);
}
