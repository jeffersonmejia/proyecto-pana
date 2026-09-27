<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Services\EventService;
final class EventController
{
    public function __construct(private EventService $events) {}
    public function list(array $actor): void { echo json_encode($this->events->list($actor)); }
    public function create(array $input,array $actor): void { http_response_code(201);echo json_encode($this->events->create($input,$actor)); }
    public function enroll(int $id,array $input,array $actor): void { $this->events->enroll($id,$input,$actor);echo json_encode(['status'=>'enrolled']); }
}
