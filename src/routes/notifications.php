<?php
declare(strict_types=1);
use App\Controllers\NotificationController;
use App\Repositories\NotificationRepository;
use App\Services\NotificationService;
use App\Exceptions\ApiException;
return static function (callable $buildAuth, callable $authorize): array {
    $build = static function () use ($buildAuth): array {
        $auth = $buildAuth(); $auth['notifications'] = new NotificationController(new NotificationService(new NotificationRepository(database_connection()))); return $auth;
    };
    $id = static function (): int { $value=filter_var($_GET['id']??null,FILTER_VALIDATE_INT); if($value===false||$value<1) throw new ApiException(400,'invalid_notification'); return (int)$value; };
    return [
        'GET /api/notifications'=>static function() use($build,$authorize): void { $p=$build(); $user=$authorize($p,'notifications.read'); $p['notifications']->index($user); },
        'PATCH /api/notifications/read'=>static function() use($build,$authorize,$id): void { $p=$build(); $user=$authorize($p,'notifications.read'); $p['notifications']->read($id(),$user); },
        'POST /api/notifications/read-all'=>static function() use($build,$authorize): void { $p=$build(); $user=$authorize($p,'notifications.read'); $p['notifications']->readAll($user); },
    ];
};
