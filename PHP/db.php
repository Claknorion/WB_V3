<?php
function connectDB() {
    $host = "sql103.infinityfree.com";
    $db = "if0_38303256_testbase";
    $user = "if0_38303256";
    $pass = "RceSZG5S13hu";

    try {
        $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        die("Connection failed: " . $e->getMessage());
    }
}
?>
