<?php
session_start();
require_once '../db.php';
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Walkabout Management</title>
    <link rel="stylesheet" href="../CSS/styles.css">
    <style>
        body {
            min-height: 100vh;
            background: linear-gradient(135deg, #007cba 0%, #005a87 100%);
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
            margin: 20px;
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .login-header h1 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 2em;
            font-weight: 300;
        }
        
        .login-header p {
            margin: 0;
            color: #666;
            font-size: 0.9em;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            box-sizing: border-box;
            font-size: 1em;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #007cba;
            box-shadow: 0 0 0 3px rgba(0, 124, 186, 0.1);
        }
        
        .btn-login {
            width: 100%;
            background: #007cba;
            color: white;
            padding: 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1.1em;
            font-weight: 600;
            transition: background 0.3s ease;
            margin-top: 10px;
        }
        
        .btn-login:hover {
            background: #005a87;
        }
        
        .error-message {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 500;
        }
        
        .login-footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e1e5e9;
        }
        
        .login-footer p {
            margin: 0;
            color: #666;
            font-size: 0.9em;
        }
        
        .brand-logo {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .brand-logo::before {
            content: "🌏";
            font-size: 3em;
            display: block;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="brand-logo"></div>
        
        <div class="login-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your Walkabout Management account</p>
        </div>

        <?php if (!empty($error)): ?>
            <div class="error-message">
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="login.php">
            <div class="form-group">
                <label for="email">📧 Email Address</label>
                <input type="email" id="email" name="email" required placeholder="Enter your email">
            </div>

            <div class="form-group">
                <label for="password">🔒 Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter your password">
            </div>

            <button type="submit" class="btn-login">Sign In</button>
        </form>

        <div class="login-footer">
            <p>Walkabout Management System</p>
        </div>
    </div>
</body>
</html>
