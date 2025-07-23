<?php
session_start();
session_destroy();
header("Location: ../PHP/login.php");
exit();
?>
