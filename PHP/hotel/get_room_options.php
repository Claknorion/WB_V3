<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

require_once '../db.php'; // or wherever your DB connection lives
$pdo = connectDB();

$code = $_GET['code'] ?? '';

if (!$code) {
    echo json_encode(['error' => 'Missing code']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM Product_accommodatie_opties WHERE Code = ?");
    $stmt->execute([$code]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($results);
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
