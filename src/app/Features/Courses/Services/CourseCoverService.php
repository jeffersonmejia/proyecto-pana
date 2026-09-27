<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\CourseRepository;

final class CourseCoverService
{
    private const TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    public function __construct(private CourseRepository $courses, private NextcloudStorageService $storage)
    {
    }

    public function upload(int $courseId, mixed $file, array $actor): void
    {
        if (!$this->courses->find($courseId, $actor)) throw new ApiException(404, 'course_not_found');
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
            || !is_uploaded_file($file['tmp_name'] ?? '')) throw new ApiException(422, 'invalid_upload');
        if ((int) $file['size'] > 8 * 1024 * 1024) throw new ApiException(413, 'file_too_large');
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!is_string($mime) || !isset(self::TYPES[$mime])) throw new ApiException(415, 'unsupported_cover_type');
        $original = $this->name($file['name'] ?? '');
        if ($original === '') throw new ApiException(422, 'invalid_file_name');
        $stored = bin2hex(random_bytes(16)) . '.' . self::TYPES[$mime];
        $path = $this->path($courseId, $stored);
        $this->storage->uploadFile($file['tmp_name'], $path);
        try { $this->courses->setCover($courseId, $stored, $original, $mime); }
        catch (\Throwable $error) { try { $this->storage->delete($path); } catch (\Throwable) { } throw $error; }
    }

    public function publicWelcome(int $courseId): array
    {
        return $this->courses->publicWelcome($courseId) ?? throw new ApiException(404, 'course_not_found');
    }

    public function cover(int $courseId): array
    {
        $course = $this->publicWelcome($courseId);
        if (!$course['cover_available']) throw new ApiException(404, 'course_cover_not_found');
        return ['course' => $course, 'file' => $this->storage->download($this->path($courseId, $course['cover_stored_name']))];
    }

    private function path(int $courseId, string $name): string
    {
        return "Documentos/Cursos/{$courseId}/" . basename($name);
    }

    private function name(mixed $name): string
    {
        if (!is_string($name)) return '';
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', basename(str_replace('\\', '/', $name))) ?? '';
        return mb_substr(trim($name), 0, 255);
    }
}
