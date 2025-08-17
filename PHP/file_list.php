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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Management - Walkabout Management</title>
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
            max-width: 1400px;
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
        
        .search-filter-container {
            display: flex;
            gap: 15px;
            flex: 1;
            max-width: 600px;
            align-items: center;
        }
        
        .search-container {
            flex: 1;
            min-width: 250px;
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
        
        .filter-container {
            flex-shrink: 0;
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .no-results {
            text-align: center;
            padding: 40px 20px;
            color: #666;
            font-style: italic;
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
        
        .btn-primary {
            background: #28a745;
        }
        
        .btn-primary:hover {
            background: #218838;
        }
        
        .table-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .files-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }
        
        .files-table th,
        .files-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .files-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
        }
        
        .files-table tbody tr:hover {
            background: #f8f9fa;
        }
        
        .files-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .action-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .btn-sm {
            padding: 6px 12px;
            font-size: 0.8em;
            border-radius: 3px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
        }
        
        .status-active {
            background: #28a745;
            color: white;
        }
        
        .status-inactive {
            background: #6c757d;
            color: white;
        }
        
        .status-pending {
            background: #ffc107;
            color: #212529;
        }
        
        .file-uid {
            font-family: monospace;
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        
        .empty-state h3 {
            margin: 0 0 10px 0;
            color: #999;
        }
        
        @media (max-width: 768px) {
            .search-filter-container {
                flex-direction: column;
                width: 100%;
                gap: 10px;
            }
            
            .search-container {
                min-width: auto;
            }
            
            .action-bar {
                flex-direction: column;
                align-items: stretch;
            }
            
            .files-table {
                font-size: 0.9em;
            }
            
            .files-table th,
            .files-table td {
                padding: 8px 6px;
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
                <h1>📁 File Management</h1>
                <div class="user-info">
                    Logged in as: <strong><?= htmlspecialchars($userSession['Username']) ?></strong>
                    <span class="role-badge"><?= htmlspecialchars(ucfirst($userRole)) ?></span>
                </div>
            </div>
        </div>

        <div class="action-bar">
            <a href="dashboard.php" class="btn btn-back">← Back to Dashboard</a>
            <div class="search-filter-container">
                <div class="search-container">
                    <input type="text" id="fileSearch" placeholder="🔍 Search trips..." class="search-input">
                </div>
                <div class="filter-container">
                    <button class="btn btn-secondary" id="filterToggle" disabled>🔧 Filters (Coming Soon)</button>
                </div>
            </div>
            <div>
                <a href="../HTML/trip_create.html" class="btn btn-primary">➕ Create New Trip</a>
            </div>
        </div>

        <div class="table-container">
            <?php if (empty($files)): ?>
                <div class="empty-state">
                    <h3>📄 No files found</h3>
                    <p>
                        <?php if ($userRole === 'customer'): ?>
                            You don't have any trips yet. Create your first trip to get started!
                        <?php else: ?>
                            No trips have been created in the system yet.
                        <?php endif; ?>
                    </p>
                </div>
            <?php else: ?>
                <table class="files-table">
                    <thead>
                        <tr>
                            <th>Trip ID</th>
                            <th>Search Name</th>
                            <?php if ($userRole === 'admin' || $userRole === 'employee'): ?>
                                <th>Customer Email</th>
                            <?php endif; ?>
                            <th>Start Date</th>
                            <th>Destination</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($files as $file): ?>
                            <tr>
                                <td><span class="file-uid"><?= htmlspecialchars($file['UID']) ?></span></td>
                                <td><strong><?= htmlspecialchars($file['Zoeknaam']) ?></strong></td>
                                <?php if ($userRole === 'admin' || $userRole === 'employee'): ?>
                                    <td><?= htmlspecialchars($file['Email']) ?></td>
                                <?php endif; ?>
                                <td><?= htmlspecialchars($file['Datum_start']) ?></td>
                                <td><?= htmlspecialchars($file['Bestemming'] ?: '—') ?></td>
                                <td>
                                    <span class="status-badge status-<?= strtolower($file['Status']) ?>">
                                        <?= htmlspecialchars(ucfirst($file['Status'] ?: 'Pending')) ?>
                                    </span>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <a href="../HTML/trip_create.html?uid=<?= urlencode($file['UID']) ?>&zoeknaam=<?= urlencode($file['Zoeknaam']) ?>" 
                                           class="btn btn-sm btn-primary">
                                            ✏️ Edit Trip
                                        </a>
                                        <?php if ($userRole === 'admin' || $userRole === 'employee'): ?>
                                            <a href="file_edit.php?uid=<?= urlencode($file['UID']) ?>" class="btn btn-sm">
                                                ⚙️ Manage
                                            </a>
                                        <?php endif; ?>
                                        <?php if ($userRole === 'admin'): ?>
                                            <a href="file_delete.php?uid=<?= urlencode($file['UID']) ?>" 
                                               class="btn btn-sm btn-danger" 
                                               onclick="return confirm('Are you sure you want to delete this trip?');">
                                                🗑️ Delete
                                            </a>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>

    <script>
        // File search functionality
        document.getElementById('fileSearch').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const table = document.querySelector('.files-table');
            const rows = table.querySelectorAll('tbody tr');
            let visibleRows = 0;

            rows.forEach(row => {
                // Skip if this is already a no-results row
                if (row.classList.contains('no-results-row')) return;

                const uid = row.cells[0].textContent.toLowerCase();
                const searchName = row.cells[1].textContent.toLowerCase();
                const startDate = row.cells[<?= ($userRole === 'admin' || $userRole === 'employee') ? '3' : '2' ?>].textContent.toLowerCase();
                const destination = row.cells[<?= ($userRole === 'admin' || $userRole === 'employee') ? '4' : '3' ?>].textContent.toLowerCase();
                const status = row.cells[<?= ($userRole === 'admin' || $userRole === 'employee') ? '5' : '4' ?>].textContent.toLowerCase();
                
                <?php if ($userRole === 'admin' || $userRole === 'employee'): ?>
                const email = row.cells[2].textContent.toLowerCase();
                const matches = uid.includes(searchTerm) ||
                               searchName.includes(searchTerm) ||
                               email.includes(searchTerm) ||
                               startDate.includes(searchTerm) ||
                               destination.includes(searchTerm) ||
                               status.includes(searchTerm);
                <?php else: ?>
                const matches = uid.includes(searchTerm) ||
                               searchName.includes(searchTerm) ||
                               startDate.includes(searchTerm) ||
                               destination.includes(searchTerm) ||
                               status.includes(searchTerm);
                <?php endif; ?>

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
                    noResultsRow.innerHTML = `<td colspan="<?= ($userRole === 'admin' || $userRole === 'employee') ? '7' : '6' ?>" class="no-results">No trips found matching "${searchTerm}"</td>`;
                    table.querySelector('tbody').appendChild(noResultsRow);
                }
                noResultsRow.style.display = '';
            } else if (noResultsRow) {
                noResultsRow.style.display = 'none';
            }
        });

        // Filter button placeholder functionality
        document.getElementById('filterToggle').addEventListener('click', function() {
            alert('Filter functionality will be added when trip management features are complete.');
        });
    </script>
</body>
</html>
