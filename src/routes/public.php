<?php
declare(strict_types=1);

use App\Exceptions\ApiException;
use App\Repositories\CourseRepository;
use App\Services\CourseCoverService;
use App\Services\NextcloudStorageService;

return [
    'GET /api/public/courses/welcome' => static function (): void {
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) throw new ApiException(400, 'invalid_id');
        $service = new CourseCoverService(new CourseRepository(database_connection()), new NextcloudStorageService());
        echo json_encode(['course' => $service->publicWelcome((int) $id)]);
    },
    'GET /api/public/courses/cover' => static function (): void {
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) throw new ApiException(400, 'invalid_id');
        $service = new CourseCoverService(new CourseRepository(database_connection()), new NextcloudStorageService());
        $cover = $service->cover((int) $id); $file = $cover['file'];
        header('Content-Type: ' . $cover['course']['cover_mime_type']); header('Cache-Control: public, max-age=86400, stale-while-revalidate=604800');
        header('Content-Length: ' . $file['size']); header('X-Content-Type-Options: nosniff');
        try { fpassthru($file['stream']); } finally { fclose($file['stream']); }
    },
];
