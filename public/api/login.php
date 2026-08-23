<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
tm_origin_ok();
tm_require_method('POST');

if (tm_throttled()) {
    tm_fail(429, 'Too many failed attempts. Wait a few minutes and try again.');
}

$body = tm_read_json();
$username = trim((string) ($body['username'] ?? ''));
$code = (string) ($body['accessCode'] ?? '');
if ($username === '' || $code === '') {
    tm_record_fail();
    tm_fail(401, 'Invalid username or access code.');
}

$store = tm_read_store();
$found = null;
foreach ($store['users'] as $user) {
    if (tm_norm((string) $user['username']) === tm_norm($username)) {
        $found = $user;
        break;
    }
}

if (!$found || empty($found['active']) || !tm_verify_password($code, $found['password'] ?? null)) {
    tm_record_fail();
    tm_fail(401, 'Invalid username or access code.');
}

tm_clear_fail();
tm_boot_session();
session_regenerate_id(true);
$_SESSION['uid'] = $found['id'];
$_SESSION['username'] = $found['username'];
$_SESSION['role'] = $found['role'];
$_SESSION['createdAt'] = time();
$_SESSION['lastSeen'] = time();

tm_ok(['user' => tm_public_user($found)]);
