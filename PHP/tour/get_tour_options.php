<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../db.php';

// Initialize database connection
$pdo = connectDB();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    if (!isset($_GET['code']) || empty($_GET['code'])) {
        throw new Exception('Tour code is required');
    }

    $tourCode = $_GET['code'];
    
    // First check if the PDO connection is working
    if (!$pdo) {
        throw new Exception('Database connection failed');
    }
    
    // Get tour details first - check if tours use Inbounder like accommodations
        $sql = "SELECT 
                ptp.Code,
                ptp.tourID,
                ptp.Productnaam as Product,
                ptp.Beschrijving_lang,
                ptp.Beschrijving_kort,
                ptp.Locatie_stad,
                ptp.Locaties_adres,
                ptp.Gross,
                ptp.Nett,
                ptp.Days,
                ptp.Hours,
                pt.Inbounder,
                pt.Supplier,
                ii.Currency
            FROM Product_tours_product ptp
            LEFT JOIN Product_tours pt ON pt.Code = ptp.Code
            LEFT JOIN Inbounder_info ii ON ii.Code = pt.Inbounder
            WHERE ptp.Code = :code";    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':code', $tourCode);
    $stmt->execute();
    $tour = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tour) {
        // Return empty data instead of error for missing tour
        $response = [
            'tour' => null,
            'inclusions' => [],
            'exclusions' => [],
            'extras' => [],
            'currency' => 'EUR',
            'debug' => [
                'tour_code' => $tourCode,
                'message' => 'Tour not found in Product_tours_product'
            ]
        ];
        ob_clean();
        echo json_encode($response);
        exit;
    }
    
    // Get the tourID for options lookup
    $tourID = $tour['tourID'];
    
    // Get tour options - make this optional in case table is empty
    $inclusions = [];
    $exclusions = [];
    $extras = [];
    
    try {
        // Use the tourID to find options
        $optionsSql = "SELECT 
                          pto.tourIDextra,
                          pto.Code,
                          pto.Inclusief,
                          pto.Exclusief,
                          pto.Extra,
                          pto.perPax,
                          pto.perTour,
                          pto.canAddMore,
                          pto.Nett,
                          pto.Gross
                       FROM Product_tours_opties pto
                       WHERE pto.Code = :tourID";
        
        $optionsStmt = $pdo->prepare($optionsSql);
        $optionsStmt->bindParam(':tourID', $tourID);
        $optionsStmt->execute();
        $options = $optionsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Process options if any exist
        foreach ($options as $option) {
            // Process Inclusief field (what's included)
            if (!empty($option['Inclusief'])) {
                $inclusions[] = [
                    'description' => $option['Inclusief'],
                    'extra_cost' => 0,
                    'included' => 1,
                    'type' => 'inclusion'
                ];
            }
            
            // Process Exclusief field (what's excluded)
            if (!empty($option['Exclusief'])) {
                $exclusions[] = [
                    'description' => $option['Exclusief'],
                    'extra_cost' => 0,
                    'included' => 0,
                    'type' => 'exclusion'
                ];
            }
            
            // Process Extra field (optional extras with cost)
            if (!empty($option['Extra']) && ($option['Gross'] > 0 || $option['Nett'] > 0)) {
                $extras[] = [
                    'description' => $option['Extra'],
                    'Extra' => $option['Extra'], // Include the raw Extra field
                    'extra_cost' => floatval($option['Gross'] ?? 0),
                    'nett_cost' => floatval($option['Nett'] ?? 0),
                    'perPax' => intval($option['perPax']),
                    'perTour' => intval($option['perTour']),
                    'canAddMore' => intval($option['canAddMore']),
                    'included' => 0,
                    'type' => 'extra',
                    'tourIDextra' => $option['tourIDextra']
                ];
            }
        }
        
        $optionsDebug = [
            'options_found' => count($options),
            'tour_id_used' => $tourID,
            'raw_options' => $options
        ];
        
    } catch (Exception $optionsError) {
        // If options table doesn't exist or has errors, continue without options
        $optionsDebug = [
            'options_error' => $optionsError->getMessage(),
            'options_found' => 0
        ];
    }
    
    // Use currency from Inbounder_info if available, otherwise fallback to location-based detection
    $currency = 'EUR'; // default fallback
    if (!empty($tour['Currency'])) {
        $currency = strtoupper($tour['Currency']);
    } else {
        // Fallback: determine by city if no currency from Inbounder_info
        $stad = strtolower($tour['Locatie_stad']);
        if (strpos($stad, 'sydney') !== false || strpos($stad, 'melbourne') !== false || 
            strpos($stad, 'brisbane') !== false || strpos($stad, 'ayers rock') !== false ||
            strpos($stad, 'uluru') !== false || strpos($stad, 'cairns') !== false) {
            $currency = 'AUD';
        } elseif (strpos($stad, 'auckland') !== false || strpos($stad, 'wellington') !== false ||
                  strpos($stad, 'christchurch') !== false || strpos($stad, 'queenstown') !== false) {
            $currency = 'NZD';
        }
    }
    
    $response = [
        'tour' => $tour,
        'inclusions' => $inclusions,
        'exclusions' => $exclusions,
        'extras' => $extras,
        'currency' => $currency,
        'debug' => [
            'tour_code' => $tourCode,
            'options_debug' => $optionsDebug,
            'inclusions_count' => count($inclusions),
            'exclusions_count' => count($exclusions),
            'extras_count' => count($extras),
            'raw_currency_from_db' => $tour['Currency'] ?? 'NULL',
            'inbounder_code' => $tour['Inbounder'] ?? 'NULL',
            'final_currency' => $currency,
            'city' => $tour['Locatie_stad'] ?? 'NULL'
        ]
    ];
    
    ob_clean();
    echo json_encode($response);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    ob_clean();
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    exit;
}
?>
