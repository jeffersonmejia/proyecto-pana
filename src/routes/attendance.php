<?php
declare(strict_types=1);

use App\Controllers\AttendanceController;
use App\Exceptions\ApiException;
use App\Repositories\AttendanceRepository;
use App\Services\AttendanceService;
use App\Validators\AttendanceInputValidator;

return static function (callable $buildAuth, callable $authorize, callable $authorizeAny, callable $readJsonBody): array {
    $build = static function () use ($buildAuth): array {
        $auth = $buildAuth();
        $auth['attendance'] = new AttendanceController(new AttendanceService(
            new AttendanceRepository(database_connection()), new AttendanceInputValidator()
        ));
        return $auth;
    };
    $id = static function (): int {
        $value = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if ($value === false || $value < 1) throw new ApiException(400, 'invalid_id');
        return (int) $value;
    };
    $read = static function (array $components) use ($authorizeAny): array {
        return $authorizeAny($components, ['attendance.read', 'attendance.manage']);
    };

    return [
        'GET /api/attendance/participants' => static function () use ($build, $read): void {
            $components = $build(); $actor = $read($components);
            $components['attendance']->participants($_GET['q'] ?? '', $actor);
        },
        'GET /api/attendance/history' => static function () use ($build, $read, $id): void {
            $components = $build(); $actor = $read($components);
            $components['attendance']->history($id(), $actor);
        },
        'GET /api/attendance' => static function () use ($build, $read, $id): void {
            $components = $build(); $actor = $read($components);
            if (isset($_GET['id'])) $components['attendance']->show($id(), $actor);
            else $components['attendance']->index(array_merge($_GET, ['_scope' => $actor]));
        },
        'POST /api/attendance' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $actor = $authorize($components, 'attendance.manage');
            $components['attendance']->create($readJsonBody(), $actor);
        },
        'POST /api/attendance/check-out' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $actor = $authorize($components, 'attendance.manage');
            $components['attendance']->checkout($readJsonBody(), $actor);
        },
        'PUT /api/attendance' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $actor = $authorize($components, 'attendance.manage');
            $components['attendance']->update($readJsonBody(), $actor);
        },
    ];
};
