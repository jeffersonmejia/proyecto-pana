<?php
declare(strict_types=1);

use App\Controllers\EvaluationController;
use App\Exceptions\ApiException;
use App\Repositories\EvaluationRepository;
use App\Services\EvaluationService;
use App\Validators\EvaluationInputValidator;

return static function (callable $buildAuth, callable $authorize, callable $authorizeAny, callable $readJsonBody): array {
    $build = static function () use ($buildAuth): array {
        $auth = $buildAuth();
        $auth['evaluations'] = new EvaluationController(new EvaluationService(
            new EvaluationRepository(database_connection()), new EvaluationInputValidator()
        ));
        return $auth;
    };
    $id = static function (): int {
        $value = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if ($value === false || $value < 1) throw new ApiException(400, 'invalid_id');
        return (int) $value;
    };
    $read = static function (array $components) use ($authorizeAny): array {
        return $authorizeAny($components, ['evaluations.read', 'evaluations.manage']);
    };

    return [
        'GET /api/evaluations/people' => static function () use ($build, $read): void {
            $components = $build(); $actor = $read($components);
            $components['evaluations']->people($_GET['type'] ?? '', $_GET['q'] ?? '', $actor);
        },
        'GET /api/evaluations/criteria' => static function () use ($build, $read): void {
            $components = $build(); $read($components); $components['evaluations']->criteria();
        },
        'POST /api/evaluations/criteria' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $authorize($components, 'evaluations.criteria.manage');
            $components['evaluations']->createCriterion($readJsonBody());
        },
        'PUT /api/evaluations/criteria' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $authorize($components, 'evaluations.criteria.manage');
            $components['evaluations']->updateCriterion($readJsonBody());
        },
        'GET /api/evaluations' => static function () use ($build, $read, $id): void {
            $components = $build(); $actor = $read($components);
            if (isset($_GET['id'])) $components['evaluations']->show($id(), $actor);
            else $components['evaluations']->index(array_merge($_GET, ['_scope' => $actor]));
        },
        'POST /api/evaluations' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $actor = $authorize($components, 'evaluations.manage');
            $components['evaluations']->create($readJsonBody(), $actor);
        },
        'PUT /api/evaluations' => static function () use ($build, $authorize, $readJsonBody): void {
            $components = $build(); $actor = $authorize($components, 'evaluations.manage');
            $components['evaluations']->update($readJsonBody(), $actor);
        },
    ];
};
