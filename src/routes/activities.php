<?php
declare(strict_types=1);

use App\Controllers\ActivityController;
use App\Exceptions\ApiException;
use App\Repositories\ActivityRepository;
use App\Services\ActivityService;
use App\Validators\ActivityInputValidator;

return static function (callable $buildAuth, callable $authorize, callable $authorizeAny, callable $readJsonBody): array {
    $build = static function () use ($buildAuth): array {
        $auth = $buildAuth();
        $auth['activities'] = new ActivityController(new ActivityService(
            new ActivityRepository(database_connection()), new ActivityInputValidator()
        ));
        return $auth;
    };
    $id = static function (): int {
        $value = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if ($value === false || $value < 1) throw new ApiException(400, 'invalid_id');
        return (int) $value;
    };
    $read = static function (array $components) use ($authorizeAny): void {
        $authorizeAny($components, ['activities.read', 'activities.manage']);
    };

    return [
        'GET /api/activities/participants' => static function () use ($build, $read): void {
            $components = $build(); $read($components);
            $components['activities']->participants($_GET['q'] ?? '');
        },
        'GET /api/activities/logs' => static function () use ($build, $read, $id): void {
            $components = $build(); $read($components);
            $components['activities']->logs($id());
        },
        'POST /api/activities/logs' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $actor = $authorize($components, 'activities.manage');
            $components['activities']->addObservation($readJsonBody(), (int) $actor['id']);
        },
        'GET /api/activities' => static function () use ($build, $read, $id): void {
            $components = $build(); $read($components);
            if (isset($_GET['id'])) $components['activities']->show($id());
            else $components['activities']->index($_GET);
        },
        'POST /api/activities' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $actor = $authorize($components, 'activities.manage');
            $components['activities']->create($readJsonBody(), (int) $actor['id']);
        },
        'PUT /api/activities' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $actor = $authorize($components, 'activities.manage');
            $components['activities']->update($readJsonBody(), (int) $actor['id']);
        },
    ];
};
