<?php
session_start();

if (!isset($_SESSION['user'])) {
    header("Location: ../auth/login.php");
    exit();
}

$role = $_SESSION['user']['Role'];
if (!in_array($role, ['employee', 'admin'])) {
    die("Access denied. Insufficient permissions.");
}

include '../db.php';
include '../utils/rich-text-helpers.php';

// Fetch dropdown options
$serviceOptions = [];
$kitchenOptions = [];
$inbounderOptions = [];

try {
    $conn = connectDB();
    
    // Get service options
    $stmt = $conn->prepare("SELECT DISTINCT Service FROM Product_accommodatie_instellingen WHERE Service IS NOT NULL AND Service != ''");
    $stmt->execute();
    $serviceOptions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Get kitchen options
    $stmt = $conn->prepare("SELECT DISTINCT Keuken FROM Product_accommodatie_instellingen WHERE Keuken IS NOT NULL AND Keuken != ''");
    $stmt->execute();
    $kitchenOptions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Get inbounder options
    $stmt = $conn->prepare("SELECT Code, Inbounder FROM Inbounder_info ORDER BY Inbounder");
    $stmt->execute();
    $inbounderOptions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    $error = "Error fetching dropdown options: " . $e->getMessage();
}

// Handle form submissions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $conn = connectDB();
        
        if (isset($_POST['action'])) {
            switch ($_POST['action']) {
                case 'add_hotel':
                    $stmt = $conn->prepare("
                        INSERT INTO Product_accommodatie (
                            Code, Product, Locatie_stad, Locatie_land, Locatie_straat,
                            Inbounder, Beschrijving_kort, Beschrijving_lang, ShowWeb, Active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $stmt->execute([
                        $_POST['code'],
                        $_POST['product'],
                        $_POST['city'],
                        $_POST['country'],
                        $_POST['address'],
                        $_POST['inbounder'],
                        $_POST['short_desc'],
                        $_POST['long_desc'],
                        $_POST['show_web'] ?? 0,
                        $_POST['active'] ?? 0
                    ]);
                    
                    $message = "Hotel added successfully!";
                    break;
                    
                case 'update_hotel':
                    $stmt = $conn->prepare("
                        UPDATE Product_accommodatie SET
                            Product = ?, Locatie_stad = ?, Locatie_land = ?, Locatie_straat = ?,
                            Inbounder = ?, Beschrijving_kort = ?, Beschrijving_lang = ?, 
                            ShowWeb = ?, Active = ?
                        WHERE Code = ?
                    ");
                    
                    $stmt->execute([
                        $_POST['product'],
                        $_POST['city'],
                        $_POST['country'],
                        $_POST['address'],
                        $_POST['inbounder'],
                        $_POST['short_desc'],
                        $_POST['long_desc'],
                        $_POST['show_web'] ?? 0,
                        $_POST['active'] ?? 0,
                        $_POST['code']
                    ]);
                    
                    $message = "Hotel updated successfully!";
                    break;
                    
                case 'delete_hotel':
                    // First check if hotel is used in any bookings
                    $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM Reis_info WHERE Product_code = ?");
                    $checkStmt->execute([$_POST['code']]);
                    $usage = $checkStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($usage['count'] > 0) {
                        $error = "Cannot delete hotel - it's used in {$usage['count']} booking(s).";
                    } else {
                        $stmt = $conn->prepare("DELETE FROM Product_accommodatie WHERE Code = ?");
                        $stmt->execute([$_POST['code']]);
                        $message = "Hotel deleted successfully!";
                    }
                    break;
            }
        }
    } catch (Exception $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

// Fetch hotels for display
try {
    $conn = connectDB();
    $stmt = $conn->prepare("
        SELECT h.*, i.Inbounder as InbounderName 
        FROM Product_accommodatie h
        LEFT JOIN Inbounder_info i ON h.Inbounder = i.Code
        ORDER BY h.Locatie_stad, h.Product
    ");
    $stmt->execute();
    $hotels = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $error = "Error fetching hotels: " . $e->getMessage();
    $hotels = [];
}

// Get specific hotel for editing
$editHotel = null;
if (isset($_GET['edit'])) {
    try {
        $stmt = $conn->prepare("SELECT * FROM Product_accommodatie WHERE Code = ?");
        $stmt->execute([$_GET['edit']]);
        $editHotel = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $error = "Error fetching hotel for edit: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hotel Management</title>
    <link rel="stylesheet" href="../CSS/styles.css">
    <link rel="stylesheet" href="../CSS/management.css">
    
    <!-- Quill.js Rich Text Editor -->
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
    <script src="../JS/rich-text-editor.js"></script>
    <script src="../JS/management.js"></script>
</head>
<body>
    <div class="management-container">
        <h1>Hotel Management</h1>
        
        <nav style="margin-bottom: 20px;">
            <a href="../dashboard.php" class="btn btn-secondary">← Back to Dashboard</a>
            <a href="tour_management.php" class="btn btn-secondary">Tour Management</a>
        </nav>
        
        <?php if ($message): ?>
            <div class="message success"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="message error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <!-- Add/Edit Hotel Form -->
        <div class="form-section">
            <h2><?= $editHotel ? 'Edit Hotel' : 'Add New Hotel' ?></h2>
            
            <form method="POST" action="">
                <input type="hidden" name="action" value="<?= $editHotel ? 'update_hotel' : 'add_hotel' ?>">
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="code">Hotel Code *</label>
                        <input type="text" id="code" name="code" 
                               value="<?= htmlspecialchars($editHotel['Code'] ?? '') ?>"
                               <?= $editHotel ? 'readonly' : '' ?> required>
                    </div>
                    <div class="form-group">
                        <label for="product">Hotel Name *</label>
                        <input type="text" id="product" name="product" 
                               value="<?= htmlspecialchars($editHotel['Product'] ?? '') ?>" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="city">City *</label>
                        <input type="text" id="city" name="city" 
                               value="<?= htmlspecialchars($editHotel['Locatie_stad'] ?? '') ?>" required>
                    </div>
                    <div class="form-group">
                        <label for="country">Country *</label>
                        <select id="country" name="country" required>
                            <option value="">Select Country</option>
                            <option value="Australië" <?= ($editHotel['Locatie_land'] ?? '') == 'Australië' ? 'selected' : '' ?>>Australië</option>
                            <option value="Nieuw-Zeeland" <?= ($editHotel['Locatie_land'] ?? '') == 'Nieuw-Zeeland' ? 'selected' : '' ?>>Nieuw-Zeeland</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="address">Address</label>
                        <input type="text" id="address" name="address" 
                               value="<?= htmlspecialchars($editHotel['Locatie_straat'] ?? '') ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="inbounder">Inbounder</label>
                        <select id="inbounder" name="inbounder">
                            <option value="">Select Inbounder</option>
                            <?php foreach ($inbounderOptions as $inbounder): ?>
                                <option value="<?= htmlspecialchars($inbounder['Code']) ?>" 
                                        <?= ($editHotel['Inbounder'] ?? '') == $inbounder['Code'] ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($inbounder['Inbounder']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="short_desc">Short Description</label>
                        <?= generateRichTextEditor('short_desc', $editHotel['Beschrijving_kort'] ?? '', 'Enter short description...') ?>
                    </div>
                    <div class="form-group">
                        <label for="long_desc">Long Description</label>
                        <?= generateRichTextEditor('long_desc', $editHotel['Beschrijving_lang'] ?? '', 'Enter detailed description...') ?>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="active" value="1" 
                                   <?= ($editHotel['Active'] ?? 1) ? 'checked' : '' ?>>
                            <strong>Active</strong> - Available in search tools
                        </label>
                        <small style="color: #666;">When unchecked, hotel won't appear in trip creator search</small>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="show_web" value="1" 
                                   <?= ($editHotel['ShowWeb'] ?? 0) ? 'checked' : '' ?>>
                            <strong>Show on Website</strong> - Display on public website
                        </label>
                        <small style="color: #666;">When checked, hotel will be visible to public visitors</small>
                    </div>
                </div>
                
                <!-- Image Upload Section -->
                <?php if ($editHotel): ?>
                <div class="form-section">
                    <h3>Hotel Media</h3>
                    
                    <!-- Media Type Selector -->
                    <div class="media-type-selector">
                        <label>
                            <input type="radio" name="mediaType" value="image" checked>
                            📷 Regular Images
                        </label>
                        <label>
                            <input type="radio" name="mediaType" value="360">
                            🌐 360° Images
                        </label>
                        <label>
                            <input type="radio" name="mediaType" value="video">
                            🎥 YouTube Videos
                        </label>
                    </div>
                    
                    <div class="image-upload-container">
                        <!-- File Upload Area -->
                        <div class="drag-drop-area" id="dragDropArea">
                            <div class="drag-drop-content">
                                <i class="upload-icon">📷</i>
                                <p id="uploadText">Drag & drop images here or <span class="browse-link">browse files</span></p>
                                <input type="file" id="imageInput" accept="image/*" multiple style="display: none;">
                                <small id="uploadHelp">Supported formats: JPEG, PNG, WebP (Max 5MB each)</small>
                            </div>
                        </div>
                        
                        <!-- YouTube URL Input -->
                        <div class="youtube-input-area" id="youtubeInputArea" style="display: none;">
                            <div class="youtube-input-content">
                                <i class="upload-icon">🎥</i>
                                <p>Add YouTube Video</p>
                                <input type="url" id="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." style="margin: 10px 0; padding: 10px; width: 100%; border: 2px solid #ddd; border-radius: 5px;">
                                <button type="button" id="addYoutubeBtn" class="btn" style="padding: 8px 16px;">Add Video</button>
                                <small>Paste any YouTube URL (watch, share, or embed format)</small>
                            </div>
                        </div>
                        
                        <div class="image-gallery" id="imageGallery">
                            <!-- Media will be loaded here -->
                        </div>
                    </div>
                </div>
                <?php endif; ?>
                
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn"><?= $editHotel ? 'Update Hotel' : 'Add Hotel' ?></button>
                    <?php if ($editHotel): ?>
                        <a href="hotel_management.php" class="btn btn-secondary">Cancel Edit</a>
                    <?php endif; ?>
                </div>
            </form>
        </div>
        
        <!-- Hotels List -->
        <div class="list-section">
            <h2>Existing Hotels (<?= count($hotels) ?>)</h2>
            
            <div class="search-filter">
                <input type="text" id="hotelSearch" placeholder="Search hotels by name, city, or code..." 
                       onkeyup="filterHotels()">
            </div>
            
            <table class="hotels-table" id="hotelsTable">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Hotel Name</th>
                        <th>City</th>
                        <th>Country</th>
                        <th>Location</th>
                        <th>Inbounder</th>
                        <th>Rooms</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($hotels as $hotel): ?>
                        <tr>
                            <td><?= htmlspecialchars($hotel['Code']) ?></td>
                            <td><?= htmlspecialchars($hotel['Product']) ?></td>
                            <td><?= htmlspecialchars($hotel['Locatie_stad']) ?></td>
                            <td><?= htmlspecialchars($hotel['Locatie_land']) ?></td>
                            <td>
                                <?php if (!empty($hotel['Locatie_straat'])): ?>
                                    <?php 
                                        $address = urlencode($hotel['Locatie_straat'] . ', ' . $hotel['Locatie_stad'] . ', ' . $hotel['Locatie_land']);
                                        $mapsUrl = "https://www.google.com/maps/search/?api=1&query=" . $address;
                                    ?>
                                    <a href="<?= $mapsUrl ?>" target="_blank" class="btn" style="font-size: 11px; padding: 3px 6px; background: #4285f4;">
                                        📍 View on Maps
                                    </a>
                                <?php else: ?>
                                    <span style="color: #999;">No address</span>
                                <?php endif; ?>
                            </td>
                            <td><?= htmlspecialchars($hotel['InbounderName'] ?? '') ?></td>
                            <td>
                                <a href="room_management.php?hotel=<?= urlencode($hotel['Code']) ?>" class="btn" style="font-size: 12px; padding: 5px 10px;">Manage Rooms</a>
                            </td>
                            <td>
                                <a href="?edit=<?= urlencode($hotel['Code']) ?>" class="btn" style="font-size: 12px; padding: 5px 10px;">Edit</a>
                                <form method="POST" style="display: inline;" 
                                      onsubmit="return confirm('Are you sure you want to delete this hotel?')">
                                    <input type="hidden" name="action" value="delete_hotel">
                                    <input type="hidden" name="code" value="<?= htmlspecialchars($hotel['Code']) ?>">
                                    <button type="submit" class="btn btn-danger" style="font-size: 12px; padding: 5px 10px;">Delete</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        // Media Upload Functionality - Clean Version
        <?php if ($editHotel): ?>
        document.addEventListener('DOMContentLoaded', function() {
            const dragDropArea = document.getElementById('dragDropArea');
            const youtubeInputArea = document.getElementById('youtubeInputArea');
            const imageInput = document.getElementById('imageInput');
            const imageGallery = document.getElementById('imageGallery');
            const hotelCode = '<?= htmlspecialchars($editHotel['Code']) ?>';
            const mediaTypeRadios = document.querySelectorAll('input[name="mediaType"]');
            const uploadText = document.getElementById('uploadText');
            const uploadHelp = document.getElementById('uploadHelp');
            const youtubeUrl = document.getElementById('youtubeUrl');
            const addYoutubeBtn = document.getElementById('addYoutubeBtn');
            
            console.log('Hotel management script started for:', hotelCode);
            
            // Load existing media
            loadExistingMedia();
            
            // Drag and drop events
            if (dragDropArea) {
                dragDropArea.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    dragDropArea.classList.add('drag-over');
                });
                
                dragDropArea.addEventListener('dragleave', function(e) {
                    e.preventDefault();
                    dragDropArea.classList.remove('drag-over');
                });
                
                dragDropArea.addEventListener('drop', function(e) {
                    e.preventDefault();
                    dragDropArea.classList.remove('drag-over');
                    const files = e.dataTransfer.files;
                    handleFiles(files);
                });
                
                dragDropArea.addEventListener('click', function() {
                    imageInput.click();
                });
            }
            
            // File input change
            if (imageInput) {
                imageInput.addEventListener('change', function(e) {
                    handleFiles(e.target.files);
                });
            }
            
            // Browse link click
            const browseLink = document.querySelector('.browse-link');
            if (browseLink) {
                browseLink.addEventListener('click', function(e) {
                    e.stopPropagation();
                    imageInput.click();
                });
            }
            
            // Media type change handler
            mediaTypeRadios.forEach(function(radio) {
                radio.addEventListener('change', function() {
                    updateUploadInterface(this.value);
                });
            });
            
            // YouTube add button
            if (addYoutubeBtn) {
                addYoutubeBtn.addEventListener('click', function() {
                    const url = youtubeUrl.value.trim();
                    if (url) {
                        uploadYouTubeVideo(url);
                    }
                });
            }
            
            function updateUploadInterface(mediaType) {
                if (mediaType === 'video') {
                    if (dragDropArea) dragDropArea.style.display = 'none';
                    if (youtubeInputArea) youtubeInputArea.style.display = 'block';
                } else {
                    if (dragDropArea) dragDropArea.style.display = 'block';
                    if (youtubeInputArea) youtubeInputArea.style.display = 'none';
                    
                    if (mediaType === '360') {
                        if (uploadText) uploadText.innerHTML = 'Drag & drop 360° images here or <span class="browse-link">browse files</span>';
                        if (uploadHelp) uploadHelp.textContent = 'Supported formats: JPEG, PNG (Max 15MB each)';
                        if (imageInput) imageInput.accept = 'image/jpeg,image/jpg,image/png';
                    } else {
                        if (uploadText) uploadText.innerHTML = 'Drag & drop images here or <span class="browse-link">browse files</span>';
                        if (uploadHelp) uploadHelp.textContent = 'Supported formats: JPEG, PNG, WebP (Max 5MB each)';
                        if (imageInput) imageInput.accept = 'image/*';
                    }
                    
                    // Re-attach browse link event
                    const newBrowseLink = document.querySelector('.browse-link');
                    if (newBrowseLink) {
                        newBrowseLink.addEventListener('click', function(e) {
                            e.stopPropagation();
                            imageInput.click();
                        });
                    }
                }
            }
            
            function handleFiles(files) {
                const selectedMediaType = document.querySelector('input[name="mediaType"]:checked');
                const mediaType = selectedMediaType ? selectedMediaType.value : 'image';
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type.startsWith('image/')) {
                        uploadImage(file, mediaType);
                    } else {
                        alert('Please only upload image files.');
                    }
                }
            }
            
            function uploadImage(file, mediaType) {
                mediaType = mediaType || 'image';
                const formData = new FormData();
                formData.append('image', file);
                formData.append('code', hotelCode);
                formData.append('mediaType', mediaType);
                
                fetch('image_upload.php', {
                    method: 'POST',
                    body: formData
                })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        loadExistingMedia();
                        alert('Upload successful!');
                    } else {
                        alert('Upload failed: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(function(error) {
                    alert('Upload failed: ' + error.message);
                });
            }
            
            function uploadYouTubeVideo(url) {
                const formData = new FormData();
                formData.append('youtubeUrl', url);
                formData.append('code', hotelCode);
                formData.append('mediaType', 'video');
                
                fetch('image_upload.php', {
                    method: 'POST',
                    body: formData
                })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        loadExistingMedia();
                        if (youtubeUrl) youtubeUrl.value = '';
                        alert('YouTube video added successfully!');
                    } else {
                        alert('Failed to add YouTube video: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(function(error) {
                    alert('Failed to add YouTube video: ' + error.message);
                });
            }
            
            function loadExistingMedia() {
                fetch('get_images.php?code=' + hotelCode)
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        displayMedia(data.media || []);
                    } else {
                        console.error('Failed to load media:', data.error);
                    }
                })
                .catch(function(error) {
                    console.error('Error loading media:', error);
                });
            }
            
            function displayMedia(mediaItems) {
                if (!imageGallery) return;
                
                imageGallery.innerHTML = '';
                
                for (let i = 0; i < mediaItems.length; i++) {
                    const item = mediaItems[i];
                    const mediaItem = document.createElement('div');
                    mediaItem.className = 'image-item';
                    mediaItem.draggable = true;
                    mediaItem.dataset.location = item.Location;
                    mediaItem.dataset.sequence = i;
                    
                    let mediaContent = '';
                    let badgeText = '';
                    let badgeClass = '';
                    
                    if (item.Mediatype === 'video') {
                        badgeText = '🎥 VIDEO';
                        badgeClass = 'type-video';
                        const videoId = extractYouTubeId(item.Location);
                        const thumbnailUrl = videoId ? 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg' : 'https://img.youtube.com/vi/default/default.jpg';
                        mediaContent = '<img src="' + thumbnailUrl + '" alt="Video Thumbnail" loading="lazy" onerror="this.src=\'https://img.youtube.com/vi/' + videoId + '/default.jpg\'">';
                        // Store video ID for playback
                        mediaItem.dataset.videoId = videoId || '';
                    } else if (item.Mediatype === '360') {
                        badgeText = '🌐 360°';
                        badgeClass = 'type-360';
                        mediaContent = '<img src="../' + item.Location + '" alt="360° Image" loading="lazy">';
                    } else {
                        badgeText = '📷 IMAGE';
                        badgeClass = 'type-image';
                        mediaContent = '<img src="../' + item.Location + '" alt="Hotel Image" loading="lazy">';
                    }
                    
                    // Create elements safely
                    const sequenceDiv = document.createElement('div');
                    sequenceDiv.className = 'sequence-number';
                    sequenceDiv.textContent = (i + 1);
                    
                    const badgeDiv = document.createElement('div');
                    badgeDiv.className = 'media-type-badge ' + badgeClass;
                    badgeDiv.textContent = badgeText;
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.innerHTML = mediaContent;
                    
                    const overlayDiv = document.createElement('div');
                    overlayDiv.className = 'image-item-overlay';
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-image-btn';
                    deleteBtn.textContent = '×';
                    deleteBtn.addEventListener('click', function() {
                        deleteMedia(item.Location);
                    });
                    
                    overlayDiv.appendChild(deleteBtn);
                    
                    mediaItem.appendChild(sequenceDiv);
                    mediaItem.appendChild(badgeDiv);
                    mediaItem.appendChild(contentDiv);
                    mediaItem.appendChild(overlayDiv);
                    
                    // Add drag event listeners for reordering
                    mediaItem.addEventListener('dragstart', handleDragStart);
                    mediaItem.addEventListener('dragenter', handleDragEnter);
                    mediaItem.addEventListener('dragover', handleDragOver);
                    mediaItem.addEventListener('dragleave', handleDragLeave);
                    mediaItem.addEventListener('drop', handleImageDrop);
                    mediaItem.addEventListener('dragend', handleDragEnd);
                    
                    imageGallery.appendChild(mediaItem);
                }
                
                // Add reordering instructions if multiple items
                if (mediaItems.length > 1) {
                    const noteDiv = document.createElement('div');
                    noteDiv.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #666; font-style: italic; margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px; border: 1px dashed #ccc;';
                    noteDiv.innerHTML = '💡 <strong>Drag & Drop:</strong> Click and drag any media item to reorder. The first item will be the main photo/video.';
                    imageGallery.appendChild(noteDiv);
                }
            }
            
            // Drag and Drop Variables
            let draggedElement = null;
            let draggedIndex = null;
            
            function handleDragStart(e) {
                draggedElement = e.currentTarget;
                draggedIndex = parseInt(draggedElement.dataset.sequence);
                
                // Add visual feedback to dragged element
                draggedElement.classList.add('dragging');
                
                // Disable upload area to prevent conflicts
                if (dragDropArea) {
                    dragDropArea.classList.add('drag-disabled');
                }
                
                // Set drag data
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
                
                // Add semi-transparent effect to all other items
                const allItems = imageGallery.querySelectorAll('.image-item');
                allItems.forEach(function(item) {
                    if (item !== draggedElement) {
                        item.classList.add('not-dragging');
                    }
                });
            }
            
            function handleDragEnter(e) {
                e.preventDefault();
                const targetItem = e.currentTarget;
                
                // Only highlight if it's a different item and we're dragging
                if (targetItem !== draggedElement && draggedElement) {
                    targetItem.classList.add('drag-over');
                }
            }
            
            function handleDragOver(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const targetItem = e.currentTarget;
                if (targetItem !== draggedElement && draggedElement) {
                    targetItem.classList.add('drag-over');
                }
            }
            
            function handleDragLeave(e) {
                const targetItem = e.currentTarget;
                
                // Only remove highlight if we're actually leaving this element
                if (!targetItem.contains(e.relatedTarget)) {
                    targetItem.classList.remove('drag-over');
                }
            }
            
            function handleImageDrop(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetItem = e.currentTarget;
                targetItem.classList.remove('drag-over');
                
                if (draggedElement && targetItem !== draggedElement) {
                    const targetIndex = parseInt(targetItem.dataset.sequence);
                    
                    // Show immediate visual feedback
                    targetItem.classList.add('drop-success');
                    setTimeout(function() {
                        targetItem.classList.remove('drop-success');
                    }, 300);
                    
                    // Reorder the media array and update display
                    reorderMedia(draggedIndex, targetIndex);
                }
            }
            
            function handleDragEnd(e) {
                // Clean up all visual states
                const allItems = imageGallery.querySelectorAll('.image-item');
                allItems.forEach(function(item) {
                    item.classList.remove('dragging', 'drag-over', 'not-dragging');
                });
                
                // Re-enable upload area
                if (dragDropArea) {
                    dragDropArea.classList.remove('drag-disabled');
                }
                
                // Reset drag variables
                draggedElement = null;
                draggedIndex = null;
            }
            
            function reorderMedia(fromIndex, toIndex) {
                // Get current media items from the gallery
                const mediaItems = Array.from(imageGallery.querySelectorAll('.image-item'));
                const mediaData = mediaItems.map(function(item) {
                    return {
                        Location: item.dataset.location,
                        sequence: parseInt(item.dataset.sequence)
                    };
                });
                
                // Reorder the array
                const movedItem = mediaData.splice(fromIndex, 1)[0];
                mediaData.splice(toIndex, 0, movedItem);
                
                // Update sequences and save to server
                const newOrder = mediaData.map(function(item) {
                    return item.Location;
                });
                
                saveMediaOrder(newOrder);
            }
            
            function saveMediaOrder(mediaOrder) {
                if (!mediaOrder) {
                    const mediaItems = imageGallery.querySelectorAll('.image-item');
                    mediaOrder = Array.from(mediaItems).map(function(item) {
                        return item.dataset.location;
                    });
                }
                
                const formData = new FormData();
                formData.append('code', hotelCode);
                formData.append('imageOrder', JSON.stringify(mediaOrder));
                
                fetch('update_image_order.php', {
                    method: 'POST',
                    body: formData
                })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        // Show success message briefly
                        showMessage('Media order updated successfully!', 'success');
                        // Reload to reflect new order with updated sequence numbers
                        loadExistingMedia();
                    } else {
                        showMessage('Failed to update order: ' + (data.error || 'Unknown error'), 'error');
                        loadExistingMedia(); // Reload to restore original order
                    }
                })
                .catch(function(error) {
                    showMessage('Failed to update order: ' + error.message, 'error');
                    loadExistingMedia(); // Reload to restore original order
                });
            }
            
            function showMessage(message, type) {
                const existingMessage = document.querySelector('.temp-message');
                if (existingMessage) {
                    existingMessage.remove();
                }
                
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + type + ' temp-message';
                messageDiv.textContent = message;
                messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 10px 15px; border-radius: 5px; z-index: 1000; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
                
                if (type === 'success') {
                    messageDiv.style.background = '#4CAF50';
                    messageDiv.style.color = 'white';
                } else {
                    messageDiv.style.background = '#f44336';
                    messageDiv.style.color = 'white';
                }
                
                document.body.appendChild(messageDiv);
                
                setTimeout(function() {
                    messageDiv.remove();
                }, 3000);
            }
            
            function deleteMedia(location) {
                if (confirm('Are you sure you want to delete this media?')) {
                    const formData = new FormData();
                    formData.append('code', hotelCode);
                    formData.append('location', location);
                    
                    fetch('delete_image.php', {
                        method: 'POST',
                        body: formData
                    })
                    .then(function(response) {
                        return response.json();
                    })
                    .then(function(data) {
                        if (data.success) {
                            loadExistingMedia();
                            alert('Media deleted successfully!');
                        } else {
                            alert('Delete failed: ' + (data.error || 'Unknown error'));
                        }
                    })
                    .catch(function(error) {
                        alert('Delete failed: ' + error.message);
                    });
                }
            }
            
            // YouTube ID extraction function
            function extractYouTubeId(url) {
                const patterns = [
                    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
                ];
                
                for (let i = 0; i < patterns.length; i++) {
                    const matches = url.match(patterns[i]);
                    if (matches) {
                        return matches[1];
                    }
                }
                
                return null;
            }
        });
        <?php endif; ?>
    </script>
</body>
</html>
