<?php
declare(strict_types=1);
namespace App\Repositories;
use PDO;
final class NotificationRepository
{
    public function __construct(private PDO $connection) {}
    public function list(int $userId, int $limit = 30): array
    {
        $query = $this->connection->prepare('SELECT id,type,title,message,action_url,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT ?');
        $query->bindValue(1, $userId, PDO::PARAM_INT); $query->bindValue(2, $limit, PDO::PARAM_INT); $query->execute();
        return $query->fetchAll();
    }
    public function unread(int $userId): int
    {
        $query = $this->connection->prepare('SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL');
        $query->execute([$userId]); return (int) $query->fetchColumn();
    }
    public function markRead(int $id, int $userId): void
    {
        $query = $this->connection->prepare('UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND user_id=?');
        $query->execute([$id, $userId]);
    }
    public function markAllRead(int $userId): void
    {
        $query = $this->connection->prepare('UPDATE notifications SET read_at=NOW() WHERE user_id=? AND read_at IS NULL');
        $query->execute([$userId]);
    }
    public function create(int $userId, string $type, string $title, string $message, ?string $url): void
    {
        $query = $this->connection->prepare('INSERT INTO notifications (user_id,type,title,message,action_url) VALUES (?,?,?,?,?)');
        $query->execute([$userId, $type, $title, $message, $url]);
    }
}
