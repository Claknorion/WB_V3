<?php
session_start();
require_once '../db.php';
$pdo = connectDB();

// Check login
if (!isset($_SESSION['user'])) {
    header("Location: ../auth/login.php");
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User List - Walkabout Management</title>
    <link rel="stylesheet" href="../CSS/styles.css" />
    <style>
        body {
            overflow-y: auto !important;
            min-height: 100vh;
            background: #f5f5f5;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .page-header {
            background: white;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .page-header h1 {
            margin: 0;
            color: #333;
            font-size: 2em;
            font-weight: 300;
        }
        
        .user-info {
            color: #666;
            font-size: 0.9em;
        }
        
        .role-badge {
            display: inline-block;
            padding: 4px 12px;
            background: #007cba;
            color: white;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
            margin-left: 8px;
        }
        
        .action-bar {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .btn {
            background: #007cba;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: background 0.3s ease;
            font-size: 0.9em;
        }
        
        .btn:hover {
            background: #005a87;
            color: white;
        }
        
        .btn-danger {
            background: #dc3545;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
        
        .btn-back {
            background: #6c757d;
        }
        
        .btn-back:hover {
            background: #545b62;
        }
        
        .table-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .users-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }
        
        .users-table th,
        .users-table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .users-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #dee2e6;
        }
        
        .users-table tbody tr:hover {
            background: #f8f9fa;
        }
        
        .users-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .action-buttons {
            display: flex;
            gap: 8px;
        }
        
        .btn-sm {
            padding: 6px 12px;
            font-size: 0.8em;
            border-radius: 3px;
        }
        
        .user-role {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
        }
        
        .role-admin {
            background: #dc3545;
            color: white;
        }
        
        .role-employee {
            background: #007cba;
            color: white;
        }
        
        .role-customer {
            background: #28a745;
            color: white;
        }
        
        .search-container {
            flex: 1;
            max-width: 400px;
            margin: 0 20px;
        }
        
        .search-input {
            width: 100%;
            padding: 10px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 6px;
            font-size: 0.9em;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #007cba;
            box-shadow: 0 0 0 3px rgba(0, 124, 186, 0.1);
        }
        
        .search-input::placeholder {
            color: #999;
        }
        
        .no-results {
            text-align: center;
            padding: 40px 20px;
            color: #666;
            font-style: italic;
        }
        
        @media (max-width: 768px) {
            .search-container {
                margin: 0;
                max-width: none;
                order: 3;
                width: 100%;
            }
            
            .action-bar {
                flex-direction: column;
                align-items: stretch;
                gap: 15px;
            }
            
            .action-bar > div:last-child {
                order: 1;
            }
            
            .action-bar > a {
                order: 2;
            }
            
            .users-table {
                font-size: 0.9em;
            }
            
            .users-table th,
            .users-table td {
                padding: 10px 8px;
            }
            
            .action-buttons {
                flex-direction: column;
                gap: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="page-header">
            <div>
                <h1>👥 User Management</h1>
                <div class="user-info">
                    Logged in as: <strong><?= htmlspecialchars($userSession['Username']) ?></strong>
                    <span class="role-badge"><?= htmlspecialchars(ucfirst($userRole)) ?></span>
                </div>
            </div>
        </div>

        <div class="action-bar">
            <a href="../dashboard.php" class="btn btn-back">← Back to Dashboard</a>
            <div class="search-container">
                <input type="text" id="userSearch" placeholder="🔍 Search users..." class="search-input">
            </div>
            <div>
                <?php if ($userRole === 'admin'): ?>
                    <a href="user_create.php" class="btn">➕ Create New User</a>
                <?php endif; ?>
            </div>
        </div>

        <div class="table-container">
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Display Name</th>
                        <th>Role</th>
                        <?php if (in_array($userRole, ['admin', 'employee'])): ?>
                            <th>Actions</th>
                        <?php endif; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $user): ?>
                        <tr>
                            <td><strong><?= htmlspecialchars($user['Username']) ?></strong></td>
                            <td><?= htmlspecialchars($user['Email']) ?></td>
                            <td><?= htmlspecialchars($user['Phone'] ?: '—') ?></td>
                            <td><?= htmlspecialchars($user['Showname'] ?: '—') ?></td>
                            <td>
                                <span class="user-role role-<?= strtolower($user['Role']) ?>">
                                    <?= htmlspecialchars(ucfirst($user['Role'])) ?>
                                </span>
                            </td>
                            <?php if (in_array($userRole, ['admin', 'employee'])): ?>
                                <td>
                                    <div class="action-buttons">
                                        <a href="user_edit.php?username=<?= urlencode($user['Username']) ?>" class="btn btn-sm">✏️ Edit</a>
                                        <?php if ($userRole === 'admin' && $user['Username'] !== $userSession['Username']): ?>
                                            <a href="user_delete.php?username=<?= urlencode($user['Username']) ?>" 
                                               class="btn btn-sm btn-danger" 
                                               onclick="return confirm('Are you sure you want to delete <?= htmlspecialchars($user['Username']) ?>?')">
                                                🗑️ Delete
                                            </a>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            <?php endif; ?>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // User search functionality
        document.getElementById('userSearch').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const table = document.querySelector('.users-table');
            const rows = table.querySelectorAll('tbody tr');
            let visibleRows = 0;

            rows.forEach(row => {
                const username = row.cells[0].textContent.toLowerCase();
                const email = row.cells[1].textContent.toLowerCase();
                const phone = row.cells[2].textContent.toLowerCase();
                const displayName = row.cells[3].textContent.toLowerCase();
                const role = row.cells[4].textContent.toLowerCase();

                const matches = username.includes(searchTerm) ||
                               email.includes(searchTerm) ||
                               phone.includes(searchTerm) ||
                               displayName.includes(searchTerm) ||
                               role.includes(searchTerm);

                if (matches) {
                    row.style.display = '';
                    visibleRows++;
                } else {
                    row.style.display = 'none';
                }
            });

            // Show/hide no results message
            let noResultsRow = table.querySelector('.no-results-row');
            if (visibleRows === 0 && searchTerm !== '') {
                if (!noResultsRow) {
                    noResultsRow = document.createElement('tr');
                    noResultsRow.className = 'no-results-row';
                    noResultsRow.innerHTML = `<td colspan="<?= in_array($userRole, ['admin', 'employee']) ? '6' : '5' ?>" class="no-results">No users found matching "${searchTerm}"</td>`;
                    table.querySelector('tbody').appendChild(noResultsRow);
                }
                noResultsRow.style.display = '';
            } else if (noResultsRow) {
                noResultsRow.style.display = 'none';
            }
        });
    </script>
</body>
</html>
