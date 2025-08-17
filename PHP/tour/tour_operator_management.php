<?php
session_start();

if (!isset($_SESSION['user'])) {
    header("Location: ../auth/login.php");
    exit();
}

$role = $_SESSION['user']['Role'];
if (!in_array($role, ['employee', 'admin'])) {
    die("Access denied. Insufficient permissions.");
}

include '../db.php';

// Handle form submissions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $conn = connectDB();
        
        if (isset($_POST['action'])) {
            switch ($_POST['action']) {
                case 'add_operator':
                    $stmt = $conn->prepare("
                        INSERT INTO Product_tours (
                            Code, Inbounder, Supplier, ShowWeb, Preferred_service,
                            Contact_persoon, Contact_email, Contact_phone,
                            Klant_phone, Klant_email, Locatie_land
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $stmt->execute([
                        $_POST['code'],
                        $_POST['inbounder'] ?: null,
                        $_POST['supplier'] ?: null,
                        $_POST['show_web'] ?? 0,
                        $_POST['preferred_service'] ?: null,
                        $_POST['contact_person'] ?: null,
                        $_POST['contact_email'] ?: null,
                        $_POST['contact_phone'] ?: null,
                        $_POST['client_phone'] ?: null,
                        $_POST['client_email'] ?: null,
                        $_POST['country'] ?: null
                    ]);
                    
                    $message = "Tour operator company added successfully!";
                    break;
                    
                case 'update_operator':
                    $stmt = $conn->prepare("
                        UPDATE Product_tours SET
                            Inbounder = ?, Supplier = ?, ShowWeb = ?, Preferred_service = ?,
                            Contact_persoon = ?, Contact_email = ?, Contact_phone = ?,
                            Klant_phone = ?, Klant_email = ?, Locatie_land = ?
                        WHERE Code = ?
                    ");
                    
                    $stmt->execute([
                        $_POST['inbounder'] ?: null,
                        $_POST['supplier'] ?: null,
                        $_POST['show_web'] ?? 0,
                        $_POST['preferred_service'] ?: null,
                        $_POST['contact_person'] ?: null,
                        $_POST['contact_email'] ?: null,
                        $_POST['contact_phone'] ?: null,
                        $_POST['client_phone'] ?: null,
                        $_POST['client_email'] ?: null,
                        $_POST['country'] ?: null,
                        $_POST['code']
                    ]);
                    
                    $message = "Tour operator company updated successfully!";
                    break;
                    
                case 'delete_operator':
                    $stmt = $conn->prepare("DELETE FROM Product_tours WHERE Code = ?");
                    $stmt->execute([$_POST['code']]);
                    $message = "Tour operator company deleted successfully!";
                    break;
            }
        }
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

// Fetch operators and related data
$operators = [];
$editOperator = null;
$availableCodes = [];
$inbounderOptions = [];

try {
    $conn = connectDB();
    
    // Get operator to edit if requested
    if (isset($_GET['edit'])) {
        $stmt = $conn->prepare("SELECT * FROM Product_tours WHERE Code = ?");
        $stmt->execute([$_GET['edit']]);
        $editOperator = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Fetch all operators with inbounder info
    $stmt = $conn->query("
        SELECT pt.Code, pt.Inbounder, pt.Supplier, pt.ShowWeb, 
               pt.Preferred_service, pt.Contact_persoon, pt.Contact_email, 
               pt.Contact_phone, pt.Klant_phone, pt.Klant_email, pt.Locatie_land,
               ii.Inbounder as InbounderName
        FROM Product_tours pt
        LEFT JOIN Inbounder_info ii ON ii.Code = pt.Inbounder
        ORDER BY pt.Code
    ");
    $operators = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get available inbounder options
    $stmt = $conn->query("
        SELECT Code, Inbounder 
        FROM Inbounder_info 
        ORDER BY Inbounder
    ");
    $inbounderOptions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    $error = "Error fetching data: " . $e->getMessage();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tour Operator Management - Walkabout Management</title>
    <link rel="stylesheet" href="../CSS/styles.css">
    <link rel="stylesheet" href="../CSS/management.css">
    <script src="../JS/management.js"></script>
    
</head>
<body>
    <div class="management-container">
        <a href="../dashboard.php" class="back-link">← Back to Dashboard</a>
        
        <div class="page-header">
            <h1>🚌 Tour Operator Company Management</h1>
        </div>

        <?php if ($message): ?>
            <div class="message success"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="message error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <div class="info-box">
            <h4>ℹ️ About Operator Companies</h4>
            <p>This page manages tour operator companies and their business details. Each operator has a unique code and contains contact information, supplier relationships, and business settings for tour operations.</p>
        </div>

        <!-- Add/Edit Operator Form -->
        <div class="form-section">
            <h2><?= $editOperator ? 'Edit Tour Operator Company' : 'Add New Tour Operator Company' ?></h2>
            
            <form method="post" action="">
                <input type="hidden" name="action" value="<?= $editOperator ? 'update_operator' : 'add_operator' ?>">
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="code">Operator Code *</label>
                        <?php if ($editOperator): ?>
                            <input type="hidden" name="code" value="<?= htmlspecialchars($editOperator['Code']) ?>">
                            <input type="text" value="<?= htmlspecialchars($editOperator['Code']) ?>" disabled>
                            <small>Operator code cannot be changed when editing</small>
                        <?php else: ?>
                            <input type="text" id="code" name="code" required 
                                   placeholder="e.g., OP001, SYDNEY_TOURS">
                            <small>Unique identifier for this operator company</small>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="inbounder">Parent Inbounder</label>
                        <select id="inbounder" name="inbounder">
                            <option value="">Select parent inbounder...</option>
                            <?php foreach ($inbounderOptions as $inbounder): ?>
                                <option value="<?= htmlspecialchars($inbounder['Code']) ?>" 
                                        <?= ($editOperator['Inbounder'] ?? '') == $inbounder['Code'] ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($inbounder['Inbounder']) ?> (<?= htmlspecialchars($inbounder['Code']) ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <small>Parent company or main inbounder</small>
                    </div>
                    <div class="form-group">
                        <label for="supplier">Supplier Name</label>
                        <input type="text" id="supplier" name="supplier" 
                               value="<?= htmlspecialchars($editOperator['Supplier'] ?? '') ?>"
                               placeholder="Company or supplier name">
                        <small>Official company or supplier name</small>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="country">Country</label>
                        <select id="country" name="country">
                            <option value="">Select Country</option>
                            <option value="Australië" <?= ($editOperator['Locatie_land'] ?? '') == 'Australië' ? 'selected' : '' ?>>Australië</option>
                            <option value="Nieuw-Zeeland" <?= ($editOperator['Locatie_land'] ?? '') == 'Nieuw-Zeeland' ? 'selected' : '' ?>>Nieuw-Zeeland</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="preferred_service">Preferred Service</label>
                        <input type="text" id="preferred_service" name="preferred_service" 
                               value="<?= htmlspecialchars($editOperator['Preferred_service'] ?? '') ?>"
                               placeholder="e.g., Premium, Standard">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="contact_person">Contact Person</label>
                        <input type="text" id="contact_person" name="contact_person" 
                               value="<?= htmlspecialchars($editOperator['Contact_persoon'] ?? '') ?>"
                               placeholder="Primary contact name">
                    </div>
                    <div class="form-group">
                        <label for="contact_email">Contact Email</label>
                        <input type="email" id="contact_email" name="contact_email" 
                               value="<?= htmlspecialchars($editOperator['Contact_email'] ?? '') ?>"
                               placeholder="contact@operator.com">
                    </div>
                    <div class="form-group">
                        <label for="contact_phone">Contact Phone</label>
                        <input type="tel" id="contact_phone" name="contact_phone" 
                               value="<?= htmlspecialchars($editOperator['Contact_phone'] ?? '') ?>"
                               placeholder="+61 2 1234 5678">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="client_email">Client Email</label>
                        <input type="email" id="client_email" name="client_email" 
                               value="<?= htmlspecialchars($editOperator['Klant_email'] ?? '') ?>"
                               placeholder="client@operator.com">
                        <small>Email for client communications</small>
                    </div>
                    <div class="form-group">
                        <label for="client_phone">Client Phone</label>
                        <input type="tel" id="client_phone" name="client_phone" 
                               value="<?= htmlspecialchars($editOperator['Klant_phone'] ?? '') ?>"
                               placeholder="+61 2 1234 5678">
                        <small>Phone for client communications</small>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="hidden" name="show_web" value="0">
                            <input type="checkbox" name="show_web" value="1" 
                                   <?= ($editOperator['ShowWeb'] ?? 0) ? 'checked' : '' ?>>
                            <strong>✓ Show on Web</strong> - Display this operator's tours on website
                        </label>
                        <small>When checked, tours from this operator will be visible to customers online</small>
                    </div>
                </div>

                <div class="form-row">
                    <button type="submit" class="btn">
                        <?= $editOperator ? '💾 Update Operator Company' : '➕ Add Operator Company' ?>
                    </button>
                    <?php if ($editOperator): ?>
                        <a href="tour_operator_management.php" class="btn btn-secondary">Cancel</a>
                    <?php endif; ?>
                </div>
            </form>
        </div>

        <!-- Operators List -->
        <div class="list-section">
            <h2>Tour Operator Companies (<?= count($operators) ?> found)</h2>
            
            <div class="search-filter">
                <input type="text" id="operatorSearch" placeholder="🔍 Search by operator code, company name, contact person, email..." 
                       onkeyup="filterOperators()">
            </div>

            <?php if (empty($operators)): ?>
                <div style="text-align: center; color: #666; padding: 40px;">
                    <p><strong>No tour operator companies found yet.</strong></p>
                    <p>Add operator companies using the form above!</p>
                </div>
            <?php else: ?>
                <table class="operators-table" id="operatorsTable">
                    <thead>
                        <tr>
                            <th>Operator Code</th>
                            <th>Company/Supplier</th>
                            <th>Parent Inbounder</th>
                            <th>Contact Person</th>
                            <th>Contact Info</th>
                            <th>Country</th>
                            <th>Web</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($operators as $operator): ?>
                            <tr>
                                <td><strong><?= htmlspecialchars($operator['Code']) ?></strong></td>
                                <td>
                                    <?= $operator['Supplier'] ? htmlspecialchars($operator['Supplier']) : '<em>Not set</em>' ?>
                                    <?php if ($operator['Preferred_service']): ?>
                                        <br><small><?= htmlspecialchars($operator['Preferred_service']) ?></small>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($operator['InbounderName']): ?>
                                        <?= htmlspecialchars($operator['InbounderName']) ?><br>
                                        <small><?= htmlspecialchars($operator['Inbounder']) ?></small>
                                    <?php else: ?>
                                        <em>Not assigned</em>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?= $operator['Contact_persoon'] ? htmlspecialchars($operator['Contact_persoon']) : '<em>Not set</em>' ?>
                                </td>
                                <td>
                                    <?php if ($operator['Contact_email']): ?>
                                        <small>📧 <?= htmlspecialchars($operator['Contact_email']) ?></small><br>
                                    <?php endif; ?>
                                    <?php if ($operator['Contact_phone']): ?>
                                        <small>📞 <?= htmlspecialchars($operator['Contact_phone']) ?></small><br>
                                    <?php endif; ?>
                                    <?php if ($operator['Klant_email']): ?>
                                        <small>👤 <?= htmlspecialchars($operator['Klant_email']) ?></small><br>
                                    <?php endif; ?>
                                    <?php if ($operator['Klant_phone']): ?>
                                        <small>📱 <?= htmlspecialchars($operator['Klant_phone']) ?></small>
                                    <?php endif; ?>
                                    <?php if (!$operator['Contact_email'] && !$operator['Contact_phone'] && !$operator['Klant_email'] && !$operator['Klant_phone']): ?>
                                        <em>Not set</em>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?= $operator['Locatie_land'] ? htmlspecialchars($operator['Locatie_land']) : '<em>Not set</em>' ?>
                                </td>
                                <td>
                                    <span style="color: <?= $operator['ShowWeb'] ? 'green' : 'red' ?>;">
                                        <?= $operator['ShowWeb'] ? '✓' : '✗' ?>
                                    </span>
                                </td>
                                <td>
                                    <a href="?edit=<?= urlencode($operator['Code']) ?>" class="btn" style="padding: 5px 10px; margin-right: 5px;">✏️ Edit</a>
                                    <form method="post" style="display: inline;" 
                                          onsubmit="return confirm('Are you sure you want to delete this operator company?');">
                                        <input type="hidden" name="action" value="delete_operator">
                                        <input type="hidden" name="code" value="<?= htmlspecialchars($operator['Code']) ?>">
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
