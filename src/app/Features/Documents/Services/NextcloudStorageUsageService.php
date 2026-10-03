<?php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;

final class NextcloudStorageUsageService
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

    public function summary(): array
    {
        $root = $this->items('');
        $quota = $root[0] ?? [];
        $ocs = $this->ocsQuota();
        $available = $ocs['free'] ?? (isset($quota['quota_available']) ? (int) $quota['quota_available'] : -1);
        $used = $ocs['used'] ?? max(0, (int) ($quota['quota_used'] ?? 0));
        $total = $ocs['total'] ?? ($available < 0 ? null : $used + $available);
        $backups = $this->folderBytes('Respaldos');
        return ['quota_total_bytes' => $total, 'quota_used_bytes' => $used, 'backups_bytes' => $backups,
            'files_bytes' => max(0, $this->folderBytes('') - $backups)];
    }

    private function folderBytes(string $path): int
    {
        $total = 0;
        foreach ($this->items($path) as $item) {
            if ($item['self']) continue;
            $total += $item['folder'] ? $this->folderBytes(trim($path . '/' . $item['name'], '/')) : $item['bytes'];
        }
        return $total;
    }

    private function items(string $path): array
    {
        $xml = '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/>'
            . '<d:resourcetype/><d:quota-used-bytes/><d:quota-available-bytes/></d:prop></d:propfind>';
        $result = $this->request($path, $xml);
        if ($result['status'] === 404) return [];
        if ($result['status'] !== 207) $this->fail($result['status']);
        $document = simplexml_load_string($result['body'], \SimpleXMLElement::class, LIBXML_NONET);
        if ($document === false) throw new ApiException(502, 'nextcloud_storage_unavailable');
        $document->registerXPathNamespace('d', 'DAV:');
        $items = [];
        foreach ($document->xpath('/d:multistatus/d:response') ?: [] as $response) {
            $href = (string) ($response->xpath('./d:href')[0] ?? '');
            $name = basename(rtrim(rawurldecode((string) parse_url($href, PHP_URL_PATH)), '/'));
            $folder = (bool) $response->xpath('.//d:resourcetype/d:collection');
            $items[] = ['name' => $name, 'folder' => $folder, 'self' => $href === '' || $name === basename($path ?: $this->root),
                'bytes' => (int) ($response->xpath('.//d:getcontentlength')[0] ?? 0),
                'quota_used' => (int) ($response->xpath('.//d:quota-used-bytes')[0] ?? 0),
                'quota_available' => (int) ($response->xpath('.//d:quota-available-bytes')[0] ?? -1)];
        }
        return $items;
    }

    private function request(string $path, string $body): array
    {
        $this->assertAvailable();
        $segments = array_map('rawurlencode', explode('/', trim($path, '/')));
        $remote = array_merge(explode('/', $this->root), $segments);
        $url = $this->base . '/remote.php/dav/files/' . rawurlencode($this->username) . '/' . implode('/', array_map('rawurlencode', $remote));
        $handle = curl_init($url);
        curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER => true, CURLOPT_USERPWD => $this->username . ':' . $this->password,
            CURLOPT_HTTPAUTH => CURLAUTH_BASIC, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 60, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_CUSTOMREQUEST => 'PROPFIND', CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => ['Depth: 1', 'Content-Type: application/xml; charset=utf-8']]);
        $response = curl_exec($handle); $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE); curl_close($handle);
        if ($response === false) throw new ApiException(502, 'nextcloud_storage_unavailable');
        return ['status' => $status, 'body' => (string) $response];
    }

    private function ocsQuota(): array
    {
        $this->assertAvailable();
        $handle = curl_init($this->base . '/ocs/v1.php/cloud/users/' . rawurlencode($this->username) . '?format=json');
        curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER => true, CURLOPT_USERPWD => $this->username . ':' . $this->password,
            CURLOPT_HTTPAUTH => CURLAUTH_BASIC, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 30, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_HTTPHEADER => ['OCS-APIRequest: true', 'Accept: application/json']]);
        $response = curl_exec($handle); $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE); curl_close($handle);
        if ($response === false || $status < 200 || $status >= 300) return [];
        $decoded = json_decode((string) $response, true); $quota = $decoded['ocs']['data']['quota'] ?? null;
        if (is_numeric($quota)) return ['used' => null, 'free' => null, 'total' => (int) $quota];
        if (!is_array($quota)) return [];
        $used = is_numeric($quota['used'] ?? null) ? (int) $quota['used'] : null;
        $free = is_numeric($quota['free'] ?? null) ? (int) $quota['free'] : null;
        $total = is_numeric($quota['total'] ?? null) ? (int) $quota['total'] : (($used !== null && $free !== null) ? $used + $free : null);
        if ($used === null && $free === null && $total === null) return [];
        return ['used' => $used, 'free' => $free, 'total' => $total];
    }

    private function assertAvailable(): void
    {
        $parts = parse_url($this->base) ?: []; $scheme = $parts['scheme'] ?? ''; $host = strtolower($parts['host'] ?? '');
        $local = ['localhost', '127.0.0.1', '::1', 'host.docker.internal', 'nextcloud'];
        if (!function_exists('curl_init') || !function_exists('simplexml_load_string') || !$this->username || !$this->password
            || !in_array($scheme, ['http', 'https'], true) || !$host || ($scheme === 'http' && !in_array($host, $local, true))
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment']) || !$this->root || str_contains($this->root, '..'))
            throw new ApiException(503, 'nextcloud_storage_not_configured');
    }

    private function fail(int $status): void
    {
        if ($status === 401 || $status === 403) throw new ApiException(503, 'nextcloud_credentials_rejected');
        throw new ApiException(502, 'nextcloud_storage_unavailable');
    }
}
