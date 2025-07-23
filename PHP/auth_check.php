<?php
session_start();
if (!isset($_SESSION["user"])) {
    header("Location: ../PHP/login.php");
    exit();
}
?>
