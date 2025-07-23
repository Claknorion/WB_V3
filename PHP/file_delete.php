<?php
session_start();
require_once '../PHP/db.php';
$pdo = connectDB();

// Check login and role
if (!isset($_SESSION['user'])) {
    header("Location: login.php");
    exit();
}
$userRole = $_SESSION['user']['Role'] ?? 'customer';
if (!in_array($userRole, ['admin'])) {
    echo "Access denied.";
    exit();
}

// Get UID
$uid = $_GET['uid'] ?? null;
if (!$uid) {
    echo "No UID specified.";
    exit();
}

// Confirm deletion (POST request)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $pdo->prepare("DELETE FROM File_info WHERE UID = :uid");
    $stmt->execute(['uid' => $uid]);

    // Optionally: delete linked records from other tables (e.g. Persoon_info)
    // $pdo->prepare("DELETE FROM Persoon_info WHERE File_UID = :uid")->execute(['uid' => $uid]);

    header("Location: file_list.php");
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Delete File</title>
    <link rel="stylesheet" href="../CSS/styles.css">
</head>
<body>
    <h2>Are you sure you want to delete this file?</h2>
    <form method="POST" action="file_delete.php?uid=<?= urlencode($uid) ?>">
        <button type="submit" style="color: red;">Yes, Delete</button>
        <a href="file_list.php">Cancel</a>
    </form>
</body>
</html>
