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

// Handle form submissions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $conn = connectDB();
        
        if (isset($_POST['action'])) {
            switch ($_POST['action']) {
                case 'add_inbounder':
                    $stmt = $conn->prepare("
                        INSERT INTO Inbounder_info (
                            Code, Inbounder, Land, Contact_persoon_general, Contact_email_general, 
                            Contact_phone_general, Contact_persoon_admin, Contact_email_admin, 
                            Contact_phone_admin, Public_phone, Public_email, Currency
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $stmt->execute([
                        $_POST['code'],
                        $_POST['inbounder_name'] ?: null,
                        $_POST['country'] ?: null,
                        $_POST['general_contact_person'] ?: null,
                        $_POST['general_contact_email'] ?: null,
                        $_POST['general_contact_phone'] ?: null,
                        $_POST['admin_contact_person'] ?: null,
                        $_POST['admin_contact_email'] ?: null,
                        $_POST['admin_contact_phone'] ?: null,
                        $_POST['public_phone'] ?: null,
                        $_POST['public_email'] ?: null,
                        $_POST['currency'] ?: null
                    ]);
                    
                    $message = "Inbounder company added successfully!";
                    break;
                    
                case 'update_inbounder':
                    $stmt = $conn->prepare("
                        UPDATE Inbounder_info SET
                            Inbounder = ?, Land = ?, Contact_persoon_general = ?, Contact_email_general = ?,
                            Contact_phone_general = ?, Contact_persoon_admin = ?, Contact_email_admin = ?,
                            Contact_phone_admin = ?, Public_phone = ?, Public_email = ?, Currency = ?
                        WHERE Code = ?
                    ");
                    
                    $stmt->execute([
                        $_POST['inbounder_name'] ?: null,
                        $_POST['country'] ?: null,
                        $_POST['general_contact_person'] ?: null,
                        $_POST['general_contact_email'] ?: null,
                        $_POST['general_contact_phone'] ?: null,
                        $_POST['admin_contact_person'] ?: null,
                        $_POST['admin_contact_email'] ?: null,
                        $_POST['admin_contact_phone'] ?: null,
                        $_POST['public_phone'] ?: null,
                        $_POST['public_email'] ?: null,
                        $_POST['currency'] ?: null,
                        $_POST['code']
                    ]);
                    
                    $message = "Inbounder company updated successfully!";
                    break;
                    
                case 'delete_inbounder':
                    $stmt = $conn->prepare("DELETE FROM Inbounder_info WHERE Code = ?");
                    $stmt->execute([$_POST['code']]);
                    $message = "Inbounder company deleted successfully!";
                    break;
            }
        }
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

// Fetch inbounders
$inbounders = [];
$editInbounder = null;

try {
    $conn = connectDB();
    
    // Get inbounder to edit if requested
    if (isset($_GET['edit'])) {
        $stmt = $conn->prepare("SELECT * FROM Inbounder_info WHERE Code = ?");
        $stmt->execute([$_GET['edit']]);
        $editInbounder = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Fetch all inbounders
    $stmt = $conn->query("
        SELECT * FROM Inbounder_info 
        ORDER BY Inbounder
    ");
    $inbounders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    $error = "Error fetching inbounders: " . $e->getMessage();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inbounder Management - Walkabout Management</title>
    <link rel="stylesheet" href="../CSS/styles.css">
    <link rel="stylesheet" href="../CSS/management.css">
    <script src="../JS/management.js"></script>
    
</head>
<body>
    <div class="management-container">
        <a href="dashboard.php" class="back-link">← Back to Dashboard</a>
        
        <div class="page-header">
            <h1>🏢 Inbounder Company Management</h1>
        </div>

        <?php if ($message): ?>
            <div class="message success"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="message error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <div class="info-box">
            <h4>ℹ️ About Inbounder Companies</h4>
            <p>This page manages the main inbounder companies - the parent organizations that handle tour operations. These companies can have multiple tour operators under them and contain primary business and contact information.</p>
        </div>

        <!-- Add/Edit Inbounder Form -->
        <div class="form-section">
            <h2><?= $editInbounder ? 'Edit Inbounder Company' : 'Add New Inbounder Company' ?></h2>
            
            <form method="post" action="">
                <input type="hidden" name="action" value="<?= $editInbounder ? 'update_inbounder' : 'add_inbounder' ?>">
                
                <!-- Basic Information -->
                <div class="form-row">
                    <div class="form-group half-width">
                        <label for="code">Inbounder Code *</label>
                        <?php if ($editInbounder): ?>
                            <input type="hidden" name="code" value="<?= htmlspecialchars($editInbounder['Code']) ?>">
                            <input type="text" value="<?= htmlspecialchars($editInbounder['Code']) ?>" disabled>
                            <small>Inbounder code cannot be changed when editing</small>
                        <?php else: ?>
                            <input type="text" id="code" name="code" required 
                                   placeholder="e.g., IB001, SYDNEY_MAIN">
                            <small>Unique identifier for this inbounder company</small>
                        <?php endif; ?>
                    </div>
                    <div class="form-group half-width">
                        <label for="inbounder_name">Company Name *</label>
                        <input type="text" id="inbounder_name" name="inbounder_name" required 
                               value="<?= htmlspecialchars($editInbounder['Inbounder'] ?? '') ?>"
                               placeholder="e.g., Sydney Tours International">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group half-width">
                        <label for="country">Country</label>
                        <select id="country" name="country">
                            <option value="">Select Country</option>
                            <option value="Australië" <?= ($editInbounder['Land'] ?? '') == 'Australië' ? 'selected' : '' ?>>Australië</option>
                            <option value="Nieuw-Zeeland" <?= ($editInbounder['Land'] ?? '') == 'Nieuw-Zeeland' ? 'selected' : '' ?>>Nieuw-Zeeland</option>
                        </select>
                    </div>
                    <div class="form-group half-width">
                        <label for="currency">Currency</label>
                        <select id="currency" name="currency">
                            <option value="">Select Currency</option>
                            <option value="AUD" <?= ($editInbounder['Currency'] ?? '') == 'AUD' ? 'selected' : '' ?>>AUD - Australian Dollar</option>
                            <option value="NZD" <?= ($editInbounder['Currency'] ?? '') == 'NZD' ? 'selected' : '' ?>>NZD - New Zealand Dollar</option>
                            <option value="USD" <?= ($editInbounder['Currency'] ?? '') == 'USD' ? 'selected' : '' ?>>USD - US Dollar</option>
                            <option value="EUR" <?= ($editInbounder['Currency'] ?? '') == 'EUR' ? 'selected' : '' ?>>EUR - Euro</option>
                        </select>
                    </div>
                </div>

                <!-- General Contact Information -->
                <div class="contact-section">
                    <h4>📋 General Contact Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="general_contact_person">Contact Person</label>
                            <input type="text" id="general_contact_person" name="general_contact_person" 
                                   value="<?= htmlspecialchars($editInbounder['Contact_persoon_general'] ?? '') ?>"
                                   placeholder="General manager or primary contact">
                        </div>
                        <div class="form-group">
                            <label for="general_contact_email">Contact Email</label>
                            <input type="email" id="general_contact_email" name="general_contact_email" 
                                   value="<?= htmlspecialchars($editInbounder['Contact_email_general'] ?? '') ?>"
                                   placeholder="info@company.com">
                        </div>
                        <div class="form-group">
                            <label for="general_contact_phone">Contact Phone</label>
                            <input type="tel" id="general_contact_phone" name="general_contact_phone" 
                                   value="<?= htmlspecialchars($editInbounder['Contact_phone_general'] ?? '') ?>"
                                   placeholder="+61 2 1234 5678">
                        </div>
                    </div>
                </div>

                <!-- Admin Contact Information -->
                <div class="contact-section">
                    <h4>⚙️ Administrative Contact Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="admin_contact_person">Admin Contact Person</label>
                            <input type="text" id="admin_contact_person" name="admin_contact_person" 
                                   value="<?= htmlspecialchars($editInbounder['Contact_persoon_admin'] ?? '') ?>"
                                   placeholder="Administrative manager">
                        </div>
                        <div class="form-group">
                            <label for="admin_contact_email">Admin Email</label>
                            <input type="email" id="admin_contact_email" name="admin_contact_email" 
                                   value="<?= htmlspecialchars($editInbounder['Contact_email_admin'] ?? '') ?>"
                                   placeholder="admin@company.com">
                        </div>
                        <div class="form-group">
                            <label for="admin_contact_phone">Admin Phone</label>
                            <input type="tel" id="admin_contact_phone" name="admin_contact_phone" 
                                   value="<?= htmlspecialchars($editInbounder['Contact_phone_admin'] ?? '') ?>"
                                   placeholder="+61 2 1234 5679">
                        </div>
                    </div>
                </div>

                <!-- Public Contact Information -->
                <div class="contact-section">
                    <h4>👥 Public Contact Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="public_phone">Public Phone</label>
                            <input type="tel" id="public_phone" name="public_phone" 
                                   value="<?= htmlspecialchars($editInbounder['Public_phone'] ?? '') ?>"
                                   placeholder="+61 2 1234 5680">
                            <small>Phone number shown to customers</small>
                        </div>
                        <div class="form-group">
                            <label for="public_email">Public Email</label>
                            <input type="email" id="public_email" name="public_email" 
                                   value="<?= htmlspecialchars($editInbounder['Public_email'] ?? '') ?>"
                                   placeholder="bookings@company.com">
                            <small>Email address shown to customers</small>
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <button type="submit" class="btn">
                        <?= $editInbounder ? '💾 Update Inbounder Company' : '➕ Add Inbounder Company' ?>
                    </button>
                    <?php if ($editInbounder): ?>
                        <a href="inbounder_management.php" class="btn btn-secondary">Cancel</a>
                    <?php endif; ?>
                </div>
            </form>
        </div>

        <!-- Inbounders List -->
        <div class="list-section">
            <h2>Inbounder Companies (<?= count($inbounders) ?> found)</h2>
            
            <div class="search-filter">
                <input type="text" id="inbounderSearch" placeholder="🔍 Search by company name, code, contact person, email..." 
                       onkeyup="filterInbounders()">
            </div>

            <?php if (empty($inbounders)): ?>
                <div style="text-align: center; color: #666; padding: 40px;">
                    <p><strong>No inbounder companies found yet.</strong></p>
                    <p>Add inbounder companies using the form above!</p>
                </div>
            <?php else: ?>
                <table class="inbounders-table" id="inboundersTable">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Company Name</th>
                            <th>Country</th>
                            <th>Currency</th>
                            <th>General Contact</th>
                            <th>Admin Contact</th>
                            <th>Public Contact</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($inbounders as $inbounder): ?>
                            <tr>
                                <td><strong><?= htmlspecialchars($inbounder['Code']) ?></strong></td>
                                <td><?= htmlspecialchars($inbounder['Inbounder']) ?></td>
                                <td><?= $inbounder['Land'] ? htmlspecialchars($inbounder['Land']) : '<em>Not set</em>' ?></td>
                                <td>
                                    <?php if ($inbounder['Currency']): ?>
                                        <span class="currency-symbol"><?= htmlspecialchars($inbounder['Currency']) ?></span>
                                    <?php else: ?>
                                        <em>Not set</em>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($inbounder['Contact_persoon_general']): ?>
                                        <strong><?= htmlspecialchars($inbounder['Contact_persoon_general']) ?></strong><br>
                                    <?php endif; ?>
                                    <?php if ($inbounder['Contact_email_general']): ?>
                                        <small>📧 <?= htmlspecialchars($inbounder['Contact_email_general']) ?></small><br>
                                    <?php endif; ?>
                                    <?php if ($inbounder['Contact_phone_general']): ?>
                                        <small>📞 <?= htmlspecialchars($inbounder['Contact_phone_general']) ?></small>
                                    <?php endif; ?>
                                    <?php if (!$inbounder['Contact_persoon_general'] && !$inbounder['Contact_email_general'] && !$inbounder['Contact_phone_general']): ?>
                                        <em>Not set</em>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($inbounder['Contact_persoon_admin']): ?>
                                        <strong><?= htmlspecialchars($inbounder['Contact_persoon_admin']) ?></strong><br>
                                    <?php endif; ?>
                                    <?php if ($inbounder['Contact_email_admin']): ?>
                                        <small>📧 <?= htmlspecialchars($inbounder['Contact_email_admin']) ?></small><br>
                                    <?php endif; ?>
                                    <?php if ($inbounder['Contact_phone_admin']): ?>
                                        <small>📞 <?= htmlspecialchars($inbounder['Contact_phone_admin']) ?></small>
                                    <?php endif; ?>
                                    <?php if (!$inbounder['Contact_persoon_admin'] && !$inbounder['Contact_email_admin'] && !$inbounder['Contact_phone_admin']): ?>
                                        <em>Not set</em>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($inbounder['Public_email']): ?>
                                        <small>📧 <?= htmlspecialchars($inbounder['Public_email']) ?></small><br>
                                    <?php endif; ?>
                                    <?php if ($inbounder['Public_phone']): ?>
                                        <small>📞 <?= htmlspecialchars($inbounder['Public_phone']) ?></small>
                                    <?php endif; ?>
                                    <?php if (!$inbounder['Public_email'] && !$inbounder['Public_phone']): ?>
                                        <em>Not set</em>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <a href="?edit=<?= urlencode($inbounder['Code']) ?>" class="btn" style="padding: 5px 10px; margin-right: 5px;">✏️ Edit</a>
                                    <form method="post" style="display: inline;" 
                                          onsubmit="return confirm('Are you sure you want to delete this inbounder company? This may affect related tour operators.');">
                                        <input type="hidden" name="action" value="delete_inbounder">
                                        <input type="hidden" name="code" value="<?= htmlspecialchars($inbounder['Code']) ?>">
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
