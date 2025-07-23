<?php
function generateUID($length = 6) {
    $characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'; // Excludes: 0, O, I, L
    $uid = '';
    for ($i = 0; $i < $length; $i++) {
        $uid .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $uid;
}
?>
