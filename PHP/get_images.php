<?php
session_start();

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

header('Content-Type: application/json');

include 'db.php';

$code = $_GET['code'] ?? '';

if (empty($code)) {
    echo json_encode(['error' => 'Code is required']);
    exit();
}

try {
    $conn = connectDB();
    $stmt = $conn->prepare("SELECT Location, Sequence, Mediatype FROM Media WHERE Code = ? AND Mediatype IN ('image', '360', 'video') ORDER BY Sequence ASC");
    $stmt->execute([$code]);
    $media = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process media items to add thumbnails for videos
    $processedMedia = [];
    foreach ($media as $item) {
        $processedItem = $item;
        
        if ($item['Mediatype'] === 'video') {
            // Extract YouTube video ID and create thumbnail
            $videoId = extractYouTubeId($item['Location']);
            if ($videoId) {
                $processedItem['videoId'] = $videoId;
                // Try multiple thumbnail qualities as fallback
                $thumbnailUrls = [
                    "https://img.youtube.com/vi/{$videoId}/maxresdefault.jpg",
                    "https://img.youtube.com/vi/{$videoId}/hqdefault.jpg",
                    "https://img.youtube.com/vi/{$videoId}/mqdefault.jpg",
                    "https://img.youtube.com/vi/{$videoId}/default.jpg"
                ];
                
                // Use the highest quality available
                $processedItem['thumbnail'] = $thumbnailUrls[0];
                $processedItem['thumbnailFallbacks'] = $thumbnailUrls;
            }
        }
        
        $processedMedia[] = $processedItem;
    }
    
    echo json_encode([
        'success' => true,
        'media' => $processedMedia
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function extractYouTubeId($url) {
    $patterns = [
        '/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/',
        '/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/'
    ];
    
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $url, $matches)) {
            return $matches[1];
        }
    }
    
    return null;
}
?>
