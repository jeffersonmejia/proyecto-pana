<?php
declare(strict_types=1);

use App\Controllers\PeopleController;
use App\Exceptions\ApiException;
use App\Repositories\PeopleRepository;
use App\Repositories\PersonHistoryRepository;
use App\Services\PeopleService;
use App\Validators\PersonInputValidator;

return static function (callable $buildAuth, callable $authorize, callable $authorizeAny, callable $readJsonBody): array {
    $build = static function () use ($buildAuth): array {
        $auth = $buildAuth();
        $connection = database_connection();
        $auth['people'] = new PeopleController(new PeopleService(
            new PeopleRepository($connection), new PersonHistoryRepository($connection), new PersonInputValidator()
        ));
        return $auth;
    };
    $id = static function (): int {
        $value = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if ($value === false || $value < 1) throw new ApiException(400, 'invalid_id');
        return (int) $value;
    };

    return [
        'GET /api/people' => static function () use ($build, $authorizeAny, $id): void {
            $components = $build();
            $authorizeAny($components, ['people.read', 'people.manage']);
            if (isset($_GET['id'])) $components['people']->show($id());
            else $components['people']->index($_GET);
        },
        'POST /api/people' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build();
            $actor = $authorize($components, 'people.manage');
            $components['people']->create($readJsonBody(), (int) $actor['id']);
        },
        'PUT /api/people' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build();
            $actor = $authorize($components, 'people.manage');
            $components['people']->update($readJsonBody(), (int) $actor['id']);
        },
        'DELETE /api/people' => static function () use ($build, $authorize, $id): void {
            $components = $build();
            $authorize($components, 'people.manage');
            $components['people']->delete($id());
        },
        'GET /api/people/history' => static function () use ($build, $authorizeAny, $id): void {
            $components = $build();
            $authorizeAny($components, ['people.read', 'people.manage']);
            $components['people']->history($id());
        },
        'POST /api/people/history' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build();
            $actor = $authorize($components, 'people.manage');
            $input = $readJsonBody();
            $components['people']->addNote((int) ($input['person_id'] ?? 0), $input['details'] ?? null, (int) $actor['id']);
        },
    ];
};
