<?php
declare(strict_types=1);
use App\Controllers\EventController;
use App\Repositories\EventRepository;
use App\Services\EventService;
use App\Exceptions\ApiException;
return static function(callable $buildAuth,callable $authorize,callable $authorizeAny,callable $readJsonBody):array{
    $build=static function()use($buildAuth):array{$auth=$buildAuth();$auth['events']=new EventController(new EventService(new EventRepository(database_connection())));return $auth;};
    $id=static function():int{$value=filter_var($_GET['id']??null,FILTER_VALIDATE_INT);if($value===false||$value<1)throw new ApiException(400,'invalid_id');return(int)$value;};
    return ['GET /api/events'=>static function()use($build,$authorize):void{$p=$build();$actor=$authorize($p,'events.read');$p['events']->list($actor);},
        'POST /api/events'=>static function()use($build,$authorize,$readJsonBody):void{$p=$build();$actor=$authorizeAny($p,['events.manage']);$p['events']->create($readJsonBody(),$actor);},
        'POST /api/events/enroll'=>static function()use($build,$authorize,$id,$readJsonBody):void{$p=$build();$actor=$authorize($p,'events.enroll');$p['events']->enroll($id(),$readJsonBody(),$actor);}];
};
