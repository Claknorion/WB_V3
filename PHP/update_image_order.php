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

include 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$code = $_POST['code'] ?? '';
$imageOrder = json_decode($_POST['imageOrder'] ?? '[]', true);

if (empty($code) || empty($imageOrder)) {
    echo json_encode(['error' => 'Code and image order are required']);
    exit();
}

try {
    $conn = connectDB();
    
    // Update sequence for each image
    foreach ($imageOrder as $index => $location) {
        $newSequence = $index + 1; // Start from 1
        $stmt = $conn->prepare("UPDATE Media SET Sequence = ? WHERE Code = ? AND Location = ? AND Mediatype = 'image'");
        $stmt->execute([$newSequence, $code, $location]);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Image order updated successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
