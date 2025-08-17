<?php
// rich-text-helpers.php - Server-side functions for rich text processing

// Simple HTML sanitization function for rich text content
function sanitizeRichText($html) {
    if (empty($html)) return '';
    
    // Allow basic formatting tags but strip dangerous ones
    $allowed_tags = '<p><br><strong><b><em><i><u><ol><ul><li><a>';
    return strip_tags($html, $allowed_tags);
}

// Convert custom product link syntax to HTML
function convertProductLinksToHtml($content) {
    if (empty($content)) return '';
    
    // Pattern to match [type:code]text[/type] format
    $pattern = '/\[(\w+):([^\]]+)\](.*?)\[\/\1\]/';
    
    return preg_replace_callback($pattern, function($matches) {
        $type = $matches[1];
        $code = $matches[2];
        $text = $matches[3];
        
        return '<a href="#" class="product-link" onclick="openProductModal(\'' . 
               htmlspecialchars($type) . '\', \'' . htmlspecialchars($code) . 
               '\')" title="' . ucfirst($type) . ': ' . htmlspecialchars($code) . '">' . 
               htmlspecialchars($text) . '</a>';
    }, $content);
}

// Display rich text content with product links converted
function displayRichText($content) {
    $sanitized = sanitizeRichText($content);
    return convertProductLinksToHtml($sanitized);
}

// Generate rich text editor HTML
function generateRichTextEditor($name, $value = '', $placeholder = 'Enter description...') {
    $editorId = $name . '_editor';
    $sanitizedValue = htmlspecialchars(sanitizeRichText($value), ENT_QUOTES);
    
    return '
    <div class="rich-editor-container">
        <div id="' . $editorId . '" class="rich-editor"></div>
    </div>
    <input type="hidden" id="' . $name . '" name="' . $name . '" value="' . $sanitizedValue . '">
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            initializeRichTextEditor("' . $editorId . '", "' . $name . '", "' . $placeholder . '");
        });
    </script>';
}

// Generate preview HTML for rich text content
function generateRichTextPreview($content, $label = 'Preview') {
    if (empty($content)) return '';
    
    return '
    <div class="form-group">
        <label>' . htmlspecialchars($label) . ':</label>
        <div style="border: 1px solid #ddd; padding: 10px; background: #f9f9f9; border-radius: 4px;">
            ' . displayRichText($content) . '
        </div>
    </div>';
}
?>
