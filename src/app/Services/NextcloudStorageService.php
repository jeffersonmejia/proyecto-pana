<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;

final class NextcloudStorageService
{
    private string $base;
    private string $username;
    private string $password;
    private string $root;

    public function __construct()
    {
        $this->base = rtrim((string) env_value('NEXTCLOUD_BASE_URL', ''), '/');
        $this->username = (string) env_value('NEXTCLOUD_USERNAME', '');
        $this->password = (string) env_value('NEXTCLOUD_APP_PASSWORD', '');
        $this->root = trim((string) env_value('NEXTCLOUD_ROOT_FOLDER', 'PANA'), '/');
    }

    public function assertAvailable(): void
    {
        $parts = parse_url($this->base) ?: [];
        $scheme = $parts['scheme'] ?? '';
        $host = strtolower($parts['host'] ?? '');
        $localHosts = ['localhost', '127.0.0.1', '::1', 'host.docker.internal', 'nextcloud'];
        if (!function_exists('curl_init') || !function_exists('simplexml_load_string') || !$this->username || !$this->password
            || !in_array($scheme, ['http', 'https'], true) || !$host
            || ($scheme === 'http' && !in_array($host, $localHosts, true))
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
            || !$this->root || str_contains($this->root, '..')) {
            throw new ApiException(503, 'nextcloud_storage_not_configured');
        }
    }

    public function uploadFile(string $source, string $relativePath): void
    {
        $stream = fopen($source, 'rb');
        if ($stream === false) throw new ApiException(500, 'storage_unavailable');
        try { $this->uploadStream($stream, $relativePath); } finally { fclose($stream); }
    }

    public function uploadStream($stream, string $relativePath): void
    {
        $this->assertAvailable();
        if (!is_resource($stream) || fseek($stream, 0) !== 0) throw new ApiException(500, 'storage_unavailable');
        $this->makeDirectories(dirname($relativePath));
        $size = (int) (fstat($stream)['size'] ?? 0);
        $result = $this->request('PUT', $relativePath, $stream, $size);
        if (!in_array($result['status'], [201, 204], true)) $this->fail($result['status']);
    }

    public function download(string $relativePath): array
    {
        $this->assertAvailable();
        $result = $this->request('GET', $relativePath, null, 0, true);
        if ($result['status'] !== 200) { fclose($result['stream']); $this->fail($result['status']); }
        rewind($result['stream']);
        return ['stream' => $result['stream'], 'size' => (int) (fstat($result['stream'])['size'] ?? 0)];
    }

    public function delete(string $relativePath): void
    {
        $this->assertAvailable();
        $result = $this->request('DELETE', $relativePath);
        if (!in_array($result['status'], [200, 202, 204], true)) $this->fail($result['status']);
    }

    public function listSqlFiles(string $relativePath): array
    {
        $this->assertAvailable();
        $this->makeDirectories($relativePath);
        $xml = '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getlastmodified/>'
            . '<d:getcontentlength/><d:resourcetype/></d:prop></d:propfind>';
        $result = $this->request('PROPFIND', $relativePath, null, 0, false, ['Depth: 1'], $xml);
        if ($result['status'] !== 207) $this->fail($result['status']);
        $document = simplexml_load_string($result['body'], \SimpleXMLElement::class, LIBXML_NONET);
        if ($document === false) throw new ApiException(502, 'nextcloud_storage_unavailable');
        $document->registerXPathNamespace('d', 'DAV:');
        $files = [];
        foreach ($document->xpath('/d:multistatus/d:response') ?: [] as $response) {
            $href = $response->xpath('./d:href')[0] ?? null;
            $name = $href ? basename(rawurldecode((string) parse_url((string) $href, PHP_URL_PATH))) : '';
            $folders = $response->xpath('.//d:resourcetype/d:collection');
            if ($name === '' || $name === basename($relativePath) || $folders
                || !preg_match('/^pana_backup_[0-9]{8}_[0-9]{6}(?:_[a-f0-9]{6})?\.sql$/i', $name)) continue;
            $bytes = $response->xpath('.//d:getcontentlength')[0] ?? null;
            $modified = $response->xpath('.//d:getlastmodified')[0] ?? null;
            $time = $modified ? (strtotime((string) $modified) ?: 0) : 0;
            $files[] = ['name' => $name, 'bytes' => (int) $bytes, 'time' => $time,
                'date' => $time ? date('Y-m-d H:i', $time) : ''];
        }
        usort($files, static fn (array $a, array $b): int => $b['time'] <=> $a['time']);
        return array_slice($files, 0, 20);
    }

    private function makeDirectories(string $path): void
    {
        $rootResult = $this->request('MKCOL', '');
        if (!in_array($rootResult['status'], [201, 405], true)) $this->fail($rootResult['status']);
        $segments = explode('/', str_replace('\\', '/', $path));
        $current = [];
        foreach ($segments as $segment) {
            if ($segment === '' || $segment === '.') continue;
            if ($segment === '..') throw new ApiException(422, 'invalid_storage_path');
            $current[] = $segment;
            $result = $this->request('MKCOL', implode('/', $current));
            if (!in_array($result['status'], [201, 405], true)) $this->fail($result['status']);
        }
    }

    private function request(string $method, string $path, $upload = null, int $size = 0,
        bool $captureFile = false, array $headers = [], ?string $body = null): array
    {
        $this->assertAvailable();
        $segments = array_map('rawurlencode', explode('/', trim($path, '/')));
        if (in_array('..', $segments, true) || in_array('.', $segments, true)) throw new ApiException(422, 'invalid_storage_path');
        $remote = array_merge(explode('/', $this->root), $segments);
        $url = $this->base . '/remote.php/dav/files/' . rawurlencode($this->username) . '/' . implode('/', array_map('rawurlencode', $remote));
        $output = $captureFile ? fopen('php://temp/maxmemory:8388608', 'w+b') : null;
        $handle = curl_init($url);
        $options = [CURLOPT_RETURNTRANSFER => $output === null, CURLOPT_USERPWD => $this->username . ':' . $this->password,
            CURLOPT_HTTPAUTH => CURLAUTH_BASIC, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 300,
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => $headers];
        if ($method === 'PUT') { $options[CURLOPT_UPLOAD] = true; $options[CURLOPT_INFILE] = $upload; $options[CURLOPT_INFILESIZE] = $size; }
        elseif ($method === 'PROPFIND') { $options[CURLOPT_CUSTOMREQUEST] = $method; $options[CURLOPT_POSTFIELDS] = $body; $options[CURLOPT_HTTPHEADER][] = 'Content-Type: application/xml; charset=utf-8'; }
        elseif ($method !== 'GET') $options[CURLOPT_CUSTOMREQUEST] = $method;
        if ($output !== null) $options[CURLOPT_FILE] = $output;
        curl_setopt_array($handle, $options);
        $response = curl_exec($handle); $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $ok = $response !== false; curl_close($handle);
        if (!$ok) { if (is_resource($output)) fclose($output); throw new ApiException(502, 'nextcloud_storage_unavailable'); }
        return ['status' => $status, 'body' => (string) $response, 'stream' => $output];
    }

    private function fail(int $status): void
    {
        if ($status === 404) throw new ApiException(404, 'storage_file_not_found');
        if ($status === 401 || $status === 403) throw new ApiException(503, 'nextcloud_credentials_rejected');
        throw new ApiException(502, 'nextcloud_storage_unavailable');
    }
}
