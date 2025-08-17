<?php
session_start();
require_once '../db.php';
$pdo = connectDB();

// Check login & role
if (!isset($_SESSION['user'])) {
    header("Location: ../auth/login.php");
    exit();
}
$userSession = $_SESSION['user'];
$userRole = $userSession['Role'] ?? 'customer';

if ($userRole !== 'admin') {
    echo "Access denied. Only admins can edit users.";
    exit();
}

// Get username from query string
$username = $_GET['username'] ?? null;
if (!$username) {
    echo "No username specified.";
    exit();
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['Email'] ?? '';
    $phone = $_POST['Phone'] ?? '';
    $showname = $_POST['Showname'] ?? '';
    $role = $_POST['Role'] ?? 'customer'; // New role field
    $password = $_POST['Password'] ?? '';

    // If password field not empty, hash the new password
    if (!empty($password)) {
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $sql = "UPDATE Users SET Email = :email, Phone = :phone, Showname = :showname, Role = :role, Password = :password WHERE Username = :username";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'email' => $email,
            'phone' => $phone,
            'showname' => $showname,
            'role' => $role,
            'password' => $hashed_password,
            'username' => $username
        ]);
    } else {
        // No password change
        $sql = "UPDATE Users SET Email = :email, Phone = :phone, Showname = :showname, Role = :role WHERE Username = :username";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'email' => $email,
            'phone' => $phone,
            'showname' => $showname,
            'role' => $role,
            'username' => $username
        ]);
    }

    header("Location: user_list.php");
    exit();
}

// Fetch user details for editing
$sql = "SELECT Username, Email, Phone, Showname, Role FROM Users WHERE Username = :username LIMIT 1";
$stmt = $pdo->prepare($sql);
$stmt->execute(['username' => $username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo "User not found.";
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Edit User: <?= htmlspecialchars($user['Username']) ?></title>
    <link rel="stylesheet" href="../CSS/styles.css" />
</head>
<body>
    <h1>Edit User: <?= htmlspecialchars($user['Username']) ?></h1>
    <form method="POST" action="user_edit.php?username=<?= urlencode($user['Username']) ?>">
        <label>Email:<br />
            <input type="email" name="Email" value="<?= htmlspecialchars($user['Email']) ?>" required />
        </label><br /><br />

        <label>Phone:<br />
            <input type="text" name="Phone" value="<?= htmlspecialchars($user['Phone']) ?>" />
        </label><br /><br />

        <label>Show Name:<br />
            <input type="text" name="Showname" value="<?= htmlspecialchars($user['Showname']) ?>" />
        </label><br /><br />

        <label>Role:<br />
            <select name="Role" required>
                <option value="admin" <?= $user['Role'] === 'admin' ? 'selected' : '' ?>>Admin</option>
                <option value="employee" <?= $user['Role'] === 'employee' ? 'selected' : '' ?>>Employee</option>
                <option value="customer" <?= $user['Role'] === 'customer' ? 'selected' : '' ?>>Customer</option>
            </select>
        </label><br /><br />

        <label>Password (leave blank to keep current):<br />
            <input type="password" name="Password" />
        </label><br /><br />

        <button type="submit">Save</button>
        <a href="user_list.php">Cancel</a>
    </form>
</body>
</html>
