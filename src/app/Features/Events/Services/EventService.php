<?php
declare(strict_types=1);
namespace App\Services;
use App\Exceptions\ApiException;
use App\Repositories\EventRepository;
final class EventService
{
    public function __construct(private EventRepository $events) {}
    public function list(array $actor): array { return ['events'=>$this->events->list($actor)]; }
    public function create(array $input,array $actor): array
    { $data=$this->data($input);return ['id'=>$this->events->create($data,(int)$actor['id'])]; }
    public function enroll(int $id,array $input,array $actor): void
    { try{$this->events->enroll($id,$input,(int)$actor['id']);}catch(\RuntimeException $e){$map=['event_unavailable'=>[404,'event_not_available'],'event_full'=>[409,'event_full'],'person_not_found'=>[422,'person_not_found'],'invalid_registration'=>[422,'invalid_event_registration']];[$s,$c]=$map[$e->getMessage()]??[500,'event_enrollment_failed'];throw new ApiException($s,$c);} }
    private function data(array $input): array
    { $name=trim((string)($input['name']??''));$description=trim((string)($input['description']??''));$date=(string)($input['event_date']??'');$time=(string)($input['event_time']??'');$location=trim((string)($input['location']??''));$meeting=trim((string)($input['meeting_point']??''));$requirements=trim((string)($input['requirements']??''));$max=filter_var($input['max_participants']??null,FILTER_VALIDATE_INT);if($name===''||strlen($name)>150||strlen($description)>1000||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$date)||!checkdate((int)substr($date,5,2),(int)substr($date,8,2),(int)substr($date,0,4))||!preg_match('/^\d{2}:\d{2}$/',$time)||$location===''||strlen($location)>255||strlen($meeting)>255||strlen($requirements)>1000||$max===false||$max<1)throw new ApiException(422,'invalid_event');return ['name'=>$name,'description'=>$description?:null,'event_date'=>$date,'event_time'=>$time,'location'=>$location,'meeting_point'=>$meeting?:null,'requirements'=>$requirements?:null,'status'=>'active','max_participants'=>$max]; }
}
