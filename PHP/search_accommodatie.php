<?php
require_once 'db.php'; // adjust this to your actual DB connection file
$pdo = connectDB();

header('Content-Type: application/json');

$stad = isset($_GET['stad']) ? trim($_GET['stad']) : '';
$query = isset($_GET['query']) ? trim($_GET['query']) : '';

try {
    $sql = "
        SELECT 
            pa.Code,
            pa.Product,
            pa.Locatie_stad,
            pa.Locatie_land,
            pa.Beschrijving_kort,
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
        LEFT JOIN Product_accommodatie_product p ON p.Code = pa.Code
        LEFT JOIN Inbounder_info pi ON pi.Code = pa.Inbounder
        WHERE pa.Locatie_stad LIKE :stad
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
        // Currency logic
        $currency = 'EUR'; // default
        if (!empty($row['Currency'])) {
            if (strtolower($row['Currency']) === 'country') {
                $land = strtolower($row['Locatie_land']);
                if (strpos($land, 'australi') !== false) {
                    $currency = 'AUD';
                } elseif (strpos($land, 'nieuw') !== false || strpos($land, 'new zealand') !== false) {
                    $currency = 'NZD';
                } else {
                    $currency = 'EUR'; // unknown fallback
                }
            } else {
                $currency = strtoupper($row['Currency']);
            }
        }

        // Format gross/nett prices or fallback message
        $formattedGross = is_numeric($row['Gross']) ? number_format((float)$row['Gross'], 2, ',', '.') : null;
        $formattedNett = is_numeric($row['Nett']) ? number_format((float)$row['Nett'], 2, ',', '.') : null;

        $prijsVanaf = ($formattedGross !== null) ? $formattedGross : 'geen prijs bekend';

        $response[] = [
            'Code' => $row['Code'],
            'Product' => $row['Product'],
            'Locatie_stad' => $row['Locatie_stad'],
            'Beschrijving_kort' => $row['Beschrijving_kort'],
            'Prijs_vanaf' => $prijsVanaf,
            'Gross' => $formattedGross,
            'Nett' => $formattedNett,
            'Gross_raw' => $row['Gross'],
            'Nett_raw' => $row['Nett'],
            'Currency' => $currency,
            'Foto' => $row['Foto']
        ];
    }

    file_put_contents('log.json', json_encode($results, JSON_PRETTY_PRINT));

    echo json_encode($response);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
