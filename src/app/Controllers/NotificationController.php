<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Services\NotificationService;
final class NotificationController
{
    public function __construct(private NotificationService $notifications) {}
    public function index(array $user): void { echo json_encode($this->notifications->mine((int)$user['id'])); }
    public function read(int $id, array $user): void { $this->notifications->read($id, (int)$user['id']); echo json_encode(['status'=>'updated']); }
    public function readAll(array $user): void { $this->notifications->readAll((int)$user['id']); echo json_encode(['status'=>'updated']); }
}
