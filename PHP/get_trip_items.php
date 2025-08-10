<?php
// get_trip_items.php - Fetch trip items ordered by sequence
header('Content-Type: application/json');
require_once 'db.php';

$uid = $_GET['uid'] ?? '';

if (empty($uid)) {
    echo json_encode(['success' => false, 'error' => 'UID required']);
    exit;
}

try {
    $pdo = connectDB();
    $sql = "SELECT * FROM Reis_info WHERE UID = :uid ORDER BY Sequence ASC, ReisID ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uid' => $uid]);
    
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'items' => $items]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
