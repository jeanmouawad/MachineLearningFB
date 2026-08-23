<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
tm_origin_ok();
tm_require_method('POST');
$session = tm_require_user();
$body = tm_read_json();
$current = (string) ($body['currentCode'] ?? '');
$next = (string) ($body['newCode'] ?? '');
$confirm = (string) ($body['confirmCode'] ?? '');
if ($current === '' || $next === '' || $confirm === '') {
    tm_fail(400, 'Fill in all access code fields.');
}
if ($next !== $confirm) {
    tm_fail(400, 'New access code and confirmation do not match.');
}
if (strlen($next) < TM_MIN_CODE) {
    tm_fail(400, 'New access code must be at least ' . TM_MIN_CODE . ' characters.');
}
if ($next === $current) {
    tm_fail(400, 'Choose a new access code that is different from the current one.');
}

$store = tm_read_store();
foreach ($store['users'] as &$user) {
    if ($user['id'] === $session['id']) {
        if (!tm_verify_password($current, $user['password'] ?? null)) {
            tm_fail(400, 'Current access code is incorrect.');
        }
        $user['password'] = tm_hash_password($next);
        $user['updatedAt'] = gmdate('c');
        tm_write_store($store);
        tm_ok(['ok' => true]);
    }
}
tm_fail(400, 'Could not update the access code.');
