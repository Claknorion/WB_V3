<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../db.php';
require_once '../PHP/rich-text-helpers.php';
$pdo = connectDB();

$code = $_GET['code'] ?? '';

if (!$code) {
    echo json_encode(['error' => 'Missing code']);
    exit;
}

try {
    // Fetch room types for the hotel (only active rooms)
    $stmtRooms = $pdo->prepare("SELECT ID, Productnaam, Beschrijving_lang, Keuken, Bedden, Ensuite, Gross, Nett, Service, Active FROM Product_accommodatie_product WHERE Code = ? AND Active = 1");
    $stmtRooms->execute([$code]);
    $rooms = $stmtRooms->fetchAll(PDO::FETCH_ASSOC);

    $roomData = [];
    $roomIDs = [];

    if ($rooms) {
        $roomIDs = array_column($rooms, 'ID');

        // Fetch media for hotel + rooms
        $placeholders = implode(',', array_fill(0, count($roomIDs), '?'));
        $mediaQuery = "
            SELECT Code, Location 
            FROM Media 
            WHERE Code = ? " . (count($roomIDs) ? "OR Code IN ($placeholders)" : '');

        $stmtMedia = $pdo->prepare($mediaQuery);
        $stmtMedia->execute(array_merge([$code], $roomIDs));
        $media = $stmtMedia->fetchAll(PDO::FETCH_ASSOC);

        // Index media by Code for quick lookup
        $mediaByCode = [];
        foreach ($media as $m) {
            $mediaByCode[$m['Code']][] = $m['Location'];
        }

        // Attach images to each room
        foreach ($rooms as $room) {
            $id = $room['ID'];
            $roomData[] = [
                'ID' => $id,
                'Productnaam' => $room['Productnaam'],
                'Beschrijving_lang' => displayRichText($room['Beschrijving_lang']),
                'Keuken' => $room['Keuken'],
                'Bedden' => $room['Bedden'],
                'Ensuite' => $room['Ensuite'],
                'Gross' => floatval($room['Gross']),
                'Nett' => floatval($room['Nett']),
                'Service' => $room['Service'],
                'Active' => intval($room['Active']),
                'Images' => $mediaByCode[$id] ?? []
            ];
        }
    }

    // FIXED PART: Fetch options for both hotel and rooms
    if (count($roomIDs) > 0) {
        $placeholders = implode(',', array_fill(0, count($roomIDs), '?'));
        $sqlOptions = "SELECT * FROM Product_accommodatie_opties WHERE Code = ? OR Code IN ($placeholders)";
        $stmtOptions = $pdo->prepare($sqlOptions);
        $stmtOptions->execute(array_merge([$code], $roomIDs));
    } else {
        // No rooms, just fetch options for hotel only
        $stmtOptions = $pdo->prepare("SELECT * FROM Product_accommodatie_opties WHERE Code = ?");
        $stmtOptions->execute([$code]);
    }

    $options = $stmtOptions->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'rooms' => $roomData,
        'options' => $options
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
