<?php
// get_trip_details.php - Get detailed trip info including extras breakdown
header('Content-Type: application/json');
require_once '../db.php';

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
    
    $allItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Group items: main items with their extras
    $groupedItems = [];
    
    foreach ($allItems as $item) {
        // Check if this is a main item (no _a, _b, _c suffix)
        if (!preg_match('/_[a-z]$/', $item['ReisID'])) {
            // This is a main item
            $groupedItems[] = [
                'main' => $item,
                'extras' => []
            ];
        }
    }
    
    // Now add extras to their parent main items
    foreach ($allItems as $item) {
        // Check if this is an extra (_a, _b, _c suffix)
        if (preg_match('/_[a-z]$/', $item['ReisID'])) {
            // Find the parent main item
            $baseReisID = preg_replace('/_[a-z]$/', '', $item['ReisID']);
            
            // Find the main item in our grouped array
            for ($i = 0; $i < count($groupedItems); $i++) {
                if ($groupedItems[$i]['main']['ReisID'] === $baseReisID) {
                    $groupedItems[$i]['extras'][] = $item;
                    break;
                }
            }
        }
    }
    
    // Calculate totals for each group
    foreach ($groupedItems as &$group) {
        $mainTotal = floatval($group['main']['Gross'] ?? 0);
        $extrasTotal = 0;
        
        foreach ($group['extras'] as $extra) {
            $extrasTotal += floatval($extra['Gross'] ?? 0);
        }
        
        $group['totals'] = [
            'main' => $mainTotal,
            'extras' => $extrasTotal,
            'combined' => $mainTotal + $extrasTotal
        ];
    }
    
    echo json_encode([
        'success' => true, 
        'grouped_items' => $groupedItems,
        'summary' => [
            'total_main_items' => count($groupedItems),
            'total_extras' => array_sum(array_map(function($g) { return count($g['extras']); }, $groupedItems)),
            'grand_total' => array_sum(array_map(function($g) { return $g['totals']['combined']; }, $groupedItems))
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
