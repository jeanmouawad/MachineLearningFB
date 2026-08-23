<?php
declare(strict_types=1);

const TM_COOKIE = 'tm_sid';
const TM_IDLE_SECONDS = 1800;
const TM_ABSOLUTE_SECONDS = 28800;
const TM_MIN_CODE = 8;
const TM_PBKDF2_ITERS = 210000;
const TM_LOGIN_WINDOW = 600;
const TM_LOGIN_MAX = 5;

function tm_send_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header_remove('X-Powered-By');
}

function tm_fail(int $status, string $message): never
{
    http_response_code($status);
    tm_send_headers();
    echo json_encode(['error' => $message], JSON_UNESCAPED_SLASHES);
    exit;
}

function tm_ok(array $payload, int $status = 200): never
{
    http_response_code($status);
    tm_send_headers();
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function tm_require_method(string $method): void
{
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        tm_fail(405, 'Method not allowed.');
    }
}

function tm_read_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 200000) {
        tm_fail(413, 'Request too large.');
    }
    if ($raw === '') {
        return [];
    }
    $parsed = json_decode($raw, true);
    if (!is_array($parsed)) {
        tm_fail(400, 'Invalid request.');
    }
    return $parsed;
}

function tm_origin_ok(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $originHost = parse_url($origin, PHP_URL_HOST) ?: '';
    $originPort = parse_url($origin, PHP_URL_PORT);
    $expected = $originHost . ($originPort ? ':' . $originPort : '');
    $allowed = [$host];
    if (str_contains($host, ':')) {
        $allowed[] = explode(':', $host, 2)[0];
    }
    if (!in_array($expected, $allowed, true) && !in_array($originHost, $allowed, true)) {
        tm_fail(403, 'Forbidden.');
    }
}

