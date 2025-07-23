<?php
session_start();
require_once '../PHP/db.php';
$pdo = connectDB();

// Check login & role
if (!isset($_SESSION['user'])) {
    header("Location: ../PHP/login.php");
    exit();
}
$userSession = $_SESSION['user'];
$userRole = $userSession['Role'] ?? 'customer';

if ($userRole !== 'admin') {
    echo "Access denied. Only admins can delete users.";
    exit();
}

// Get username to delete
$username = $_GET['username'] ?? null;
if (!$username) {
    echo "No username specified.";
    exit();
}

// Prevent admin from deleting themselves accidentally
if ($username === $userSession['Username']) {
    echo "You cannot delete your own user.";
    exit();
}

// Delete user after confirmation
if (isset($_GET['confirm']) && $_GET['confirm'] === 'yes') {
    $sql = "DELETE FROM Users WHERE Username = :username";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['username' => $username]);

    header("Location: user_list.php");
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Delete User: <?= htmlspecialchars($username) ?></title>
    <link rel="stylesheet" href="../CSS/styles.css" />
</head>
<body>
    <h1>Delete User: <?= htmlspecialchars($username) ?></h1>
    <p>Are you sure you want to delete this user? This action cannot be undone.</p>
    <a href="user_delete.php?username=<?= urlencode($username) ?>&confirm=yes">Yes, delete user</a> |
    <a href="user_list.php">Cancel</a>
</body>
</html>
