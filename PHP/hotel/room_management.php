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

$hotelCode = $_GET['hotel'] ?? '';
if (!$hotelCode) {
    header("Location: hotel_management.php");
    exit();
}

// Fetch dropdown options
$serviceOptions = [];
$kitchenOptions = [];

try {
    $conn = connectDB();
    
    // Get service options
    $stmt = $conn->prepare("SELECT DISTINCT Service FROM Product_accommodatie_instellingen WHERE Service IS NOT NULL AND Service != ''");
    $stmt->execute();
    $serviceOptions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Get kitchen options
    $stmt = $conn->prepare("SELECT DISTINCT Keuken FROM Product_accommodatie_instellingen WHERE Keuken IS NOT NULL AND Keuken != ''");
    $stmt->execute();
    $kitchenOptions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
} catch (Exception $e) {
    $error = "Error fetching dropdown options: " . $e->getMessage();
}

// Handle form submissions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $conn = connectDB();
        
        if (isset($_POST['action'])) {
            switch ($_POST['action']) {
                case 'add_room':
                    $stmt = $conn->prepare("
                        INSERT INTO Product_accommodatie_product (
                            Code, Productnaam, Beschrijving_lang, Keuken, Bedden, Ensuite, 
                            Gross, Nett, Service, Active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $stmt->execute([
                        $hotelCode,
                        $_POST['room_name'],
                        $_POST['description'],
                        $_POST['kitchen'],
                        $_POST['beds'],
                        isset($_POST['ensuite']) && $_POST['ensuite'] == '1' ? 1 : 0,
                        $_POST['gross'],
                        $_POST['nett'],
                        $_POST['service'] ?? 'Logies',  // Default to 'Logies'
                        isset($_POST['active']) && $_POST['active'] == '1' ? 1 : 0  // Properly handle checkbox
                    ]);
                    
                    // Get the new room ID and redirect to edit it
                    $newRoomId = $conn->lastInsertId();
                    $message = "Room added successfully!";
                    
                    // Redirect to edit the new room so bed configurations can be added
                    header("Location: room_management.php?hotel=" . urlencode($hotelCode) . "&edit=" . $newRoomId);
                    exit();
                    break;
                    
                case 'update_room':
                    $stmt = $conn->prepare("
                        UPDATE Product_accommodatie_product SET
                            Productnaam = ?, Beschrijving_lang = ?, Keuken = ?, Bedden = ?, 
                            Ensuite = ?, Gross = ?, Nett = ?, Service = ?, Active = ?
                        WHERE ID = ?
                    ");
                    
                    $stmt->execute([
                        $_POST['room_name'],
                        $_POST['description'],
                        $_POST['kitchen'],
                        $_POST['beds'],
                        isset($_POST['ensuite']) && $_POST['ensuite'] == '1' ? 1 : 0,
                        $_POST['gross'],
                        $_POST['nett'],
                        $_POST['service'] ?? 'Logies',  // Default to 'Logies'
                        isset($_POST['active']) && $_POST['active'] == '1' ? 1 : 0,  // Properly handle checkbox
                        $_POST['room_id']
                    ]);
                    
                    $message = "Room updated successfully!";
                    break;
                    
                case 'delete_room':
                    // Check if room is used in any bookings
                    $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM Reis_info WHERE Service LIKE ?");
                    $checkStmt->execute(['%' . $_POST['room_id'] . '%']);
                    $usage = $checkStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($usage['count'] > 0) {
                        $error = "Cannot delete room - it's used in {$usage['count']} booking(s).";
                    } else {
                        $stmt = $conn->prepare("DELETE FROM Product_accommodatie_product WHERE ID = ?");
                        $stmt->execute([$_POST['room_id']]);
                        $message = "Room deleted successfully!";
                    }
                    break;
            }
        }
    } catch (Exception $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

// Fetch hotel info
try {
    $stmt = $conn->prepare("SELECT * FROM Product_accommodatie WHERE Code = ?");
    $stmt->execute([$hotelCode]);
    $hotel = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$hotel) {
        die("Hotel not found.");
    }
} catch (Exception $e) {
    die("Error fetching hotel: " . $e->getMessage());
}

// Fetch rooms for this hotel
try {
    $stmt = $conn->prepare("
        SELECT * FROM Product_accommodatie_product 
        WHERE Code = ? 
        ORDER BY Productnaam
    ");
    $stmt->execute([$hotelCode]);
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $error = "Error fetching rooms: " . $e->getMessage();
    $rooms = [];
}

// Get specific room for editing
$editRoom = null;
if (isset($_GET['edit'])) {
    try {
        $stmt = $conn->prepare("SELECT * FROM Product_accommodatie_product WHERE ID = ?");
        $stmt->execute([$_GET['edit']]);
        $editRoom = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $error = "Error fetching room for edit: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Room Management - <?= htmlspecialchars($hotel['Product']) ?></title>
    <link rel="stylesheet" href="../CSS/styles.css">
    <link rel="stylesheet" href="../CSS/management.css">
    
    <!-- Quill.js Rich Text Editor -->
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
    <script src="../JS/rich-text-editor.js"></script>
    <style>
        body {
            overflow-y: auto !important;
            min-height: 100vh;
        }
        
        .room-management {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .hotel-info {
            background: #e8f4f8;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            border: 1px solid #bee5eb;
        }
        
        .form-section, .list-section {
            background: #f9f9f9;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        
        .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        
        .form-group {
            flex: 1;
            min-width: 200px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        }
        
        .form-group textarea {
            height: 80px;
            resize: vertical;
        }
        
        /* Checkbox styling */
        .form-group label:has(input[type="checkbox"]) {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            padding: 15px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 5px;
            transition: all 0.3s ease;
            margin-bottom: 5px;
            min-height: 80px;
            box-sizing: border-box;
        }

        .form-group label:has(input[type="checkbox"]):hover {
            border-color: #007bff;
            background: #f8f9ff;
        }

        .form-group input[type="checkbox"] {
            width: auto;
            margin: 0;
            transform: scale(1.2);
            flex-shrink: 0;
        }

        .form-group small {
            display: block;
            margin-top: 5px;
            font-size: 12px;
        }
        
        .btn {
            background: #007cba;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn:hover {
            background: #005a87;
        }
        
        .btn-danger {
            background: #dc3545;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
        
        .btn-secondary {
            background: #6c757d;
        }
        
        .btn-secondary:hover {
            background: #545b62;
        }
        
        .rooms-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .rooms-table th, .rooms-table td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        }
        
        .rooms-table th {
            background: #f8f9fa;
            font-weight: bold;
        }
        
        .rooms-table tbody tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .rooms-table tbody tr:hover {
            background: #e9ecef;
        }
        
        .message {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
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
        
        /* Image Upload Styling */
        .image-upload-container {
            margin-top: 20px;
        }
        
        .drag-drop-area {
            border: 3px dashed #ddd;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            background: #fafafa;
            transition: all 0.3s ease;
            cursor: pointer;
            margin-bottom: 20px;
        }
        
        .drag-drop-area:hover,
        .drag-drop-area.drag-over {
            border-color: #4facfe;
            background: #f0f8ff;
        }
        
        .drag-drop-content {
            pointer-events: none;
        }
        
        .upload-icon {
            font-size: 3em;
            display: block;
            margin-bottom: 15px;
            opacity: 0.7;
        }
        
        .browse-link {
            color: #4facfe;
            text-decoration: underline;
            cursor: pointer;
            pointer-events: all;
        }
        
        /* Media Type Selector */
        .media-type-selector {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        
        .media-type-selector label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 5px;
            transition: background 0.3s ease;
        }
        
        .media-type-selector label:hover {
            background: #e9ecef;
        }
        
        .media-type-selector input[type="radio"] {
            margin: 0;
        }
        
        /* YouTube Input Area */
        .youtube-input-area {
            border: 3px solid #ff0000;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            background: #fff5f5;
            margin-bottom: 20px;
        }
        
        .youtube-input-content {
            max-width: 400px;
            margin: 0 auto;
        }
        
        /* Media Type Badges */
        .media-type-badge {
            position: absolute;
            bottom: 8px;
            left: 8px;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            z-index: 5;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .media-type-badge.type-image {
            background: #28a745;
            color: white;
        }
        
        .media-type-badge.type-360 {
            background: #17a2b8;
            color: white;
        }
        
        .media-type-badge.type-video {
            background: #dc3545;
            color: white;
        }
        
        /* Advanced Drag & Drop Visual Effects */
        .image-item {
            position: relative;
            transition: all 0.3s ease;
            cursor: grab;
        }
        
        .image-item:active {
            cursor: grabbing;
        }
        
        .image-item.dragging {
            opacity: 0.7;
            transform: scale(1.05) rotate(5deg);
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            border: 3px solid #4facfe;
            background: rgba(79, 172, 254, 0.1);
        }
        
        .image-item.not-dragging {
            opacity: 0.5;
            transform: scale(0.95);
        }
        
        .image-item.drag-over {
            transform: scale(1.1);
            border: 3px solid #00ff00;
            background: rgba(0, 255, 0, 0.1);
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
        }
        
        .image-item.drag-over::before {
            content: "📍 DROP HERE";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 12px;
            z-index: 10;
            animation: pulse 1s infinite;
        }
        
        .image-item.drop-success {
            transform: scale(1.15);
            border: 3px solid #28a745;
            background: rgba(40, 167, 69, 0.2);
            animation: successPulse 0.3s ease;
        }
        
        @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.1); }
        }
        
        @keyframes successPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1.15); }
        }
        
        .drag-disabled {
            pointer-events: none;
            opacity: 0.5;
            position: relative;
        }
        
        .drag-disabled::after {
            content: "Drag operation in progress...";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 152, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 10;
        }
        
        .image-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .image-item {
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            background: white;
            cursor: move;
            transition: transform 0.2s ease;
            user-select: none;
        }
        
        .image-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }
        
        .image-item.dragging {
            opacity: 0.3;
            transform: rotate(3deg) scale(0.95);
            z-index: 1000;
        }
        
        .image-item.drag-over {
            border: 3px solid #4facfe;
            background: #e8f4ff;
            transform: scale(1.05);
        }
        
        .image-item.drag-over::before {
            content: "Drop here";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(79, 172, 254, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10;
        }
        
        .image-item img {
            width: 100%;
            height: 150px;
            object-fit: cover;
            display: block;
            pointer-events: none;
        }
        
        .image-item-overlay {
            position: absolute;
            top: 0;
            right: 0;
            background: rgba(255,255,255,0.9);
            padding: 5px;
            border-radius: 0 0 0 8px;
            display: flex;
            gap: 5px;
        }
        
        .sequence-number {
            position: absolute;
            top: 5px;
            left: 5px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            pointer-events: none;
        }
        
        .delete-image-btn {
            background: #ff4757;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 8px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .delete-image-btn:hover {
            background: #ff3838;
        }
        
        /* Prevent drag conflicts with upload area */
        .drag-drop-area.drag-disabled {
            pointer-events: none;
            opacity: 0.5;
            border-color: #ccc !important;
            background: #f5f5f5 !important;
        }
        
        .upload-progress {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
            display: none;
        }
        
        /* Bed Configuration Styles */
        .form-section {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .bed-config-item {
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            position: relative;
        }
        
        .bed-config-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            gap: 10px;
        }
        
        .bed-config-title {
            font-weight: bold;
            color: #333;
        }
        
        .bed-config-remove {
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .bed-selection {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .bed-type-group {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e9ecef;
        }
        
        .bed-type-select {
            min-width: 150px;
        }
        
        .bed-quantity {
            width: 80px;
            text-align: center;
        }
        
        .bed-remove {
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 3px 8px;
            cursor: pointer;
            font-size: 11px;
        }
        
        .add-bed-type {
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 15px;
            cursor: pointer;
            margin-right: 10px;
        }
        
        .config-summary {
            background: #e7f3ff;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 0.9em;
        }
        
        .total-capacity {
            font-weight: bold;
            color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="management-container">
        <h1>Room Management</h1>
        
        <div class="hotel-info">
            <h3><?= htmlspecialchars($hotel['Product']) ?> (<?= htmlspecialchars($hotel['Code']) ?>)</h3>
            <p><?= htmlspecialchars($hotel['Locatie_stad']) ?>, <?= htmlspecialchars($hotel['Locatie_land']) ?></p>
        </div>
        
        <nav style="margin-bottom: 20px;">
            <a href="hotel_management.php" class="btn btn-secondary">← Back to Hotels</a>
            <a href="dashboard.php" class="btn btn-secondary">Dashboard</a>
        </nav>
        
        <?php if ($message): ?>
            <div class="message success"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="message error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <!-- Add/Edit Room Form -->
        <div class="form-section">
            <h2><?= $editRoom ? 'Edit Room' : 'Add New Room' ?></h2>
            
            <form method="POST" action="">
                <input type="hidden" name="action" value="<?= $editRoom ? 'update_room' : 'add_room' ?>">
                <?php if ($editRoom): ?>
                    <input type="hidden" name="room_id" value="<?= $editRoom['ID'] ?>">
                <?php endif; ?>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="room_name">Room Name *</label>
                        <input type="text" id="room_name" name="room_name" 
                               value="<?= htmlspecialchars($editRoom['Productnaam'] ?? '') ?>" required>
                    </div>
                </div>
                
                <!-- Bed Configuration Section -->
                <div class="form-section">
                    <h3>Bed Configurations</h3>
                    
                    <div id="bed-configurations">
                        <!-- Bed configurations will be loaded here -->
                    </div>
                    
                    <button type="button" class="btn btn-secondary" onclick="addBedConfiguration()">
                        Add New Bed Configuration
                    </button>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="kitchen">Kitchen Type</label>
                        <select id="kitchen" name="kitchen">
                            <option value="">No Kitchen</option>
                            <?php foreach ($kitchenOptions as $kitchen): ?>
                                <option value="<?= htmlspecialchars($kitchen) ?>" 
                                        <?= ($editRoom['Keuken'] ?? '') == $kitchen ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($kitchen) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="service">Included Services *</label>
                        <select id="service" name="service" required>
                            <option value="">Select Service Type</option>
                            <?php foreach ($serviceOptions as $service): ?>
                                <option value="<?= htmlspecialchars($service) ?>" 
                                        <?= ($editRoom['Service'] ?? '') == $service ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($service) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="gross">Gross Price (per night)</label>
                        <input type="number" step="0.01" id="gross" name="gross" 
                               value="<?= htmlspecialchars($editRoom['Gross'] ?? '') ?>">
                    </div>
                    <div class="form-group">
                        <label for="nett">Net Price (per night)</label>
                        <input type="number" step="0.01" id="nett" name="nett" 
                               value="<?= htmlspecialchars($editRoom['Nett'] ?? '') ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="description">Room Description</label>
                        <?= generateRichTextEditor('description', $editRoom['Beschrijving_lang'] ?? '', 'Enter room description...') ?>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <input type="hidden" name="active" value="0">
                        <label>
                            <input type="checkbox" name="active" value="1" 
                                   <?= ($editRoom['Active'] ?? 1) ? 'checked' : '' ?>>
                            <strong>✓ Active</strong> - Visible in trip creation
                        </label>
                        <small style="color: #666;">When unchecked, room won't appear in trip creator selection</small>
                    </div>
                    <div class="form-group">
                        <input type="hidden" name="ensuite" value="0">
                        <label>
                            <input type="checkbox" name="ensuite" value="1" 
                                   <?= ($editRoom['Ensuite'] ?? 1) ? 'checked' : '' ?>>
                            <strong>🚿 Private Bathroom (Ensuite)</strong> - Room has private bathroom
                        </label>
                        <small style="color: #666;">When checked, room includes private bathroom facilities</small>
                    </div>
                </div>
                
                <!-- Media Upload Section -->
                <?php if ($editRoom): ?>
                <div class="form-section">
                    <h3>Room Media (Images, 360°, Videos)</h3>
                    <div class="image-upload-container">
                        <!-- Media Type Selector -->
                        <div class="media-type-selector">
                            <label>
                                <input type="radio" name="mediaType" value="image" checked>
                                📷 Regular Images
                            </label>
                            <label>
                                <input type="radio" name="mediaType" value="360">
                                🌐 360° Images
                            </label>
                            <label>
                                <input type="radio" name="mediaType" value="video">
                                🎥 YouTube Videos
                            </label>
                        </div>
                        
                        <!-- File Upload Area -->
                        <div class="drag-drop-area" id="dragDropArea">
                            <div class="drag-drop-content">
                                <i class="upload-icon">📷</i>
                                <p id="uploadText">Drag & drop images here or <span class="browse-link">browse files</span></p>
                                <input type="file" id="imageInput" accept="image/*" multiple style="display: none;">
                                <small id="uploadHelp">Supported formats: JPEG, PNG, WebP (Max 5MB each)</small>
                            </div>
                        </div>
                        
                        <!-- YouTube Input Area -->
                        <div class="youtube-input-area" id="youtubeInputArea" style="display: none;">
                            <div class="youtube-input-content">
                                <h4>🎥 Add YouTube Video</h4>
                                <p>Paste a YouTube video URL to add it to this room's media gallery</p>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <input type="url" id="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." style="flex: 1; padding: 10px; border: 2px solid #ff0000; border-radius: 5px;">
                                    <button type="button" id="addYoutubeBtn" style="padding: 10px 15px; background: #ff0000; color: white; border: none; border-radius: 5px; cursor: pointer;">Add Video</button>
                                </div>
                                <small>Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ</small>
                            </div>
                        </div>
                        
                        <div class="image-gallery" id="imageGallery">
                            <!-- Media will be loaded here -->
                        </div>
                    </div>
                </div>
                <?php endif; ?>
                
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn"><?= $editRoom ? 'Update Room' : 'Add Room' ?></button>
                    <?php if ($editRoom): ?>
                        <a href="room_management.php?hotel=<?= urlencode($hotelCode) ?>" class="btn btn-secondary">Cancel Edit</a>
                    <?php endif; ?>
                </div>
            </form>
        </div>
        
        <!-- Rooms List -->
        <div class="list-section">
            <h2>Existing Rooms (<?= count($rooms) ?>)</h2>
            
            <table class="rooms-table">
                <thead>
                    <tr>
                        <th>Room Name</th>
                        <th>Beds</th>
                        <th>Kitchen</th>
                        <th>Ensuite</th>
                        <th>Service</th>
                        <th>Gross Price</th>
                        <th>Net Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($rooms as $room): ?>
                        <tr>
                            <td><?= htmlspecialchars($room['Productnaam']) ?></td>
                            <td><?= htmlspecialchars($room['Bedden'] ?? '') ?></td>
                            <td><?= htmlspecialchars($room['Keuken'] ?? '') ?></td>
                            <td><?= $room['Ensuite'] ? 'Yes' : 'No' ?></td>
                            <td><?= htmlspecialchars($room['Service'] ?? '') ?></td>
                            <td>€<?= number_format($room['Gross'], 2) ?></td>
                            <td>€<?= number_format($room['Nett'], 2) ?></td>
                            <td>
                                <a href="?hotel=<?= urlencode($hotelCode) ?>&edit=<?= $room['ID'] ?>" 
                                   class="btn" style="font-size: 12px; padding: 5px 10px;">Edit</a>
                                <form method="POST" style="display: inline;" 
                                      onsubmit="return confirm('Are you sure you want to delete this room?')">
                                    <input type="hidden" name="action" value="delete_room">
                                    <input type="hidden" name="room_id" value="<?= $room['ID'] ?>">
                                    <button type="submit" class="btn btn-danger" style="font-size: 12px; padding: 5px 10px;">Delete</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        // Media Upload Functionality - Enhanced Version for Rooms
        <?php if ($editRoom): ?>
        document.addEventListener('DOMContentLoaded', function() {
            const dragDropArea = document.getElementById('dragDropArea');
            const youtubeInputArea = document.getElementById('youtubeInputArea');
            const imageInput = document.getElementById('imageInput');
            const imageGallery = document.getElementById('imageGallery');
            const roomCode = '<?= htmlspecialchars($editRoom['ID']) ?>';
            const mediaTypeRadios = document.querySelectorAll('input[name="mediaType"]');
            const uploadText = document.getElementById('uploadText');
            const uploadHelp = document.getElementById('uploadHelp');
            const youtubeUrl = document.getElementById('youtubeUrl');
            const addYoutubeBtn = document.getElementById('addYoutubeBtn');
            
            console.log('Room management script started for:', roomCode);
            
            // Load existing media
            loadExistingMedia();
            
            // Drag and drop events
            if (dragDropArea) {
                dragDropArea.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    dragDropArea.classList.add('drag-over');
                });
                
                dragDropArea.addEventListener('dragleave', function(e) {
                    e.preventDefault();
                    dragDropArea.classList.remove('drag-over');
                });
                
                dragDropArea.addEventListener('drop', function(e) {
                    e.preventDefault();
                    dragDropArea.classList.remove('drag-over');
                    const files = e.dataTransfer.files;
                    handleFiles(files);
                });
                
                dragDropArea.addEventListener('click', function() {
                    imageInput.click();
                });
            }
            
            // File input change
            if (imageInput) {
                imageInput.addEventListener('change', function(e) {
                    handleFiles(e.target.files);
                });
            }
            
            // Browse link click
            const browseLink = document.querySelector('.browse-link');
            if (browseLink) {
                browseLink.addEventListener('click', function(e) {
                    e.stopPropagation();
                    imageInput.click();
                });
            }
            
            // Media type change handler
            mediaTypeRadios.forEach(function(radio) {
                radio.addEventListener('change', function() {
                    updateUploadInterface(this.value);
                });
            });
            
            // YouTube add button
            if (addYoutubeBtn) {
                addYoutubeBtn.addEventListener('click', function() {
                    const url = youtubeUrl.value.trim();
                    if (url) {
                        uploadYouTubeVideo(url);
                    }
                });
            }
            
            function updateUploadInterface(mediaType) {
                if (mediaType === 'video') {
                    if (dragDropArea) dragDropArea.style.display = 'none';
                    if (youtubeInputArea) youtubeInputArea.style.display = 'block';
                } else {
                    if (dragDropArea) dragDropArea.style.display = 'block';
                    if (youtubeInputArea) youtubeInputArea.style.display = 'none';
                    
                    if (mediaType === '360') {
                        if (uploadText) uploadText.innerHTML = 'Drag & drop 360° images here or <span class="browse-link">browse files</span>';
                        if (uploadHelp) uploadHelp.textContent = 'Supported formats: JPEG, PNG (Max 15MB each)';
                        if (imageInput) imageInput.accept = 'image/jpeg,image/jpg,image/png';
                    } else {
                        if (uploadText) uploadText.innerHTML = 'Drag & drop images here or <span class="browse-link">browse files</span>';
                        if (uploadHelp) uploadHelp.textContent = 'Supported formats: JPEG, PNG, WebP (Max 5MB each)';
                        if (imageInput) imageInput.accept = 'image/*';
                    }
                    
                    // Re-attach browse link event
                    const newBrowseLink = document.querySelector('.browse-link');
                    if (newBrowseLink) {
                        newBrowseLink.addEventListener('click', function(e) {
                            e.stopPropagation();
                            imageInput.click();
                        });
                    }
                }
            }
            
            function handleFiles(files) {
                const selectedMediaType = document.querySelector('input[name="mediaType"]:checked');
                const mediaType = selectedMediaType ? selectedMediaType.value : 'image';
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type.startsWith('image/')) {
                        uploadImage(file, mediaType);
                    } else {
                        alert('Please only upload image files.');
                    }
                }
            }
            
            function uploadImage(file, mediaType) {
                mediaType = mediaType || 'image';
                const formData = new FormData();
                formData.append('image', file);
                formData.append('code', roomCode);
                formData.append('mediaType', mediaType);
                
                fetch('image_upload.php', {
                    method: 'POST',
                    body: formData
                })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        loadExistingMedia();
                        alert('Upload successful!');
                    } else {
                        alert('Upload failed: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(function(error) {
                    alert('Upload failed: ' + error.message);
                });
            }
            
            function uploadYouTubeVideo(url) {
                const formData = new FormData();
                formData.append('youtubeUrl', url);
                formData.append('code', roomCode);
                formData.append('mediaType', 'video');
                
                fetch('image_upload.php', {
                    method: 'POST',
                    body: formData
                })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        loadExistingMedia();
                        if (youtubeUrl) youtubeUrl.value = '';
                        alert('YouTube video added successfully!');
                    } else {
                        alert('Failed to add YouTube video: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(function(error) {
                    alert('Failed to add YouTube video: ' + error.message);
                });
            }
            
            function loadExistingMedia() {
                fetch('get_images.php?code=' + roomCode)
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        displayMedia(data.media || []);
                    } else {
                        console.error('Failed to load media:', data.error);
                    }
                })
                .catch(function(error) {
                    console.error('Error loading media:', error);
                });
            }
            
            function displayMedia(mediaItems) {
                if (!imageGallery) return;
                
                imageGallery.innerHTML = '';
                
                for (let i = 0; i < mediaItems.length; i++) {
                    const item = mediaItems[i];
                    const mediaItem = document.createElement('div');
                    mediaItem.className = 'image-item';
                    mediaItem.draggable = true;
                    mediaItem.dataset.location = item.Location;
                    mediaItem.dataset.sequence = i;
                    
                    let mediaContent = '';
                    let badgeText = '';
                    let badgeClass = '';
                    
                    if (item.Mediatype === 'video') {
                        badgeText = '🎥 VIDEO';
                        badgeClass = 'type-video';
                        const videoId = extractYouTubeId(item.Location);
                        const thumbnailUrl = videoId ? 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg' : 'https://img.youtube.com/vi/default/default.jpg';
                        mediaContent = '<img src="' + thumbnailUrl + '" alt="Video Thumbnail" loading="lazy" onerror="this.src=\'https://img.youtube.com/vi/' + videoId + '/default.jpg\'">';
                        mediaItem.dataset.videoId = videoId || '';
                    } else if (item.Mediatype === '360') {
                        badgeText = '🌐 360°';
                        badgeClass = 'type-360';
                        mediaContent = '<img src="../' + item.Location + '" alt="360° Image" loading="lazy">';
                    } else {
                        badgeText = '📷 IMAGE';
                        badgeClass = 'type-image';
                        mediaContent = '<img src="../' + item.Location + '" alt="Room Image" loading="lazy">';
                    }
                    
                    // Create elements safely
                    const sequenceDiv = document.createElement('div');
                    sequenceDiv.className = 'sequence-number';
                    sequenceDiv.textContent = (i + 1);
                    
                    const badgeDiv = document.createElement('div');
                    badgeDiv.className = 'media-type-badge ' + badgeClass;
                    badgeDiv.textContent = badgeText;
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.innerHTML = mediaContent;
                    
                    const overlayDiv = document.createElement('div');
                    overlayDiv.className = 'image-item-overlay';
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-image-btn';
                    deleteBtn.textContent = '×';
                    deleteBtn.addEventListener('click', function() {
                        deleteMedia(item.Location);
                    });
                    
                    overlayDiv.appendChild(deleteBtn);
                    
                    mediaItem.appendChild(sequenceDiv);
                    mediaItem.appendChild(badgeDiv);
                    mediaItem.appendChild(contentDiv);
                    mediaItem.appendChild(overlayDiv);
                    
                    // Add drag event listeners for reordering
                    mediaItem.addEventListener('dragstart', handleDragStart);
                    mediaItem.addEventListener('dragenter', handleDragEnter);
                    mediaItem.addEventListener('dragover', handleDragOver);
                    mediaItem.addEventListener('dragleave', handleDragLeave);
                    mediaItem.addEventListener('drop', handleImageDrop);
                    mediaItem.addEventListener('dragend', handleDragEnd);
                    
                    imageGallery.appendChild(mediaItem);
                }
                
                // Add reordering instructions if multiple items
                if (mediaItems.length > 1) {
                    const noteDiv = document.createElement('div');
                    noteDiv.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #666; font-style: italic; margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px; border: 1px dashed #ccc;';
                    noteDiv.innerHTML = '💡 <strong>Drag & Drop:</strong> Click and drag any media item to reorder. The first item will be the main photo/video.';
                    imageGallery.appendChild(noteDiv);
                }
            }
            
            // Drag and Drop Variables
            let draggedElement = null;
            let draggedIndex = null;
            
            function handleDragStart(e) {
                draggedElement = e.currentTarget;
                draggedIndex = parseInt(draggedElement.dataset.sequence);
                
                // Add visual feedback to dragged element
                draggedElement.classList.add('dragging');
                
                // Disable upload area to prevent conflicts
                if (dragDropArea) {
                    dragDropArea.classList.add('drag-disabled');
                }
                
                // Set drag data
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
                
                // Add semi-transparent effect to all other items
                const allItems = imageGallery.querySelectorAll('.image-item');
                allItems.forEach(function(item) {
                    if (item !== draggedElement) {
                        item.classList.add('not-dragging');
                    }
                });
            }
            
            function handleDragEnter(e) {
                e.preventDefault();
                const targetItem = e.currentTarget;
                
                // Only highlight if it's a different item and we're dragging
                if (targetItem !== draggedElement && draggedElement) {
                    targetItem.classList.add('drag-over');
                }
            }
            
            function handleDragOver(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const targetItem = e.currentTarget;
                if (targetItem !== draggedElement && draggedElement) {
                    targetItem.classList.add('drag-over');
                }
            }
            
            function handleDragLeave(e) {
                const targetItem = e.currentTarget;
                
                // Only remove highlight if we're actually leaving this element
                if (!targetItem.contains(e.relatedTarget)) {
                    targetItem.classList.remove('drag-over');
                }
            }
            
            function handleImageDrop(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetItem = e.currentTarget;
                targetItem.classList.remove('drag-over');
                
                if (draggedElement && targetItem !== draggedElement) {
                    const targetIndex = parseInt(targetItem.dataset.sequence);
                    
                    // Show immediate visual feedback
                    targetItem.classList.add('drop-success');
                    setTimeout(function() {
                        targetItem.classList.remove('drop-success');
                    }, 300);
                    
                    // Reorder the media array and update display
                    reorderMedia(draggedIndex, targetIndex);
                }
            }
            
            function handleDragEnd(e) {
                // Clean up all visual states
                const allItems = imageGallery.querySelectorAll('.image-item');
                allItems.forEach(function(item) {
                    item.classList.remove('dragging', 'drag-over', 'not-dragging');
                });
                
                // Re-enable upload area
                if (dragDropArea) {
                    dragDropArea.classList.remove('drag-disabled');
                }
                
                // Reset drag variables
                draggedElement = null;
                draggedIndex = null;
            }
            
            function reorderMedia(fromIndex, toIndex) {
                // Get current media items from the gallery
                const mediaItems = Array.from(imageGallery.querySelectorAll('.image-item'));
                const mediaData = mediaItems.map(function(item) {
                    return {
                        Location: item.dataset.location,
                        sequence: parseInt(item.dataset.sequence)
                    };
                });
                
                // Reorder the array
                const movedItem = mediaData.splice(fromIndex, 1)[0];
                mediaData.splice(toIndex, 0, movedItem);
                
                // Update sequences and save to server
                const newOrder = mediaData.map(function(item) {
                    return item.Location;
                });
                
                saveMediaOrder(newOrder);
            }
            
            function saveMediaOrder(mediaOrder) {
                if (!mediaOrder) {
                    const mediaItems = imageGallery.querySelectorAll('.image-item');
                    mediaOrder = Array.from(mediaItems).map(function(item) {
                        return item.dataset.location;
                    });
                }
                
                const formData = new FormData();
                formData.append('code', roomCode);
                formData.append('imageOrder', JSON.stringify(mediaOrder));
                
                fetch('update_image_order.php', {
                    method: 'POST',
                    body: formData
                })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        // Show success message briefly
                        showMessage('Media order updated successfully!', 'success');
                        // Reload to reflect new order with updated sequence numbers
                        loadExistingMedia();
                    } else {
                        showMessage('Failed to update order: ' + (data.error || 'Unknown error'), 'error');
                        loadExistingMedia(); // Reload to restore original order
                    }
                })
                .catch(function(error) {
                    showMessage('Failed to update order: ' + error.message, 'error');
                    loadExistingMedia(); // Reload to restore original order
                });
            }
            
            function deleteMedia(location) {
                if (confirm('Are you sure you want to delete this media?')) {
                    const formData = new FormData();
                    formData.append('code', roomCode);
                    formData.append('location', location);
                    
                    fetch('delete_image.php', {
                        method: 'POST',
                        body: formData
                    })
                    .then(function(response) {
                        return response.json();
                    })
                    .then(function(data) {
                        if (data.success) {
                            loadExistingMedia();
                            alert('Media deleted successfully!');
                        } else {
                            alert('Delete failed: ' + (data.error || 'Unknown error'));
                        }
                    })
                    .catch(function(error) {
                        alert('Delete failed: ' + error.message);
                    });
                }
            }
            
            function showMessage(message, type) {
                const existingMessage = document.querySelector('.temp-message');
                if (existingMessage) {
                    existingMessage.remove();
                }
                
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + type + ' temp-message';
                messageDiv.textContent = message;
                messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 10px 15px; border-radius: 5px; z-index: 1000; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
                
                if (type === 'success') {
                    messageDiv.style.background = '#4CAF50';
                    messageDiv.style.color = 'white';
                } else {
                    messageDiv.style.background = '#f44336';
                    messageDiv.style.color = 'white';
                }
                
                document.body.appendChild(messageDiv);
                
                setTimeout(function() {
                    messageDiv.remove();
                }, 3000);
            }
            
            // YouTube ID extraction function
            function extractYouTubeId(url) {
                const patterns = [
                    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
                ];
                
                for (let i = 0; i < patterns.length; i++) {
                    const matches = url.match(patterns[i]);
                    if (matches) {
                        return matches[1];
                    }
                }
                
                return null;
            }
        });
        
        // Bed Configuration Management
        let bedTypes = [];
        let bedConfigurations = [];
        let configCounter = 0;
        let currentRoomId = null;
        
        // Load available bed types
        async function loadBedTypes() {
            try {
                const response = await fetch('../PHP/hotel/bed_settings_api.php?action=active');
                const data = await response.json();
                if (data.success) {
                    bedTypes = data.beds;
                }
            } catch (error) {
                console.error('Error loading bed types:', error);
            }
        }
        
        // Load existing bed configurations for the room
        async function loadBedConfigurations() {
            if (!currentRoomId) return;
            
            try {
                const response = await fetch(`../PHP/hotel/bed_config_api.php?action=list&room_id=${currentRoomId}`);
                const data = await response.json();
                if (data.success) {
                    bedConfigurations = data.configurations;
                    renderBedConfigurations();
                }
            } catch (error) {
                console.error('Error loading bed configurations:', error);
            }
        }
        
        // Add new bed configuration
        function addBedConfiguration() {
            const config = {
                id: null,
                temp_id: 'temp_' + (++configCounter),
                configuratie_naam: '',
                bed_details: { beds: [] },
                totaal_personen: 0,
                actief: 1,
                sorteer_volgorde: bedConfigurations.length
            };
            
            bedConfigurations.push(config);
            renderBedConfigurations();
        }
        
        // Remove bed configuration
        function removeBedConfiguration(index) {
            if (confirm('Are you sure you want to remove this bed configuration?')) {
                bedConfigurations.splice(index, 1);
                renderBedConfigurations();
            }
        }
        
        // Add bed type to configuration
        function addBedType(configIndex) {
            if (bedTypes.length === 0) {
                alert('No bed types available. Please add bed types in settings first.');
                return;
            }
            
            bedConfigurations[configIndex].bed_details.beds.push({
                bed_type_id: bedTypes[0].ID,
                bed_naam: bedTypes[0].Bed_naam,
                quantity: 1
            });
            
            // Auto-generate configuration name
            generateConfigurationName(configIndex);
            renderBedConfigurations();
        }
        
        // Remove bed type from configuration
        function removeBedType(configIndex, bedIndex) {
            bedConfigurations[configIndex].bed_details.beds.splice(bedIndex, 1);
            // Auto-generate configuration name
            generateConfigurationName(configIndex);
            renderBedConfigurations();
        }
        
        // Update bed configuration
        function updateBedConfiguration(configIndex, field, value) {
            // Auto-generate configuration name from bed details
            generateConfigurationName(configIndex);
            calculateTotalCapacity(configIndex);
        }
        
        // Generate configuration name automatically
        function generateConfigurationName(configIndex) {
            const config = bedConfigurations[configIndex];
            if (config.bed_details.beds.length === 0) {
                config.configuratie_naam = '';
                return;
            }
            
            const bedSummary = config.bed_details.beds
                .map(bed => `${bed.quantity}× ${bed.bed_naam}`)
                .join(', ');
            
            config.configuratie_naam = bedSummary;
        }
        
        // Update bed type in configuration
        function updateBedType(configIndex, bedIndex, field, value) {
            const bed = bedConfigurations[configIndex].bed_details.beds[bedIndex];
            
            if (field === 'bed_type_id') {
                const bedType = bedTypes.find(b => b.ID == value);
                bed.bed_type_id = value;
                bed.bed_naam = bedType ? bedType.Bed_naam : '';
            } else if (field === 'quantity') {
                bed.quantity = Math.max(1, parseInt(value) || 1);
            }
            
            // Auto-generate configuration name
            generateConfigurationName(configIndex);
            calculateTotalCapacity(configIndex);
            renderBedConfigurations();
        }
        
        // Calculate total capacity for a configuration
        function calculateTotalCapacity(configIndex) {
            const config = bedConfigurations[configIndex];
            let total = 0;
            
            config.bed_details.beds.forEach(bed => {
                // Find the bed type to get its capacity
                const bedType = bedTypes.find(bt => bt.ID == bed.bed_type_id);
                const capacityPerBed = bedType ? (bedType.Personen_per_bed || 1) : 1;
                
                // Multiply bed capacity by quantity
                total += (capacityPerBed * bed.quantity);
            });
            
            config.totaal_personen = total;
        }
        
        // Render bed configurations
        function renderBedConfigurations() {
            const container = document.getElementById('bed-configurations');
            if (!container) return;
            
            if (bedConfigurations.length === 0) {
                container.innerHTML = '<p>No bed configurations defined. Add one to get started.</p>';
                return;
            }
            
            container.innerHTML = bedConfigurations.map((config, configIndex) => `
                <div class="bed-config-item">
                    <div class="bed-config-header">
                        <button type="button" class="add-bed-type" onclick="addBedType(${configIndex})">Add Bed Type</button>
                        <button type="button" class="bed-config-remove" onclick="removeBedConfiguration(${configIndex})">Remove</button>
                    </div>
                    
                    <div class="bed-selection">
                        ${config.bed_details.beds.map((bed, bedIndex) => `
                            <div class="bed-type-group">
                                <select class="bed-type-select" onchange="updateBedType(${configIndex}, ${bedIndex}, 'bed_type_id', this.value)">
                                    ${bedTypes.map(type => `
                                        <option value="${type.ID}" ${type.ID == bed.bed_type_id ? 'selected' : ''}>
                                            ${type.Bed_naam}
                                        </option>
                                    `).join('')}
                                </select>
                                <input type="number" class="bed-quantity" min="1" max="10" 
                                       value="${bed.quantity}"
                                       onchange="updateBedType(${configIndex}, ${bedIndex}, 'quantity', this.value)">
                                <button type="button" class="bed-remove" onclick="removeBedType(${configIndex}, ${bedIndex})">×</button>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="config-summary">
                        <span class="total-capacity">Total Capacity: ${config.totaal_personen} people</span>
                        ${config.bed_details.beds.length > 0 ? ` • ${config.bed_details.beds.map(b => `${b.quantity}× ${b.bed_naam}`).join(', ')}` : ''}
                    </div>
                </div>
            `).join('');
        }
        
        // Save bed configurations when form is submitted
        function saveBedConfigurations() {
            console.log('=== SAVING BED CONFIGURATIONS ===');
            console.log('Current Room ID:', currentRoomId);
            console.log('Bed Configurations:', bedConfigurations);
            
            if (!currentRoomId) {
                console.log('No room ID - skipping bed configuration save');
                return Promise.resolve();
            }

            const data = {
                action: 'save_all',
                room_id: currentRoomId,
                configurations: bedConfigurations
            };
            
            console.log('Sending data to API:', data);            return fetch('../PHP/hotel/bed_config_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Bed configurations saved successfully');
                    return data;
                } else {
                    console.error('Error saving bed configurations:', data.error);
                    throw new Error(data.error);
                }
            });
        }
        
        // Initialize bed configuration system when room is selected
        async function initializeBedConfiguration(roomId) {
            console.log('=== INITIALIZING BED CONFIGURATION ===');
            console.log('Received Room ID:', roomId);
            console.log('Room ID type:', typeof roomId);
            currentRoomId = roomId;
            console.log('Set currentRoomId to:', currentRoomId);
            await loadBedTypes();
            await loadBedConfigurations();
        }
        
        // Hook into existing form submission
        const originalSubmitForm = window.submitForm || function() {};
        window.submitForm = function() {
            saveBedConfigurations();
            originalSubmitForm();
        };
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', function() {
            loadBedTypes();
            
            // Initialize bed configuration if editing a room
            <?php if ($editRoom): ?>
            initializeBedConfiguration('<?= $editRoom['ID'] ?>');
            <?php endif; ?>
            
            // Add form submission handler for bed configurations
            const roomForm = document.querySelector('form[method="POST"]');
            if (roomForm) {
                roomForm.addEventListener('submit', function(e) {
                    // Save bed configurations before form submits
                    if (currentRoomId) {
                        e.preventDefault(); // Prevent immediate form submission
                        
                        // Save bed configurations first
                        saveBedConfigurations().then(() => {
                            // After saving bed configurations, submit the form normally
                            roomForm.removeEventListener('submit', arguments.callee);
                            roomForm.submit();
                        }).catch(error => {
                            console.error('Error saving bed configurations:', error);
                            // Continue with form submission even if bed configs fail
                            roomForm.removeEventListener('submit', arguments.callee);
                            roomForm.submit();
                        });
                    }
                });
            }
        });
        
        <?php endif; ?>
    </script>
</body>
</html>
