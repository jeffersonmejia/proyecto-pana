<?php
declare(strict_types=1);
use App\Controllers\CourseController;
use App\Repositories\CourseRepository;
use App\Services\CourseService;
use App\Validators\CourseInputValidator;
use App\Repositories\ActivityRepository;
use App\Services\ActivityService;
use App\Validators\ActivityInputValidator;
return static function (callable $buildAuth,callable $authorize,callable $authorizeAny,callable $readJsonBody): array {
    $build=static function() use($buildAuth): array {
        $auth=$buildAuth(); $db=database_connection(); $auth['courses']=new CourseController(new CourseService(new CourseRepository($db),new \App\Repositories\CourseDetailsRepository($db),new CourseInputValidator(),new ActivityService(new ActivityRepository($db),new ActivityInputValidator()))); return $auth;
    };
    $read=static fn(array $parts): array=>$authorize($parts,'courses.read');
    $manage=static fn(array $parts): array=>$authorizeAny($parts,['courses.manage.all','courses.manage']);
    $id=static function(): int { $value=filter_var($_GET['id']??null,FILTER_VALIDATE_INT); if($value===false||$value<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); return (int)$value; };
    return [
        'GET /api/courses/tutors'=>static function() use($build,$manage): void { $p=$build(); $manage($p); $p['courses']->tutors(); },
        'GET /api/courses/participants'=>static function() use($build,$manage): void { $p=$build(); $manage($p); $p['courses']->participants(); },
        'GET /api/courses/sections'=>static function() use($build,$read,$id): void { $p=$build(); $actor=$read($p); $p['courses']->sections($id(),$actor,(string)($_GET['attendance_date']??'')); },
        'POST /api/courses/tasks'=>static function() use($build,$manage,$readJsonBody): void { $p=$build(); $actor=$manage($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->createTask((int)$course,$readJsonBody(),$actor); },
        'GET /api/courses'=>static function() use($build,$read,$id): void { $p=$build(); $actor=$read($p); if(isset($_GET['id'])) $p['courses']->show($id(),$actor); else $p['courses']->index($actor); },
        'POST /api/courses'=>static function() use($build,$manage,$readJsonBody): void { $p=$build(); $p['courses']->create($readJsonBody(),$manage($p)); },
        'PUT /api/courses'=>static function() use($build,$manage,$readJsonBody): void { $p=$build(); $p['courses']->update($readJsonBody(),$manage($p)); },
        'PATCH /api/courses/status'=>static function() use($build,$manage,$readJsonBody,$id): void { $p=$build(); $p['courses']->setStatus($id(),$readJsonBody(),$manage($p)); },
        'DELETE /api/courses'=>static function() use($build,$manage,$id): void { $p=$build(); $p['courses']->deactivate($id(),$manage($p)); },
    ];
};
