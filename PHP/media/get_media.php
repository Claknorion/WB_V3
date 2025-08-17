<?php
// get_media.php - Load media from database for picture slider
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../db.php';

try {
    $pdo = connectDB();
    
    $code = $_GET['code'] ?? '';
    $additionalCode = $_GET['additional_code'] ?? '';
    
    if (empty($code)) {
        echo json_encode(['success' => false, 'error' => 'Code parameter is required']);
        exit;
    }
    
    // Build SQL query to get media
    // Priority: Sequence 1, 2, 3... then Sequence 0 (random)
    $sql = "
        SELECT 
            Code,
            Location,
            Mediatype,
            Note_short,
            Note_long,
            Sequence
        FROM Media 
        WHERE (Code = :code";
    
    $params = ['code' => $code];
    
    // Add additional code if provided (for room-specific images)
    if (!empty($additionalCode)) {
        $sql .= " OR Code = :additional_code";
        $params['additional_code'] = $additionalCode;
    }
    
    $sql .= ")
        ORDER BY 
            CASE 
                WHEN Sequence IS NULL THEN 999
                WHEN Sequence = 0 THEN 998 
                ELSE Sequence 
            END ASC,
            Code ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $media = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($media)) {
        echo json_encode([
            'success' => true, 
            'media' => [], 
            'message' => 'No media found for the specified code(s)'
        ]);
        exit;
    }
    
    // Process media data
    $processedMedia = [];
    
    foreach ($media as $item) {
        // Validate media type
        $mediaType = strtolower($item['Mediatype'] ?? 'image');
        $validTypes = ['image', 'video', 'youtube', '360'];
        
        if (!in_array($mediaType, $validTypes)) {
            $mediaType = 'image'; // Default to image for unknown types
        }
        
        // Process location/URL
        $location = $item['Location'] ?? '';
        
        // Check if this is a YouTube URL and adjust media type
        if ($mediaType === 'video' && (strpos($location, 'youtube.com') !== false || strpos($location, 'youtu.be') !== false)) {
            $mediaType = 'youtube'; // Picture slider expects 'youtube' type for YouTube videos
        }
        
        // Handle different path formats
        if (!empty($location) && !preg_match('/^https?:\/\//', $location)) {
            if (strpos($location, '/Pictures/') === 0) {
                // Absolute path starting with /Pictures/ - convert to relative
                $location = '..' . $location;
            } elseif (strpos($location, 'Pictures/') === 0) {
                // Relative path starting with Pictures/ - add ../
                $location = '../' . $location;
            } else {
                // Other relative path - assume Pictures subfolder
                $location = '../Pictures/' . ltrim($location, '/');
            }
        }
        
        $processedMedia[] = [
            'Code' => $item['Code'],
            'Location' => $location,
            'Mediatype' => $mediaType,
            'Note_short' => $item['Note_short'] ?? '',
            'Note_long' => $item['Note_long'] ?? '',
            'Sequence' => $item['Sequence'] !== null ? (int)$item['Sequence'] : 0
        ];
    }
    
    // Log the request for debugging
    error_log("Media request - Code: $code" . 
              ($additionalCode ? ", Additional: $additionalCode" : "") . 
              ", Found: " . count($processedMedia) . " items");
    
    echo json_encode([
        'success' => true,
        'media' => $processedMedia,
        'total' => count($processedMedia),
        'codes_searched' => array_filter([$code, $additionalCode])
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in get_media.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'error' => 'Database error occurred',
        'details' => $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("General error in get_media.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'error' => 'An error occurred while loading media',
        'details' => $e->getMessage()
    ]);
}
?>
