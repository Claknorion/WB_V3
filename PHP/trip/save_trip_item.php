<?php
// save_trip_item.php
header('Content-Type: application/json');
require_once '../db.php';
$pdo = connectDB();

// Check if this is a form data request (sequence update) or JSON request (new item)
if ($_POST && isset($_POST['action'])) {
    if ($_POST['action'] === 'update_sequence') {
        // Handle sequence update
        $reisID = $_POST['reis_id'] ?? '';
        $sequence = $_POST['sequence'] ?? '';
        
        error_log("Sequence update request - ReisID: $reisID, Sequence: $sequence");
        
        if (empty($reisID) || empty($sequence)) {
            error_log("Missing required fields for sequence update");
            echo json_encode(['success' => false, 'error' => 'Missing required fields for sequence update']);
            exit;
        }
        
        try {
            $sql = "UPDATE Reis_info SET Sequence = :sequence WHERE ReisID = :reisID";
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute([
                'sequence' => $sequence,
                'reisID' => $reisID
            ]);
            
            error_log("Sequence update result: " . ($result ? 'SUCCESS' : 'FAILED') . " for ReisID: $reisID");
            echo json_encode(['success' => true, 'message' => 'Sequence updated successfully']);
        } catch (PDOException $e) {
            error_log("Database error in sequence update: " . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    } 
    elseif ($_POST['action'] === 'delete_item') {
        // Handle item deletion (main item + all its extras)
        $reisID = $_POST['reis_id'] ?? '';
        $uid = $_POST['uid'] ?? '';
        
        error_log("Delete item request - ReisID: $reisID, UID: $uid");
        
        if (empty($reisID) || empty($uid)) {
            error_log("Missing required fields for item deletion");
            echo json_encode(['success' => false, 'error' => 'Missing required fields for item deletion']);
            exit;
        }
        
        try {
            // Delete main item and all its extras (items that start with the base ReisID)
            $sql = "DELETE FROM Reis_info WHERE UID = :uid AND (ReisID = :reisID OR ReisID LIKE :reisIDPattern)";
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute([
                'uid' => $uid,
                'reisID' => $reisID,
                'reisIDPattern' => $reisID . '%' // This will match ReisID + extras (ReisIDa, ReisIDb, etc.)
            ]);
            
            $deletedCount = $stmt->rowCount();
            error_log("Delete result: " . ($result ? 'SUCCESS' : 'FAILED') . " - Deleted $deletedCount rows for ReisID: $reisID");
            
            echo json_encode(['success' => true, 'message' => "Deleted $deletedCount items successfully"]);
        } catch (PDOException $e) {
            error_log("Database error in item deletion: " . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }
}

// Handle new item insertion (original functionality)
// Get JSON POST data
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    error_log("No JSON data received for new item insertion");
    echo json_encode(['success' => false, 'error' => 'No data received']);
    exit;
}

error_log("New item insertion request - ReisID: " . ($data['ReisID'] ?? 'MISSING'));
error_log("Bed_configuratie_ID received: " . var_export($data['Bed_configuratie_ID'] ?? 'NOT_SET', true));
error_log("Full data received: " . json_encode($data));

// Prepare SQL
$sql = "INSERT INTO Reis_info (
    ReisID, UID, Sequence, Datum_aanvang, Tijd_aanvang, Datum_einde, Tijd_einde,
    Locatie_stad, Locaties_adres, Inbounder, Inbounder_bookingref,
    Supplier_naam, Supplier_product, Supplier_bookingref,
    Service, Product_type, Product_code, Bed_configuratie_ID,
    Nett, Nett_valuta, Gross, Gross_valuta,
    Beschrijving_kort, Beschrijving_lang, Note_random, Note_alert
) VALUES (
    :ReisID, :UID, :Sequence, :Datum_aanvang, :Tijd_aanvang, :Datum_einde, :Tijd_einde,
    :Locatie_stad, :Locaties_adres, :Inbounder, :Inbounder_bookingref,
    :Supplier_naam, :Supplier_product, :Supplier_bookingref,
    :Service, :Product_type, :Product_code, :Bed_configuratie_ID,
    :Nett, :Nett_valuta, :Gross, :Gross_valuta,
    :Beschrijving_kort, :Beschrijving_lang, :Note_random, :Note_alert
)";

$stmt = $pdo->prepare($sql);

// Bind values safely
$params = [
    'ReisID' => $data['ReisID'] ?? '',
    'UID' => $data['UID'] ?? '',
    'Sequence' => $data['Sequence'] ?? 0,
    'Datum_aanvang' => $data['Datum_aanvang'] ?? null,
    'Tijd_aanvang' => $data['Tijd_aanvang'] ?? '',
    'Datum_einde' => $data['Datum_einde'] ?? null,
    'Tijd_einde' => $data['Tijd_einde'] ?? '',
    'Locatie_stad' => $data['Locatie_stad'] ?? '',
    'Locaties_adres' => $data['Locaties_adres'] ?? '',
    'Inbounder' => $data['Inbounder'] ?? '',
    'Inbounder_bookingref' => $data['Inbounder_bookingref'] ?? '',
    'Supplier_naam' => $data['Supplier_naam'] ?? '',
    'Supplier_product' => $data['Supplier_product'] ?? '',
    'Supplier_bookingref' => $data['Supplier_bookingref'] ?? '',
    'Service' => $data['Service'] ?? '',
    'Product_type' => $data['Product_type'] ?? '',
    'Product_code' => $data['Product_code'] ?? '',
    'Bed_configuratie_ID' => !empty($data['Bed_configuratie_ID']) ? intval($data['Bed_configuratie_ID']) : null,
    'Nett' => $data['Nett'] ?? null,
    'Nett_valuta' => $data['Nett_valuta'] ?? '',
    'Gross' => $data['Gross'] ?? null,
    'Gross_valuta' => $data['Gross_valuta'] ?? '',
    'Beschrijving_kort' => $data['Beschrijving_kort'] ?? '',
    'Beschrijving_lang' => $data['Beschrijving_lang'] ?? '',
    'Note_random' => $data['Note_random'] ?? '',
    'Note_alert' => $data['Note_alert'] ?? ''
];

try {
    $stmt->execute($params);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
