<?php
session_start();

if (!isset($_SESSION['user'])) {
    header("Location: ./PHP/login.php");
    exit();
}

$username = $_SESSION['user']['Username'];
$role = $_SESSION['user']['Role'];
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dashboard</title>
    <link rel="stylesheet" href="../CSS/styles.css">
</head>
<body>
    <h1>Welcome to the Dashboard</h1>
    <p>You are logged in as <strong><?= htmlspecialchars($username) ?></strong> (<?= htmlspecialchars($role) ?>)</p>

    <hr>

    <h2>Navigation</h2>
    <ul>
        <?php if (in_array($role, ['employee', 'admin'])): ?>
            <li><a href="user_create.php">Create User</a></li>
            <li><a href="../PHP/user_list.php">User List</a></li>
        <?php endif; ?>

        <?php if (in_array($role, ['employee', 'admin'])): ?>
            <li><a href="../PHP/file_list.php">File List</a></li>
        <?php endif; ?>

        <?php if ($role === 'admin'): ?>
            <li><a href="../PHP/admin_panel.php">Admin Panel (placeholder)</a></li>
        <?php endif; ?>

        <li><a href="../PHP/logout.php">Log Out</a></li>
    </ul>
</body>
</html>
