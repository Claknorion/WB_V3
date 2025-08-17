<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();

if (!isset($_SESSION['user']) || ($_SESSION['user']['Role'] !== 'admin' && $_SESSION['user']['Role'] !== 'employee')) {
    header("Location: login.html");
    exit();
}

require '../db.php';
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create User - Walkabout Management</title>
    <link rel="stylesheet" href="../CSS/styles.css">
    <style>
        body {
            overflow-y: auto !important;
            min-height: 100vh;
            background: #f5f5f5;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .page-header {
            background: white;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .page-header h1 {
            margin: 0;
            color: #333;
            font-size: 2em;
            font-weight: 300;
        }
        
        .form-container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .form-group {
            flex: 1;
            min-width: 200px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 1em;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #007cba;
            box-shadow: 0 0 0 3px rgba(0, 124, 186, 0.1);
        }
        
        .btn {
            background: #007cba;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 500;
            transition: background 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn:hover {
            background: #005a87;
        }
        
        .btn-secondary {
            background: #6c757d;
            margin-right: 15px;
        }
        
        .btn-secondary:hover {
            background: #545b62;
        }
        
        .button-group {
            display: flex;
            gap: 15px;
            margin-top: 30px;
            flex-wrap: wrap;
        }
        
        .message {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 6px;
            font-weight: 500;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .form-note {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
            font-style: italic;
        }
        
        .role-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #007cba;
        }
        
        .role-info h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        
        .role-info ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .role-info li {
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="page-header">
            <h1>➕ Create New User</h1>
        </div>

        <?php if ($message): ?>
            <div class="message <?= strpos($message, 'successfully') !== false ? 'success' : 'error' ?>">
                <?= htmlspecialchars($message) ?>
            </div>
        <?php endif; ?>

        <div class="form-container">
            <div class="role-info">
                <h4>👤 User Role Permissions:</h4>
                <ul>
                    <li><strong>Customer:</strong> Basic access for bookings and trip management</li>
                    <?php if ($_SESSION['user']['Role'] === 'admin'): ?>
                        <li><strong>Employee:</strong> Can manage customers and basic hotel operations</li>
                        <li><strong>Admin:</strong> Full system access and user management</li>
                    <?php endif; ?>
                </ul>
            </div>

            <form method="post" action="">
                <div class="form-row">
                    <div class="form-group">
                        <label for="email">📧 Email Address *</label>
                        <input type="email" id="email" name="email" required>
                        <div class="form-note">This will be used as the login username</div>
                    </div>
                    <div class="form-group">
                        <label for="password">🔒 Password *</label>
                        <input type="password" id="password" name="password" required minlength="6">
                        <div class="form-note">Minimum 6 characters</div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="showname">👋 Display Name *</label>
                        <input type="text" id="showname" name="showname" required>
                        <div class="form-note">Name shown in the system</div>
                    </div>
                    <div class="form-group">
                        <label for="role">🎭 User Role *</label>
                        <select id="role" name="role" required>
                            <option value="customer">Customer</option>
                            <?php if ($_SESSION['user']['Role'] === 'admin'): ?>
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            <?php endif; ?>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="voornaam">First Name *</label>
                        <input type="text" id="voornaam" name="voornaam" required>
                    </div>
                    <div class="form-group">
                        <label for="achternaam">Last Name *</label>
                        <input type="text" id="achternaam" name="achternaam" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="tuss1">Middle Name 1</label>
                        <input type="text" id="tuss1" name="tuss1">
                        <div class="form-note">Optional</div>
                    </div>
                    <div class="form-group">
                        <label for="tuss2">Middle Name 2</label>
                        <input type="text" id="tuss2" name="tuss2">
                        <div class="form-note">Optional</div>
                    </div>
                </div>

                <div class="button-group">
                    <a href="../dashboard.php" class="btn btn-secondary">← Back to Dashboard</a>
                    <button type="submit" class="btn">✅ Create User</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
