<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
tm_origin_ok();
$session = tm_require_admin();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$id = $_GET['id'] ?? '';
$bulk = ($_GET['bulk'] ?? '') === '1';

if ($method === 'GET') {
    tm_ok(['users' => tm_list_users()]);
}

if ($method === 'POST' && $bulk) {
    $body = tm_read_json();
    $count = (int) ($body['count'] ?? 0);
    if ($count < 1 || $count > 200) {
        tm_fail(400, 'Choose between 1 and 200 accounts.');
    }
    $prefix = preg_replace('/\s+/', '', trim((string) ($body['prefix'] ?? 'user'))) ?: 'user';
    $startAt = max(1, (int) ($body['startAt'] ?? 1));
    $pad = max(3, strlen((string) ($startAt + $count - 1)));
    $store = tm_read_store();
    $taken = [];
    foreach ($store['users'] as $user) {
        $taken[tm_norm((string) $user['username'])] = true;
    }
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    $generated = [];
    $n = $startAt;
    $now = gmdate('c');
    while (count($generated) < $count) {
        if ($n > $startAt + $count + 5000) {
            tm_fail(400, 'Could not find enough unused usernames.');
        }
        $username = $prefix . str_pad((string) $n, $pad, '0', STR_PAD_LEFT);
        $n++;
        if (isset($taken[tm_norm($username)])) {
            continue;
        }
        $taken[tm_norm($username)] = true;
        $bytes = random_bytes(12);
        $code = '';
        for ($i = 0; $i < 12; $i++) {
            $code .= $alphabet[ord($bytes[$i]) % strlen($alphabet)];
        }
        $store['users'][] = [
            'id' => tm_new_id(),
            'username' => $username,
            'password' => tm_hash_password($code),
            'role' => 'user',
            'active' => true,
            'createdAt' => $now,
            'updatedAt' => $now,
        ];
        $generated[] = ['username' => $username, 'accessCode' => $code, 'role' => 'user'];
    }
    tm_write_store($store);
    tm_ok(['generated' => $generated, 'users' => tm_list_users()]);
}

if ($method === 'POST') {
    $body = tm_read_json();
    $username = trim((string) ($body['username'] ?? ''));
    $code = (string) ($body['accessCode'] ?? '');
    $role = ($body['role'] ?? 'user') === 'admin' ? 'admin' : 'user';
    if ($username === '') {
        tm_fail(400, 'Username is required.');
    }
    if (strlen($code) < TM_MIN_CODE) {
        tm_fail(400, 'Access code must be at least ' . TM_MIN_CODE . ' characters.');
    }
    $store = tm_read_store();
    foreach ($store['users'] as $user) {
        if (tm_norm((string) $user['username']) === tm_norm($username)) {
            tm_fail(400, 'That username is already in use.');
        }
    }
    $now = gmdate('c');
    $user = [
        'id' => tm_new_id(),
        'username' => $username,
        'password' => tm_hash_password($code),
        'role' => $role,
        'active' => ($body['active'] ?? true) !== false,
        'createdAt' => $now,
        'updatedAt' => $now,
    ];
    $store['users'][] = $user;
    tm_write_store($store);
    tm_ok(['user' => tm_public_user($user), 'users' => tm_list_users()]);
}

if ($method === 'PATCH') {
    $body = tm_read_json();
    $id = $id !== '' ? $id : (string) ($body['id'] ?? '');
    $store = tm_read_store();
    $found = null;
    foreach ($store['users'] as &$user) {
        if ($user['id'] === $id) {
            $found = &$user;
            break;
        }
    }
    if (!$found) {
        tm_fail(400, 'User not found.');
    }
    if (array_key_exists('username', $body)) {
        $username = trim((string) $body['username']);
        if ($username === '') {
            tm_fail(400, 'Username is required.');
        }
        foreach ($store['users'] as $other) {
            if ($other['id'] !== $id && tm_norm((string) $other['username']) === tm_norm($username)) {
                tm_fail(400, 'That username is already in use.');
            }
        }
        $found['username'] = $username;
    }
    if (!empty($body['accessCode'])) {
        if (strlen((string) $body['accessCode']) < TM_MIN_CODE) {
            tm_fail(400, 'Access code must be at least ' . TM_MIN_CODE . ' characters.');
        }
        $found['password'] = tm_hash_password((string) $body['accessCode']);
    }
    if (($body['role'] ?? '') === 'admin' || ($body['role'] ?? '') === 'user') {
        $found['role'] = $body['role'];
    }
    if (array_key_exists('active', $body)) {
        $found['active'] = (bool) $body['active'];
    }
    $found['updatedAt'] = gmdate('c');
    if (tm_count_admins($store['users']) < 1) {
        tm_fail(400, 'At least one active admin is required.');
    }
    tm_write_store($store);
    tm_ok(['user' => tm_public_user($found), 'users' => tm_list_users()]);
}

if ($method === 'DELETE') {
    if ($id === '') {
        tm_fail(400, 'User not found.');
    }
    if ($id === $session['id']) {
        tm_fail(400, 'You cannot remove your own account.');
    }
    $store = tm_read_store();
    $next = [];
    $removed = false;
    foreach ($store['users'] as $user) {
        if ($user['id'] === $id) {
            $removed = true;
            continue;
        }
        $next[] = $user;
    }
    if (!$removed) {
        tm_fail(400, 'User not found.');
    }
    if (tm_count_admins($next) < 1) {
        tm_fail(400, 'At least one active admin is required.');
    }
    $store['users'] = $next;
    tm_write_store($store);
    tm_ok(['users' => tm_list_users()]);
}

tm_fail(405, 'Method not allowed.');
