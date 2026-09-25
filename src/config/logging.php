<?php
declare(strict_types=1);

function pana_log(string $channel, string $message, array $context = []): void
{
    $root = dirname(__DIR__, 2);
    $directory = $root . DIRECTORY_SEPARATOR . '.logs';
    if (!is_dir($directory)) {
        mkdir($directory, 0775, true);
    }

    $safeContext = $context;
    foreach (['password', 'password_hash', 'token', 'authorization', 'secret'] as $key) {
        unset($safeContext[$key]);
    }
    $file = $directory . DIRECTORY_SEPARATOR . $channel . '-' . date('Y-m-d') . '.log';
    $lines = [sprintf('[%s] [%s] %s', date('Y-m-d H:i:s'), strtoupper($channel), $message)];
    foreach ($safeContext as $key => $value) {
        if (is_array($value) || is_object($value)) {
            $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $lines[] = '  ' . $key . ': ' . (string) $value;
    }
    $lines[] = str_repeat('-', 80);
    error_log(implode(PHP_EOL, $lines) . PHP_EOL, 3, $file);
}
