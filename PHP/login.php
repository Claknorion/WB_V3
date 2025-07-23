<?php
session_start();
require_once '../PHP/db.php';
$pdo = connectDB();

// Handle login POST request
$error = '';
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $email = $_POST["email"] ?? '';
    $password = $_POST["password"] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM Users WHERE Email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user["Password"])) {
        $_SESSION['user'] = [
            'Username' => $user['Email'],
            'Role' => $user['Role'],
            'Showname' => $user['Showname'],
            'Fullname' => $user['Username'],
        ];
        header("Location: dashboard.php");
        exit();
    } else {
        $error = "Invalid login credentials.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Login</title>
    <link rel="stylesheet" href="../CSS/styles.css">
</head>
<body>
    <div class="container">
        <h2>Login</h2>

        <?php if (!empty($error)): ?>
            <div class="error" style="color: red;"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST" action="login.php">
            <label for="email">Email:</label>
            <input type="email" name="email" required><br>

            <label for="password">Password:</label>
            <input type="password" name="password" required><br>

            <button type="submit">Login</button>
        </form>
    </div>
</body>
</html>
