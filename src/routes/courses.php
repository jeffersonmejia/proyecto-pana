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
        $auth=$buildAuth(); $db=database_connection(); $repo=new CourseRepository($db); $auth['courses']=new CourseController(new CourseService($repo,new \App\Repositories\CourseDetailsRepository($db),new CourseInputValidator(),new ActivityService(new ActivityRepository($db),new ActivityInputValidator()),new \App\Services\CourseCoverService($repo,new \App\Services\NextcloudStorageService()),new \App\Services\NextcloudStorageService())); return $auth;
    };
    $read=static fn(array $parts): array=>$authorize($parts,'courses.read');
    $manage=static fn(array $parts): array=>$authorizeAny($parts,['courses.manage.all','courses.manage']);
    $id=static function(): int { $value=filter_var($_GET['id']??null,FILTER_VALIDATE_INT); if($value===false||$value<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); return (int)$value; };
    return [
 'GET /api/courses/weekly-evidence'=>static function() use($build,$read): void { $p=$build(); $actor=$read($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->weeklyEvidence((int)$course,$actor); },
 'GET /api/courses/weekly-evidence/file'=>static function() use($build,$read,$id): void { $p=$build(); $actor=$read($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->downloadWeeklyEvidence((int)$course,$id(),$actor); },
 'POST /api/courses/weekly-evidence'=>static function() use($build,$read): void { $p=$build(); $actor=$read($p); $course=filter_var($_POST['course_id']??null,FILTER_VALIDATE_INT); $week=filter_var($_POST['week_number']??null,FILTER_VALIDATE_INT); if(!$course||!$week) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->uploadWeeklyEvidence((int)$course,(int)$week,$_FILES['file']??null,$actor); },
 'DELETE /api/courses/weekly-evidence'=>static function() use($build,$read,$id): void { $p=$build(); $actor=$read($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->deleteWeeklyEvidence((int)$course,$id(),$actor); },
 'GET /api/courses/tecnicos'=>static function() use($build,$manage): void { $p=$build(); $manage($p); $p['courses']->tecnicos(); },
        'GET /api/courses/participants'=>static function() use($build,$manage): void { $p=$build(); $manage($p); $p['courses']->participants(); },
        'PATCH /api/courses/tecnico-status'=>static function() use($build,$manage,$readJsonBody,$id): void { $p=$build(); $actor=$manage($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); $tecnico=$id(); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->setTecnicoStatus((int)$course,$tecnico,$readJsonBody(),$actor); },
        'PATCH /api/courses/participant-status'=>static function() use($build,$read,$readJsonBody,$id): void { $p=$build(); $actor=$read($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); $person=$id(); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->setParticipantStatus((int)$course,$person,$readJsonBody(),$actor); },
        'GET /api/courses/sections'=>static function() use($build,$read,$id): void { $p=$build(); $actor=$read($p); $p['courses']->sections($id(),$actor,(string)($_GET['attendance_date']??'')); },
        'POST /api/courses/tasks'=>static function() use($build,$manage,$readJsonBody): void { $p=$build(); $actor=$manage($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->createTask((int)$course,$readJsonBody(),$actor); },
        'PUT /api/courses/tasks'=>static function() use($build,$manage,$readJsonBody,$id): void { $p=$build(); $actor=$manage($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->updateTask((int)$course,$id(),$readJsonBody(),$actor); },
        'PATCH /api/courses/tasks/status'=>static function() use($build,$manage,$readJsonBody,$id): void { $p=$build(); $actor=$manage($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->setTaskStatus((int)$course,$id(),$readJsonBody(),$actor); },
        'DELETE /api/courses/tasks'=>static function() use($build,$manage,$id): void { $p=$build(); $actor=$manage($p); $course=filter_var($_GET['course_id']??null,FILTER_VALIDATE_INT); if(!$course||$course<1) throw new \App\Exceptions\ApiException(400,'invalid_id'); $p['courses']->deleteTask((int)$course,$id(),$actor); },
        'GET /api/courses'=>static function() use($build,$read,$id): void { $p=$build(); $actor=$read($p); if(isset($_GET['id'])) $p['courses']->show($id(),$actor); else $p['courses']->index($actor,($_GET['type']??'course')==='event'); },
        'GET /api/courses/available'=>static function() use($build,$authorizeAny): void { $p=$build(); $p['courses']->available($authorizeAny($p,['courses.read','courses.enroll']),($_GET['type']??'course')==='event'); },
        'POST /api/courses/enroll'=>static function() use($build,$authorizeAny,$id): void { $p=$build(); $p['courses']->enroll($id(),$authorizeAny($p,['courses.read','courses.enroll'])); },
        'POST /api/courses/cover'=>static function() use($build,$manage,$id): void { $p=$build(); $p['courses']->uploadCover($id(),$_FILES['file']??null,$manage($p)); },
        'POST /api/courses'=>static function() use($build,$manage,$readJsonBody): void { $p=$build(); $p['courses']->create($readJsonBody(),$manage($p)); },
        'PUT /api/courses'=>static function() use($build,$manage,$readJsonBody): void { $p=$build(); $p['courses']->update($readJsonBody(),$manage($p)); },
        'PATCH /api/courses/status'=>static function() use($build,$manage,$readJsonBody,$id): void { $p=$build(); $p['courses']->setStatus($id(),$readJsonBody(),$manage($p)); },
        'DELETE /api/courses'=>static function() use($build,$manage,$id): void { $p=$build(); $p['courses']->delete($id(),$manage($p)); },
    ];
};
