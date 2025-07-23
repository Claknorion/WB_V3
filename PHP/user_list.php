<?php
session_start();
require_once '../PHP/db.php';
$pdo = connectDB();

// Check login
if (!isset($_SESSION['user'])) {
    header("Location: ../PHP/login.php");
    exit();
}
$userSession = $_SESSION['user'];
$userRole = $userSession['Role'] ?? 'customer';

// Fetch all users for admins, or limit if needed later
$stmt = $pdo->query("SELECT Username, Email, Phone, Showname, Role FROM Users ORDER BY Username");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>User List</title>
    <link rel="stylesheet" href="../CSS/styles.css" />
    <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #eee; }
        a.button {
            padding: 4px 10px;
            background: #007BFF;
            color: white;
            text-decoration: none;
            border-radius: 3px;
        }
        a.button.delete {
            background: #dc3545;
        }
        a.button:hover {
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <h1>User List</h1>
    <p>Logged in as: <?= htmlspecialchars($userSession['Username']) ?> (Role: <?= htmlspecialchars($userRole) ?>)</p>

    <?php if ($userRole === 'admin'): ?>
        <p><a href="user_create.php" class="button">Create New User</a></p>
    <?php endif; ?>

    <table>
        <thead>
            <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Show Name</th>
                <th>Role</th>
                <?php if ($userRole === 'admin'): ?>
                    <th>Edit</th>
                    <th>Delete</th>
                <?php elseif ($userRole === 'employee'): ?>
                    <th>Edit</th>
                <?php endif; ?>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($users as $user): ?>
                <tr>
                    <td><?= htmlspecialchars($user['Username']) ?></td>
                    <td><?= htmlspecialchars($user['Email']) ?></td>
                    <td><?= htmlspecialchars($user['Phone']) ?></td>
                    <td><?= htmlspecialchars($user['Showname']) ?></td>
                    <td><?= htmlspecialchars($user['Role']) ?></td>

                    <?php if ($userRole === 'admin'): ?>
                        <td><a href="user_edit.php?username=<?= urlencode($user['Username']) ?>" class="button">Edit</a></td>
                        <td>
                            <?php if ($user['Username'] !== $userSession['Username']): ?>
                                <a href="user_delete.php?username=<?= urlencode($user['Username']) ?>" class="button delete" onclick="return confirm('Are you sure you want to delete <?= htmlspecialchars($user['Username']) ?>?')">Delete</a>
                            <?php else: ?>
                                <!-- Can't delete self -->
                                &mdash;
                            <?php endif; ?>
                        </td>
                    <?php elseif ($userRole === 'employee'): ?>
                        <td><a href="user_edit.php?username=<?= urlencode($user['Username']) ?>" class="button">Edit</a></td>
                    <?php endif; ?>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</body>
</html>
