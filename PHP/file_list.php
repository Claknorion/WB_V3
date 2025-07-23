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
$userEmail = $userSession['Username'] ?? '';

// Build SQL based on role
if ($userRole === 'admin' || $userRole === 'employee') {
    // Show all files
    $sql = "SELECT UID, Zoeknaam, Email, Datum_start, Bestemming, Status FROM File_info ORDER BY Datum_start DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
} else {
    // Customer: show only files linked to their email
    $sql = "SELECT UID, Zoeknaam, Email, Datum_start, Bestemming, Status FROM File_info WHERE Email = :email ORDER BY Datum_start DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['email' => $userEmail]);
}

$files = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>File List</title>
    <link rel="stylesheet" href="../CSS/styles.css" />
</head>
<body>
    <h1>File List</h1>
    <table border="1" cellpadding="5" cellspacing="0">
        <thead>
            <tr>
                <th>UID</th>
                <th>Zoeknaam</th>
                <th>Email</th>
                <th>Start Date</th>
                <th>Bestemming</th>
                <th>Status</th>
                <?php if ($userRole === 'admin' || $userRole === 'employee'): ?>
                    <th>Edit</th>
                <?php endif; ?>
                <?php if ($userRole === 'admin'): ?>
                    <th>Delete</th>
                <?php endif; ?>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($files as $file): ?>
            <tr>
                <td><?= htmlspecialchars($file['UID']) ?></td>
                <td><?= htmlspecialchars($file['Zoeknaam']) ?></td>
                <td><?= htmlspecialchars($file['Email']) ?></td>
                <td><?= htmlspecialchars($file['Datum_start']) ?></td>
                <td><?= htmlspecialchars($file['Bestemming']) ?></td>
                <td><?= htmlspecialchars($file['Status']) ?></td>
                <?php if ($userRole === 'admin' || $userRole === 'employee'): ?>
                    <td><a href="file_edit.php?uid=<?= urlencode($file['UID']) ?>">Edit</a></td>
                <?php endif; ?>
                <?php if ($userRole === 'admin'): ?>
                    <td><a href="file_delete.php?uid=<?= urlencode($file['UID']) ?>" onclick="return confirm('Are you sure you want to delete this file?');">Delete</a></td>
                <?php endif; ?>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</body>
</html>
