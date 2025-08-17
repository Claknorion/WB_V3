<?php
session_start();

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$role = $_SESSION['user']['Role'];
if (!in_array($role, ['employee', 'admin'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied']);
    exit();
}

header('Content-Type: application/json');

include '../db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Get parameters
    $code = $_POST['code'] ?? '';
    $type = $_POST['type'] ?? 'hotel'; // 'hotel' or 'room' or 'tour'
    $mediaType = $_POST['mediaType'] ?? 'image'; // 'image', '360', 'video'
    $youtubeUrl = $_POST['youtubeUrl'] ?? '';
    
    if (empty($code)) {
        throw new Exception('Code is required');
    }
    
    // Handle YouTube URL uploads
    if ($mediaType === 'video' && !empty($youtubeUrl)) {
        $videoId = extractYouTubeId($youtubeUrl);
        if (!$videoId) {
            throw new Exception('Invalid YouTube URL');
        }
        
        // Get the next sequence number
        $conn = connectDB();
        $stmt = $conn->prepare("SELECT COALESCE(MAX(Sequence), 0) + 1 as NextSequence FROM Media WHERE Code = ?");
        $stmt->execute([$code]);
        $sequence = $stmt->fetchColumn();
        
        // Store YouTube video
        $stmt = $conn->prepare("INSERT INTO Media (Code, Mediatype, Location, Sequence) VALUES (?, 'video', ?, ?)");
        $stmt->execute([$code, $youtubeUrl, $sequence]);
        
        echo json_encode([
            'success' => true,
            'message' => 'YouTube video added successfully',
            'mediaType' => 'video',
            'location' => $youtubeUrl,
            'videoId' => $videoId,
            'sequence' => $sequence
        ]);
        exit;
    }
    
    // Handle file uploads
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No file uploaded or upload error');
    }
    
    $file = $_FILES['image'];
    
    // Validate file type based on media type
    if ($mediaType === 'image') {
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        $maxSize = 5 * 1024 * 1024; // 5MB
    } elseif ($mediaType === '360') {
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        $maxSize = 15 * 1024 * 1024; // 15MB for 360 images
    } else {
        throw new Exception('Invalid media type');
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        $typeList = implode(', ', array_map(function($t) { return strtoupper(str_replace('image/', '', $t)); }, $allowedTypes));
        throw new Exception("Invalid file type. Only {$typeList} files are allowed.");
    }
    
    // Validate file size
    if ($file['size'] > $maxSize) {
        $maxSizeMB = $maxSize / (1024 * 1024);
        throw new Exception("File too large. Maximum size is {$maxSizeMB}MB.");
    }
    
    // Create upload directory structure
    $baseUploadDir = '../Pictures/';
    if ($type === 'hotel') {
        $uploadDir = $baseUploadDir . 'Hotels/';
    } elseif ($type === 'room') {
        $uploadDir = $baseUploadDir . 'Rooms/';
    } else {
        $uploadDir = $baseUploadDir . 'Tours/';
    }
    
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }
    
    // Generate unique filename with media type prefix
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $prefix = ($mediaType === '360') ? '360_' : '';
    $filename = $prefix . $code . '_' . time() . '_' . rand(1000, 9999) . '.' . $extension;
    $filePath = $uploadDir . $filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Failed to move uploaded file');
    }
    
    // Get the next sequence number for this code
    $conn = connectDB();
    $stmt = $conn->prepare("SELECT COALESCE(MAX(Sequence), 0) + 1 as NextSequence FROM Media WHERE Code = ?");
    $stmt->execute([$code]);
    $sequence = $stmt->fetchColumn();
    
    // Insert into Media table with correct media type
    $relativeLocation = str_replace('../', '', $filePath); // Store relative path
    $stmt = $conn->prepare("INSERT INTO Media (Code, Mediatype, Location, Sequence) VALUES (?, ?, ?, ?)");
    $stmt->execute([$code, $mediaType, $relativeLocation, $sequence]);
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => ucfirst($mediaType) . ' uploaded successfully',
        'filename' => $filename,
        'location' => $relativeLocation,
        'mediaType' => $mediaType,
        'sequence' => $sequence
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