function tm_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }
    return ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function tm_boot_session(): void
{
    $secure = tm_is_https();
    session_name(TM_COOKIE);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function tm_users_seed_path(): string
{
    return __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'users.json';
}

function tm_users_path(): string
{
    $privateDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'ai-private';
    $privateFile = $privateDir . DIRECTORY_SEPARATOR . 'users.json';
    $seed = tm_users_seed_path();
    if (is_dir($privateDir) || @mkdir($privateDir, 0700, true)) {
        if (!is_file($privateFile) && is_file($seed)) {
            @copy($seed, $privateFile);
            @chmod($privateFile, 0600);
        }
        if (is_file($privateFile) || is_writable($privateDir)) {
            return $privateFile;
        }
    }
    return $seed;
}

function tm_b64url_decode(string $value): string
{
    $b64 = strtr($value, '-_', '+/');
    $pad = strlen($b64) % 4;
    if ($pad) {
        $b64 .= str_repeat('=', 4 - $pad);
    }
    $out = base64_decode($b64, true);
    return $out === false ? '' : $out;
}

function tm_b64url_encode(string $bin): string
{
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function tm_hash_password(string $password): array
{
    $salt = random_bytes(16);
    $hash = hash_pbkdf2('sha256', $password, $salt, TM_PBKDF2_ITERS, 32, true);
    return [
        'algo' => 'pbkdf2-sha256',
        'iterations' => TM_PBKDF2_ITERS,
        'salt' => tm_b64url_encode($salt),
        'hash' => tm_b64url_encode($hash),
    ];
}

function tm_verify_password(string $password, mixed $stored): bool
{
    if (!is_array($stored) || ($stored['algo'] ?? '') !== 'pbkdf2-sha256') {
        return false;
    }
    $salt = tm_b64url_decode((string) ($stored['salt'] ?? ''));
    $expected = tm_b64url_decode((string) ($stored['hash'] ?? ''));
    $iters = (int) ($stored['iterations'] ?? TM_PBKDF2_ITERS);
    if ($salt === '' || $expected === '') {
        return false;
    }
    $actual = hash_pbkdf2('sha256', $password, $salt, $iters, strlen($expected), true);
    return hash_equals($expected, $actual);
}

function tm_read_store(): array
{
    $path = tm_users_path();
    if (!is_file($path)) {
        tm_fail(500, 'User store is not available.');
    }
    $handle = fopen($path, 'rb');
    if ($handle === false) {
        tm_fail(500, 'User store is not available.');
    }
    flock($handle, LOCK_SH);
    $raw = stream_get_contents($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    $parsed = json_decode($raw ?: '', true);
    if (!is_array($parsed) || ($parsed['version'] ?? null) !== 3 || !isset($parsed['users']) || !is_array($parsed['users'])) {
        tm_fail(500, 'User store is invalid.');
    }
    return $parsed;
}

function tm_write_store(array $store): void
{
    $path = tm_users_path();
    $dir = dirname($path);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) {
        tm_fail(500, 'Could not save users.');
    }
    $store['updatedAt'] = gmdate('c');
    $json = json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $tmp = $path . '.' . getmypid() . '.tmp';
    if (file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
        tm_fail(500, 'Could not save users.');
    }
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        tm_fail(500, 'Could not save users.');
    }
    @chmod($path, 0600);
}

function tm_public_user(array $user): array
{
    return [
        'id' => $user['id'],
        'username' => $user['username'],
        'role' => $user['role'],
        'active' => (bool) $user['active'],
        'createdAt' => $user['createdAt'],
        'updatedAt' => $user['updatedAt'],
    ];
}

function tm_norm(string $username): string
{
    return strtolower(trim($username));
}

function tm_client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function tm_rate_path(): string
{
    return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'tm-login-rate.json';
}

function tm_throttled(): bool
{
    $ip = tm_client_ip();
    $path = tm_rate_path();
    $data = [];
    if (is_file($path)) {
        $data = json_decode((string) file_get_contents($path), true) ?: [];
    }
    $now = time();
    $stamps = array_values(array_filter($data[$ip] ?? [], fn ($t) => ($now - (int) $t) < TM_LOGIN_WINDOW));
    $data[$ip] = $stamps;
    file_put_contents($path, json_encode($data), LOCK_EX);
    return count($stamps) >= TM_LOGIN_MAX;
}

function tm_record_fail(): void
{
    $ip = tm_client_ip();
    $path = tm_rate_path();
    $data = [];
    if (is_file($path)) {
        $data = json_decode((string) file_get_contents($path), true) ?: [];
    }
    $now = time();
    $stamps = array_values(array_filter($data[$ip] ?? [], fn ($t) => ($now - (int) $t) < TM_LOGIN_WINDOW));
    $stamps[] = $now;
    $data[$ip] = $stamps;
    file_put_contents($path, json_encode($data), LOCK_EX);
}

function tm_clear_fail(): void
{
    $ip = tm_client_ip();
    $path = tm_rate_path();
    $data = [];
    if (is_file($path)) {
        $data = json_decode((string) file_get_contents($path), true) ?: [];
    }
    unset($data[$ip]);
    file_put_contents($path, json_encode($data), LOCK_EX);
}

function tm_count_admins(array $users): int
{
    $n = 0;
    foreach ($users as $user) {
        if (($user['role'] ?? '') === 'admin' && !empty($user['active'])) {
            $n++;
        }
    }
    return $n;
}

function tm_require_user(): array
{
    tm_boot_session();
    $id = $_SESSION['uid'] ?? '';
    $role = $_SESSION['role'] ?? '';
    $seen = (int) ($_SESSION['lastSeen'] ?? 0);
    $created = (int) ($_SESSION['createdAt'] ?? 0);
    $now = time();
    if ($id === '' || ($role !== 'admin' && $role !== 'user')) {
        tm_fail(401, 'Not signed in.');
    }
    if ($seen && ($now - $seen) > TM_IDLE_SECONDS) {
        session_destroy();
        tm_fail(401, 'Not signed in.');
    }
    if ($created && ($now - $created) > TM_ABSOLUTE_SECONDS) {
        session_destroy();
        tm_fail(401, 'Not signed in.');
    }
    $_SESSION['lastSeen'] = $now;
    return [
        'id' => $id,
        'username' => (string) ($_SESSION['username'] ?? ''),
        'role' => $role,
    ];
}

function tm_require_admin(): array
{
    $user = tm_require_user();
    if ($user['role'] !== 'admin') {
        tm_fail(403, 'Forbidden.');
    }
    return $user;
}

function tm_new_id(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function tm_list_users(): array
{
    $users = array_map('tm_public_user', tm_read_store()['users']);
    usort($users, function ($a, $b) {
        if ($a['role'] !== $b['role']) {
            return $a['role'] === 'admin' ? -1 : 1;
        }
        return strcasecmp($a['username'], $b['username']);
    });
    return $users;
}
