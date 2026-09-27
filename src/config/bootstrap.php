<?php
declare(strict_types=1);

$projectRoot = dirname(__DIR__, 2);
$environmentFile = $projectRoot . '/.env';

if (is_file($environmentFile)) {
    foreach (file($environmentFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }

        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if ($name === '' || getenv($name) !== false) {
            continue;
        }

        if (strlen($value) > 1 && (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === "'" && substr($value, -1) === "'"))) {
            $value = substr($value, 1, -1);
        }

        putenv($name . '=' . $value);
        $_ENV[$name] = $value;
    }
}

function env_value(string $name, ?string $default = null): ?string
{
    $value = getenv($name);
    return $value === false ? $default : $value;
}

date_default_timezone_set(env_value('APP_TIMEZONE', 'UTC') ?? 'UTC');

require_once __DIR__ . '/logging.php';

$composerAutoloader = $projectRoot . '/vendor/autoload.php';
if (is_file($composerAutoloader)) {
    require_once $composerAutoloader;
}

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $appRoot = dirname(__DIR__) . '/app';
    $directFile = $appRoot . '/' . str_replace('\\', '/', $relativeClass) . '.php';
    if (is_file($directFile)) {
        require $directFile;
        return;
    }

    $classFile = basename(str_replace('\\', '/', $relativeClass)) . '.php';
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($appRoot, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($files as $file) {
        if ($file->getFilename() === $classFile) {
            require $file->getPathname();
            return;
        }
    }
});

require_once __DIR__ . '/database.php';
