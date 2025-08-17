# Rich Text Editor System

This system provides reusable rich text editing with product linking functionality across the entire application.

## Files Added:
- `JS/rich-text-editor.js` - Client-side rich text functionality
- `PHP/rich-text-helpers.php` - Server-side processing functions

## How to Add Rich Text to Any Page:

### 1. Include Required Files in HTML Head:
```html
<!-- Quill.js Rich Text Editor -->
<link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
<script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
<script src="../JS/rich-text-editor.js"></script>
```

### 2. Include PHP Helper in Your PHP File:
```php
include 'rich-text-helpers.php';
```

### 3. Replace Textarea with Rich Text Editor:
**Old way:**
```html
<textarea name="description"><?= htmlspecialchars($content) ?></textarea>
```

**New way:**
```php
<?= generateRichTextEditor('description', $content, 'Enter description...') ?>
```

### 4. Add Preview (Optional):
```php
<?= generateRichTextPreview($content, 'Preview Label') ?>
```

### 5. Display Rich Content on Website:
```php
echo displayRichText($content);
```

## Product Linking Features:

### Creating Product Links:
1. Select text in editor
2. Click 🔗 button in toolbar  
3. Enter product type: `tour`, `hotel`, `activity`
4. Enter product code: `TOUR123`, `HTL456`, etc.

### Custom Syntax:
```
[tour:TOUR123]Blue Mountains Tour[/tour]
[hotel:HTL456]Four Seasons Sydney[/hotel]
[activity:ACT789]Harbour Cruise[/activity]
```

### Modal Integration:
Product links call `openProductModal(type, code)` function. Replace this function with actual modal implementation when ready.

## Implemented Locations:
- ✅ Hotel Management (descriptions)
- ✅ Room Management (descriptions) 
- 🔄 Trip Create (future)
- 🔄 Tour Management (future)

## Easy Integration:
The system is designed for minimal code changes. Just include the files and replace textareas with the helper function calls.
