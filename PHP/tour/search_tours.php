<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Start output buffering to prevent stray output
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // if needed for CORS

require_once '../db.php'; // adjust path if needed
$pdo = connectDB();

$stad = isset($_GET['stad']) ? trim($_GET['stad']) : '';
$query = isset($_GET['query']) ? trim($_GET['query']) : '';

try {
    $sql = "
        SELECT 
            ptp.tourID,
            ptp.Code,
            ptp.Productnaam,
            ptp.Beschrijving_kort,
            ptp.Beschrijving_lang,
            ptp.Locatie_stad,
            ptp.Locaties_adres,
            ptp.Nett,
            ptp.Gross,
            ptp.Days,
            ptp.Hours,
            pt.Locatie_land,
            pt.Inbounder,
            pt.Supplier,
            COALESCE(ii.Currency, 'EUR') AS Currency,
            (
                SELECT Location
                FROM Media
                WHERE Media.Code = ptp.tourID AND Mediatype = 'image'
                ORDER BY Sequence ASC
                LIMIT 1
            ) AS Foto
        FROM Product_tours_product ptp
        LEFT JOIN Product_tours pt ON pt.Code = ptp.Code
        LEFT JOIN Inbounder_info ii ON ii.Code = pt.Inbounder
        WHERE (ptp.Active IS NULL OR ptp.Active = 1)
    ";

    $params = [];
    
    if ($stad !== '') {
        $sql .= " AND ptp.Locatie_stad LIKE :stad";
        $params[':stad'] = "%$stad%";
    }

    if ($query !== '') {
        $sql .= " AND ptp.Productnaam LIKE :query";
        $params[':query'] = "%$query%";
    }

    $sql .= " ORDER BY ptp.Locatie_stad, ptp.Productnaam LIMIT 50";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }

    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [];

    foreach ($results as $row) {
        // Use currency from Inbounder_info if available, otherwise fallback to location-based detection
        $currency = 'EUR'; // default fallback
        if (!empty($row['Currency'])) {
            $currency = strtoupper($row['Currency']);
        } else {
            // Fallback: determine by city if no currency from Inbounder_info
            $stad = strtolower($row['Locatie_stad']);
            if (strpos($stad, 'sydney') !== false || strpos($stad, 'melbourne') !== false || 
                strpos($stad, 'brisbane') !== false || strpos($stad, 'ayers rock') !== false ||
                strpos($stad, 'uluru') !== false || strpos($stad, 'cairns') !== false) {
                $currency = 'AUD';
            } elseif (strpos($stad, 'auckland') !== false || strpos($stad, 'wellington') !== false ||
                      strpos($stad, 'christchurch') !== false || strpos($stad, 'queenstown') !== false) {
                $currency = 'NZD';
            }
        }

        // Format prices
        $formattedGross = is_numeric($row['Gross']) ? number_format((float)$row['Gross'], 2, ',', '.') : null;
        $formattedNett = is_numeric($row['Nett']) ? number_format((float)$row['Nett'], 2, ',', '.') : null;

        $response[] = [
            'tourID' => $row['tourID'],
            'Code' => $row['Code'],
            'Product' => $row['Productnaam'], // Map to expected field name
            'Locatie_stad' => $row['Locatie_stad'],
            'Locatie_land' => $row['Locatie_land'],
            'Locaties_adres' => $row['Locaties_adres'],
            'Beschrijving_kort' => $row['Beschrijving_kort'],
            'Beschrijving_lang' => $row['Beschrijving_lang'],
            'Currency' => $currency,
            'Gross' => $formattedGross,
            'Nett' => $formattedNett,
            'Gross_raw' => $row['Gross'],
            'Nett_raw' => $row['Nett'],
            'Days' => $row['Days'],
            'Hours' => $row['Hours'],
            'perPax' => '1', // Default for now
            'perTour' => '0', // Default for now
            'canAddMore' => '1', // Default for now
            'Foto' => $row['Foto']
        ];
    }

    // Clear buffer and output JSON
    ob_clean();
    echo json_encode($response);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    ob_clean();
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}
?>
