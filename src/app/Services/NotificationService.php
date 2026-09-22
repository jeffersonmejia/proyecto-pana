<?php
declare(strict_types=1);
namespace App\Services;
use App\Exceptions\ApiException;
use App\Repositories\NotificationRepository;
final class NotificationService
{
    public function __construct(private NotificationRepository $notifications) {}
    public function mine(int $userId): array { return ['items'=>$this->notifications->list($userId),'unread'=>$this->notifications->unread($userId)]; }
    public function read(int $id, int $userId): void
    { if ($id < 1) throw new ApiException(400, 'invalid_notification'); $this->notifications->markRead($id, $userId); }
    public function readAll(int $userId): void { $this->notifications->markAllRead($userId); }
    public function activityCreated(int $userId, string $title, int $activityId): void
    { $this->notifications->create($userId, 'activity.created', 'Actividad creada', $title, '/actividades?id='.$activityId); }
}
