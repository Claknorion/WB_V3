// rich-text-editor.js - Reusable Rich Text Editor System
// Usage: Include this file and call initializeRichTextEditor(elementId, hiddenFieldId)

// Global rich text editor instances
window.richTextEditors = {};

// Custom toolbar configuration
const RICH_TEXT_TOOLBAR = [
    ['bold', 'italic', 'underline'],        
    ['link', 'product-link'],              
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']                              
];

// Custom product link handler
function handleProductLink(quill) {
    const range = quill.getSelection();
    if (!range || range.length === 0) {
        alert('Please select text first to create a product link');
        return;
    }
    
    const selectedText = quill.getText(range.index, range.length);
    
    // Simple dialog for product type and code
    const productType = prompt('Product Type (tour/hotel/activity):', 'tour');
    if (!productType) return;
    
    const productCode = prompt('Product Code:', '');
    if (!productCode) return;
    
    // Create custom product link format
    const productLink = `[${productType.toLowerCase()}:${productCode}]${selectedText}[/${productType.toLowerCase()}]`;
    
    // Replace selected text with product link
    quill.deleteText(range.index, range.length);
    quill.insertText(range.index, productLink);
    
    // Style the inserted text
    quill.formatText(range.index, productLink.length, 'color', '#007bff');
    quill.formatText(range.index, productLink.length, 'bold', true);
}

// Initialize a rich text editor
function initializeRichTextEditor(editorId, hiddenFieldId, placeholder = 'Enter description...') {
    // Add custom button to Quill toolbar (only once)
    if (!window.quillCustomButtonAdded) {
        const icons = Quill.import('ui/icons');
        icons['product-link'] = '🔗';
        window.quillCustomButtonAdded = true;
    }
    
    // Initialize the editor
    const editor = new Quill(`#${editorId}`, {
        theme: 'snow',
        modules: {
            toolbar: {
                container: RICH_TEXT_TOOLBAR,
                handlers: {
                    'product-link': function() {
                        handleProductLink(this.quill);
                    }
                }
            }
        },
        placeholder: placeholder
    });
    
    // Store editor instance
    window.richTextEditors[editorId] = editor;
    
    // Load existing content from hidden field
    const hiddenField = document.getElementById(hiddenFieldId);
    if (hiddenField && hiddenField.value) {
        editor.clipboard.dangerouslyPasteHTML(hiddenField.value);
    }
    
    // Update hidden field on content change
    editor.on('text-change', function() {
        hiddenField.value = editor.root.innerHTML;
    });
    
    // Update hidden field before form submission
    const form = hiddenField.closest('form');
    if (form) {
        form.addEventListener('submit', function() {
            hiddenField.value = editor.root.innerHTML;
        });
    }
    
    return editor;
}

// Initialize multiple editors at once
function initializeAllRichTextEditors(editorConfigs) {
    editorConfigs.forEach(config => {
        initializeRichTextEditor(config.editorId, config.hiddenFieldId, config.placeholder);
    });
}

// Placeholder function for product modal (to be implemented later)
function openProductModal(productType, productCode) {
    alert(`Product Modal (Coming Soon):\nType: ${productType}\nCode: ${productCode}\n\nThis will open a detailed modal with product information.`);
    
    // TODO: Replace with actual modal implementation
}

// CSS styles for rich text editors
function addRichTextEditorStyles() {
    if (document.getElementById('rich-text-styles')) return; // Already added
    
    const style = document.createElement('style');
    style.id = 'rich-text-styles';
    style.textContent = `
        /* Rich Text Editor Styling */
        .rich-editor-container {
            border: 1px solid #ccc;
            border-radius: 4px;
            background: white;
        }
        
        .rich-editor {
            min-height: 120px;
            background: white;
        }
        
        .ql-toolbar {
            border-bottom: 1px solid #ccc;
            background: #f8f9fa;
        }
        
        .ql-container {
            border: none;
            font-family: inherit;
        }
        
        .ql-editor {
            padding: 12px;
            min-height: 100px;
        }
        
        .ql-editor.ql-blank::before {
            color: #999;
            font-style: italic;
        }
        
        /* Product Link Styling */
        .ql-toolbar .ql-product-link {
            width: 28px;
            height: 28px;
        }
        
        .ql-toolbar .ql-product-link:before {
            content: '🔗';
            font-size: 14px;
        }
        
        .product-link {
            color: #007bff;
            text-decoration: underline;
            cursor: pointer;
            font-weight: bold;
        }
        
        .product-link:hover {
            color: #0056b3;
            background-color: #f8f9fa;
        }
    `;
    
    document.head.appendChild(style);
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    addRichTextEditorStyles();
});
