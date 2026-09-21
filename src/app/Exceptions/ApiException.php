<?php
declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class ApiException extends RuntimeException
{
    public function __construct(
        public int $status,
        public string $errorCode,
        string $message = ''
    ) {
        parent::__construct($message ?: $errorCode);
    }
}
