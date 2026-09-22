<?php
declare(strict_types=1);

$apiRoot = dirname(__DIR__, 2) . '/pana-api';
putenv('PANA_API_ROOT=' . $apiRoot);
require $apiRoot . '/public/index.php';
