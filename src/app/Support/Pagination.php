<?php
declare(strict_types=1);

namespace App\Support;

use PDO;

final class Pagination
{
    public const PAGE_SIZE = 5;

    public static function page(mixed $value): int
    {
        $page = filter_var($value, FILTER_VALIDATE_INT);
        return $page === false || $page < 1 ? 1 : min($page, 1000000);
    }

    public static function fetch(PDO $db, string $sql, string $countSql, array $params, int $page): array
    {
        $count = $db->prepare($countSql);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $query = $db->prepare($sql . ' LIMIT ' . self::PAGE_SIZE . ' OFFSET ' . (($page - 1) * self::PAGE_SIZE));
        $query->execute($params);
        return ['items' => $query->fetchAll(), 'pagination' => [
            'page' => $page, 'page_size' => self::PAGE_SIZE, 'total' => $total,
            'pages' => max(1, (int) ceil($total / self::PAGE_SIZE)),
        ]];
    }
}
