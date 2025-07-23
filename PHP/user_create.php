<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();

if (!isset($_SESSION['user']) || ($_SESSION['user']['Role'] !== 'admin' && $_SESSION['user']['Role'] !== 'employee')) {
    header("Location: login.html");
    exit();
}

require '../PHP/db.php';
$pdo = connectDB();

$message = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $email = $_POST["email"] ?? '';
    $password = $_POST["password"] ?? '';
    $role = $_POST["role"] ?? '';
    $showname = $_POST["showname"] ?? '';
    $voornaam = $_POST["voornaam"] ?? '';
    $tuss1 = $_POST["tuss1"] ?? '';
    $tuss2 = $_POST["tuss2"] ?? '';
    $achternaam = $_POST["achternaam"] ?? '';

    if ($email && $password && $role) {
        // Only allow employees to create 'customer' accounts
        if ($_SESSION['user']['Role'] === 'employee' && $role !== 'customer') {
            $message = "You are only allowed to create customers.";
        } else {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            $stmt = $pdo->prepare("INSERT INTO Users (Email, Password, Showname, Role, Voornaam, Tuss1, Tuss2, Achternaam) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            if ($stmt->execute([$email, $hashedPassword, $showname, $role, $voornaam, $tuss1, $tuss2, $achternaam])) {
                $message = "User created successfully!";
            } else {
                $message = "Failed to create user. Please try again.";
            }
        }
    } else {
        $message = "All fields are required.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Create User</title>
    <link rel="stylesheet" href="../CSS/styles.css">
</head>
<body>
    <h1>Create New User</h1>

    <?php if ($message): ?>
        <p style="color: <?= strpos($message, 'successfully') !== false ? 'green' : 'red' ?>;">
            <?= htmlspecialchars($message) ?>
        </p>
    <?php endif; ?>

    <form method="post" action="">
        <label>Email:<br>
            <input type="text" name="email" required>
        </label><br><br>

        <label>Password:<br>
            <input type="password" name="password" required>
        </label><br><br>

        <label>Showname:<br>
            <input type="text" name="showname" required>
        </label><br><br>
        
        <label>Voornaam:<br>
            <input type="text" name="voornaam" required>
        </label><br><br>
        <label>Tussenvoegsel1:<br>
            <input type="text" name="tuss1">
        </label><br><br>   
        <label>Tussenvoegsel2:<br>
            <input type="text" name="tuss2">
        </label><br><br>   
        <label>Achternaam:<br>
            <input type="text" name="achternaam" required>
        </label><br><br>   

        <label>Role:<br>
            <select name="role" required>
                <option value="customer">Customer</option>
                <?php if ($_SESSION['user']['Role'] === 'admin'): ?>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                <?php endif; ?>
            </select>
        </label><br><br>

        <button type="submit">Create User</button>
    </form>

    <p><a href="dashboard.php">← Back to Dashboard</a></p>
</body>
</html>
