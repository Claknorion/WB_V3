<?php
session_start();

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$role = $_SESSION['user']['Role'];
if (!in_array($role, ['employee', 'admin'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied']);
    exit();
}

header('Content-Type: application/json');

include '../db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$code = $_POST['code'] ?? '';
$location = $_POST['location'] ?? '';

if (empty($code) || empty($location)) {
    echo json_encode(['error' => 'Code and location are required']);
    exit();
}

try {
    $conn = connectDB();
    
    // Delete from database - handle all media types, not just images
    $stmt = $conn->prepare("DELETE FROM Media WHERE Code = ? AND Location = ?");
    $stmt->execute([$code, $location]);
    
    $deletedRows = $stmt->rowCount();
    
    if ($deletedRows === 0) {
        echo json_encode(['error' => 'Media not found in database']);
        exit();
    }
    
    // Delete physical file only if it's not a YouTube URL
    if (!preg_match('/^https?:\/\//', $location)) {
        $filePath = '../' . $location;
        if (file_exists($filePath)) {
            if (!unlink($filePath)) {
                // File deletion failed, but database was updated
                echo json_encode([
                    'success' => true,
                    'message' => 'Media removed from database, but file deletion failed',
                    'warning' => 'Physical file may still exist'
                ]);
                exit();
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Media deleted successfully',
        'deleted_rows' => $deletedRows
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
