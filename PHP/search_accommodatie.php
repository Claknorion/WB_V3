<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Start output buffering to prevent stray output
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // if needed for CORS

require_once 'db.php'; // adjust path if needed
require_once 'rich-text-helpers.php'; // For rich text processing
$pdo = connectDB();

$stad = isset($_GET['stad']) ? trim($_GET['stad']) : '';
$query = isset($_GET['query']) ? trim($_GET['query']) : '';

try {
    $sql = "
        SELECT 
            pa.Code,
            pa.Product,
            pa.Locatie_stad,
            pa.Locatie_straat,
            pa.Locatie_land,
            pa.Beschrijving_kort,
            pa.Beschrijving_lang,
            pa.Inbounder,
            pi.Currency,
            MIN(p.Gross) AS Gross,
            MIN(p.Nett) AS Nett,
            (
                SELECT Location
                FROM Media
                WHERE Media.Code = pa.Code AND Mediatype = 'image'
                ORDER BY Sequence ASC
                LIMIT 1
            ) AS Foto
        FROM Product_accommodatie pa
        LEFT JOIN Product_accommodatie_product p ON p.Code = pa.Code AND (p.Active IS NULL OR p.Active = 1)
        LEFT JOIN Inbounder_info pi ON pi.Code = pa.Inbounder
        WHERE pa.Locatie_stad LIKE :stad
        AND (pa.Active IS NULL OR pa.Active = 1)
    ";

    if ($query !== '') {
        $sql .= " AND pa.Product LIKE :query";
    }

    $sql .= " GROUP BY pa.Code ORDER BY Gross ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':stad', "%$stad%");
    if ($query !== '') {
        $stmt->bindValue(':query', "%$query%");
    }

    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [];

    foreach ($results as $row) {
        // Determine currency
        $currency = 'EUR'; // default fallback
        if (!empty($row['Currency'])) {
            if (strtolower($row['Currency']) === 'country') {
                $land = strtolower($row['Locatie_land']);
                if (strpos($land, 'australi') !== false) {
                    $currency = 'AUD';
                } elseif (strpos($land, 'nieuw') !== false || strpos($land, 'new zealand') !== false) {
                    $currency = 'NZD';
                }
            } else {
                $currency = strtoupper($row['Currency']);
            }
        }

        // Format prices
        $formattedGross = is_numeric($row['Gross']) ? number_format((float)$row['Gross'], 2, ',', '.') : null;
        $formattedNett = is_numeric($row['Nett']) ? number_format((float)$row['Nett'], 2, ',', '.') : null;

        $prijsVanaf = ($formattedGross !== null) ? $formattedGross : 'geen prijs bekend';

        $response[] = [
            'Code' => $row['Code'],
            'Product' => $row['Product'],
            'Locatie_stad' => $row['Locatie_stad'],
            'Locatie_straat' => $row['Locatie_straat'],
            'Beschrijving_kort' => displayRichText($row['Beschrijving_kort']),
            'Beschrijving_lang' => displayRichText($row['Beschrijving_lang']),
            'Inbounder' => $row['Inbounder'],
            'Prijs_vanaf' => $prijsVanaf,
            'Gross' => $formattedGross,
            'Nett' => $formattedNett,
            'Gross_raw' => $row['Gross'],
            'Nett_raw' => $row['Nett'],
            'Currency' => $currency,
            'Foto' => $row['Foto']
        ];
    }

    // Optional logging for debugging - comment out if not needed
    // file_put_contents('log.json', json_encode($results, JSON_PRETTY_PRINT));

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
