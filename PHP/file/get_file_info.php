<?php
// Set content type to JSON
header('Content-Type: application/json');

// Get UID from query parameter
$uid = $_GET['uid'] ?? '';

if (empty($uid)) {
    echo json_encode(['error' => 'UID parameter is required']);
    exit;
}

try {
    // Include database connection
    require_once '../db.php';
    $pdo = connectDB();
    
    // Query File_info table for this UID
    $stmt = $pdo->prepare("SELECT * FROM File_info WHERE UID = ?");
    $stmt->execute([$uid]);
    $fileInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Log the query result for debugging
    error_log("get_file_info.php - UID: $uid, Found: " . ($fileInfo ? 'Yes' : 'No'));
    if ($fileInfo) {
        error_log("get_file_info.php - PAX value: " . ($fileInfo['PAX'] ?? 'NULL'));
    }
    
    if ($fileInfo) {
        // Return the file information
        echo json_encode($fileInfo);
    } else {
        // No file info found - return default values
        echo json_encode([
            'UID' => $uid,
            'PAX' => 2, // Default PAX value if no file info found
            'message' => 'No file info found, using defaults'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Error in get_file_info.php: " . $e->getMessage());
    // If database fails, return a reasonable default instead of error
    echo json_encode([
        'UID' => $uid,
        'PAX' => 2, // Fallback PAX value
        'message' => 'Database error, using fallback values',
        'error_details' => $e->getMessage()
    ]);
}
?>
