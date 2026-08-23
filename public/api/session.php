<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
tm_origin_ok();
tm_require_method('GET');
$user = tm_require_user();
tm_ok(['user' => $user]);
