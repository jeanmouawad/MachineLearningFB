<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
tm_origin_ok();
tm_require_method('POST');
tm_boot_session();
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'],
        'secure' => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'] ?? 'Strict',
    ]);
}
session_destroy();
tm_ok(['ok' => true]);
