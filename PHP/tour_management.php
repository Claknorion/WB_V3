<?php
session_start();

if (!isset($_SESSION['user'])) {
    header("Location: login.php");
    exit();
}

$role = $_SESSION['user']['Role'];
if (!in_array($role, ['employee', 'admin'])) {
    die("Access denied. Insufficient permissions.");
}

include 'db.php';
include 'rich-text-helpers.php';

// Handle form submissions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $conn = connectDB();
        
        if (isset($_POST['action'])) {
            switch ($_POST['action']) {
                case 'add_tour':
                    $stmt = $conn->prepare("
                        INSERT INTO Product_tours_product (
                            Code, Productnaam, Locatie_stad, 
                            Beschrijving_kort, Beschrijving_lang, 
                            Gross, Nett, Days, Hours, Active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $stmt->execute([
                        $_POST['code'],
                        $_POST['product'],
                        $_POST['city'],
                        $_POST['short_desc'],
                        $_POST['long_desc'],
                        $_POST['price_adult'] ?: null,
                        $_POST['price_child'] ?: null,
                        $_POST['days'] ?: null,
                        $_POST['hours'] ?: null,
                        $_POST['active'] ?? 0
                    ]);
                    
                    $message = "Tour added successfully!";
                    break;
                    
                case 'update_tour':
                    $stmt = $conn->prepare("
                        UPDATE Product_tours_product SET
                            Productnaam = ?, Locatie_stad = ?,
                            Beschrijving_kort = ?, Beschrijving_lang = ?,
                            Gross = ?, Nett = ?, Days = ?, Hours = ?, Active = ?
                        WHERE tourID = ?
                    ");
                    
                    $stmt->execute([
                        $_POST['product'],
                        $_POST['city'],
                        $_POST['short_desc'],
                        $_POST['long_desc'],
                        $_POST['price_adult'] ?: null,
                        $_POST['price_child'] ?: null,
                        $_POST['days'] ?: null,
                        $_POST['hours'] ?: null,
                        $_POST['active'] ?? 0,
                        $_POST['tour_id']
                    ]);
                    
                    $message = "Tour updated successfully!";
                    break;
                    
                case 'delete_tour':
                    $stmt = $conn->prepare("DELETE FROM Product_tours_product WHERE tourID = ?");
                    $stmt->execute([$_POST['tour_id']]);
                    $message = "Tour deleted successfully!";
                    break;
            }
        }
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

// Fetch tours for display
$tours = [];
$editTour = null;

try {
    $conn = connectDB();
    
    // Get tour to edit if requested
    if (isset($_GET['edit'])) {
        $stmt = $conn->prepare("SELECT * FROM Product_tours_product WHERE tourID = ?");
        $stmt->execute([$_GET['edit']]);
        $editTour = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Fetch all tours
    $stmt = $conn->query("
        SELECT tourID, Code, Productnaam, Locatie_stad, 
               Gross, Nett, Days, Hours, Active
        FROM Product_tours_product 
        ORDER BY Productnaam
    ");
    $tours = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    $error = "Error fetching tours: " . $e->getMessage();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tour Management - Walkabout Management</title>
    <link rel="stylesheet" href="../CSS/styles.css">
    <link rel="stylesheet" href="../CSS/management.css">
    
    <!-- Quill.js Rich Text Editor -->
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
    <script src="../JS/rich-text-editor.js"></script>
    <script src="../JS/management.js"></script>
</head>
<body>
    <div class="management-container">
        <a href="dashboard.php" class="back-link">← Back to Dashboard</a>
        
        <div class="page-header">
            <h1>🎯 Tour Management</h1>
        </div>

        <?php if ($message): ?>
            <div class="message success"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="message error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <!-- Add/Edit Tour Form -->
        <div class="form-section">
            <h2><?= $editTour ? 'Edit Tour' : 'Add New Tour' ?></h2>
            
            <form method="post" action="">
                <input type="hidden" name="action" value="<?= $editTour ? 'update_tour' : 'add_tour' ?>">
                <?php if ($editTour): ?>
                    <input type="hidden" name="tour_id" value="<?= htmlspecialchars($editTour['tourID']) ?>">
                <?php endif; ?>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="code">Tour Code *</label>
                        <input type="text" id="code" name="code" required 
                               value="<?= htmlspecialchars($editTour['Code'] ?? '') ?>"
                               placeholder="e.g., TOUR001">
                        <small>Unique identifier for this tour</small>
                    </div>
                    <div class="form-group">
                        <label for="product">Tour Name *</label>
                        <input type="text" id="product" name="product" required 
                               value="<?= htmlspecialchars($editTour['Productnaam'] ?? '') ?>"
                               placeholder="e.g., Sydney Harbour Bridge Climb">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="city">City</label>
                        <input type="text" id="city" name="city" 
                               value="<?= htmlspecialchars($editTour['Locatie_stad'] ?? '') ?>"
                               placeholder="e.g., Sydney">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="price_adult">Gross Price</label>
                        <div class="price-group">
                            <span class="currency">$</span>
                            <input type="number" step="0.01" id="price_adult" name="price_adult" 
                                   value="<?= htmlspecialchars($editTour['Gross'] ?? '') ?>"
                                   placeholder="0.00">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="price_child">Nett Price</label>
                        <div class="price-group">
                            <span class="currency">$</span>
                            <input type="number" step="0.01" id="price_child" name="price_child" 
                                   value="<?= htmlspecialchars($editTour['Nett'] ?? '') ?>"
                                   placeholder="0.00">
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="days">Duration (Days)</label>
                        <input type="number" id="days" name="days" 
                               value="<?= htmlspecialchars($editTour['Days'] ?? '') ?>"
                               placeholder="1">
                    </div>
                    <div class="form-group">
                        <label for="hours">Duration (Hours)</label>
                        <input type="number" step="0.5" id="hours" name="hours" 
                               value="<?= htmlspecialchars($editTour['Hours'] ?? '') ?>"
                               placeholder="2.5">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="short_desc">Short Description</label>
                        <textarea id="short_desc" name="short_desc" 
                                  placeholder="Brief tour description for listings..."><?= htmlspecialchars($editTour['Beschrijving_kort'] ?? '') ?></textarea>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="long_desc">Detailed Description</label>
                        <?= generateRichTextEditor('long_desc', $editTour['Beschrijving_lang'] ?? '', 'Enter detailed tour description...') ?>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="hidden" name="active" value="0">
                            <input type="checkbox" name="active" value="1" 
                                   <?= ($editTour['Active'] ?? 1) ? 'checked' : '' ?>>
                            <strong>✓ Active</strong> - Tour is available for booking
                        </label>
                        <small>When unchecked, tour won't appear in trip creator selection</small>
                    </div>
                </div>

                <div class="form-row">
                    <button type="submit" class="btn">
                        <?= $editTour ? '💾 Update Tour' : '➕ Add Tour' ?>
                    </button>
                    <?php if ($editTour): ?>
                        <a href="tour_management.php" class="btn btn-secondary">Cancel</a>
                    <?php endif; ?>
                </div>
            </form>
        </div>

        <!-- Tours List -->
        <div class="list-section">
            <h2>Existing Tours</h2>
            
            <div class="search-filter">
                <input type="text" id="tourSearch" placeholder="🔍 Search tours..." 
                       onkeyup="filterTours()">
            </div>

            <?php if (empty($tours)): ?>
                <p style="text-align: center; color: #666; padding: 40px;">
                    No tours found. Add your first tour above!
                </p>
            <?php else: ?>
                <table class="tours-table" id="toursTable">
                    <thead>
                        <tr>
                            <th>Tour ID</th>
                            <th>Code</th>
                            <th>Tour Name</th>
                            <th>Location</th>
                            <th>Prices</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($tours as $tour): ?>
                            <tr>
                                <td><strong><?= htmlspecialchars($tour['tourID']) ?></strong></td>
                                <td><?= htmlspecialchars($tour['Code']) ?></td>
                                <td><?= htmlspecialchars($tour['Productnaam']) ?></td>
                                <td><?= htmlspecialchars($tour['Locatie_stad'] ?? 'Not set') ?></td>
                                <td>
                                    <?php if ($tour['Gross']): ?>
                                        Gross: $<?= number_format($tour['Gross'], 2) ?><br>
                                    <?php endif; ?>
                                    <?php if ($tour['Nett']): ?>
                                        Nett: $<?= number_format($tour['Nett'], 2) ?>
                                    <?php endif; ?>
                                    <?php if (!$tour['Gross'] && !$tour['Nett']): ?>
                                        <em>Not set</em>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($tour['Days'] || $tour['Hours']): ?>
                                        <?= $tour['Days'] ? $tour['Days'] . ' days' : '' ?>
                                        <?= $tour['Days'] && $tour['Hours'] ? ', ' : '' ?>
                                        <?= $tour['Hours'] ? $tour['Hours'] . ' hours' : '' ?>
                                    <?php else: ?>
                                        <em>Not set</em>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span style="color: <?= $tour['Active'] ? 'green' : 'red' ?>;">
                                        <?= $tour['Active'] ? '✓ Active' : '✗ Inactive' ?>
                                    </span>
                                </td>
                                <td>
                                    <a href="?edit=<?= urlencode($tour['tourID']) ?>" class="btn" style="padding: 5px 10px; margin-right: 5px;">✏️ Edit</a>
                                    <form method="post" style="display: inline;" 
                                          onsubmit="return confirm('Are you sure you want to delete this tour?');">
                                        <input type="hidden" name="action" value="delete_tour">
                                        <input type="hidden" name="tour_id" value="<?= htmlspecialchars($tour['tourID']) ?>">
                                        <button type="submit" class="btn btn-danger" style="padding: 5px 10px;">🗑️ Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>

</body>
</html>
