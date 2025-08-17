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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Walkabout Management</title>
    <link rel="stylesheet" href="../CSS/styles.css">
    <style>
        body {
            overflow-y: auto !important;
            min-height: 100vh;
            background: #f5f5f5;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .dashboard-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .dashboard-header {
            background: white;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .dashboard-header h1 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 2.5em;
            font-weight: 300;
        }
        
        .user-info {
            color: #666;
            font-size: 1.1em;
        }
        
        .role-badge {
            display: inline-block;
            padding: 4px 12px;
            background: #007cba;
            color: white;
            border-radius: 12px;
            font-size: 0.9em;
            font-weight: 500;
            margin-left: 8px;
        }
        
        .navigation-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .nav-section {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .nav-section h3 {
            margin: 0 0 20px 0;
            color: #333;
            font-size: 1.3em;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
        }
        
        .nav-links {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .nav-links li {
            margin-bottom: 10px;
        }
        
        .nav-links a {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: #f8f9fa;
            color: #333;
            text-decoration: none;
            border-radius: 6px;
            transition: all 0.3s ease;
            border-left: 4px solid #007cba;
        }
        
        .nav-links a:hover {
            background: #007cba;
            color: white;
            transform: translateX(5px);
        }
        
        .nav-icon {
            margin-right: 12px;
            font-size: 1.2em;
        }
        
        .quick-stats {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .quick-stats h3 {
            margin: 0 0 20px 0;
            color: #333;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .stat-card {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 6px;
            border-top: 4px solid #007cba;
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #007cba;
            display: block;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        .logout-section {
            text-align: center;
            padding: 20px;
        }
        
        .btn-logout {
            background: #dc3545;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 6px;
            text-decoration: none;
            display: inline-block;
            transition: background 0.3s ease;
            font-size: 1.1em;
        }
        
        .btn-logout:hover {
            background: #c82333;
            color: white;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="dashboard-header">
            <h1>Walkabout Management Dashboard</h1>
            <div class="user-info">
                Welcome back, <strong><?= htmlspecialchars($username) ?></strong>
                <span class="role-badge"><?= htmlspecialchars(ucfirst($role)) ?></span>
            </div>
        </div>

        <div class="navigation-grid">
            <?php if (in_array($role, ['employee', 'admin'])): ?>
            <div class="nav-section">
                <h3>🏨 Product Management</h3>
                <ul class="nav-links">
                    <li><a href="../PHP/hotel_management.php"><span class="nav-icon">🏢</span>Hotel Management</a></li>
                    <li><a href="../PHP/room_management.php"><span class="nav-icon">🛏️</span>Room Management</a></li>
                    <li><a href="../PHP/tour_management.php"><span class="nav-icon">🎯</span>Tour Management</a></li>
                    <li><a href="../PHP/tour_operator_management.php"><span class="nav-icon">🚌</span>Tour Operators</a></li>
                    <li><a href="../PHP/inbounder_management.php"><span class="nav-icon">🏢</span>Inbounder Companies</a></li>
                    <li><a href="../PHP/file_list.php"><span class="nav-icon">📁</span>File Management</a></li>
                </ul>
            </div>
            <?php endif; ?>

            <?php if (in_array($role, ['employee', 'admin'])): ?>
            <div class="nav-section">
                <h3>👥 User Management</h3>
                <ul class="nav-links">
                    <li><a href="user_create.php"><span class="nav-icon">➕</span>Create User</a></li>
                    <li><a href="../PHP/user_list.php"><span class="nav-icon">📋</span>User List</a></li>
                </ul>
            </div>
            <?php endif; ?>

            <?php if ($role === 'admin'): ?>
            <div class="nav-section">
                <h3>⚙️ Administration</h3>
                <ul class="nav-links">
                    <li><a href="../PHP/admin_panel.php"><span class="nav-icon">🔧</span>Admin Panel</a></li>
                    <li><a href="../PHP/system_settings.php"><span class="nav-icon">⚙️</span>System Settings</a></li>
                </ul>
            </div>
            <?php endif; ?>
        </div>

        <div class="quick-stats">
            <h3>📊 Quick Stats</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">--</span>
                    <div class="stat-label">Total Hotels</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">--</span>
                    <div class="stat-label">Active Rooms</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">--</span>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">--</span>
                    <div class="stat-label">Active Trips</div>
                </div>
            </div>
        </div>

        <div class="logout-section">
            <a href="../PHP/logout.php" class="btn-logout">🚪 Log Out</a>
        </div>
    </div>
</body>
</html>
