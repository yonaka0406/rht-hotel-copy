#!/usr/bin/env node

/**
 * Documentation Format Validator
 * 
 * Validates markdown documentation against formatting standards and
 * template compliance requirements.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const TEMPLATES_DIR = path.join(DOCS_DIR, 'templates');
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

// Template requirements
const TEMPLATE_REQUIREMENTS = {
  'feature-documentation-template.md': {
    requiredSections: [
      'Document Information',
      'Overview',
      'Getting Started',
      'Core Functionality',
      'Configuration',
      'API Reference',
      'Integration',
      'Best Practices',
      'Troubleshooting',
      'Related Documentation'
    ],
    requiredFields: ['Feature Name', 'Version', 'Last Updated', 'Author', 'Status']
  },
  'api-endpoint-template.md': {
    requiredSections: [
      'Endpoint Information',
      'Overview',
      'Endpoint Details',
      'Request',
      'Response',
      'Error Responses',
      'Examples'
    ],
    requiredFields: ['Endpoint Name', 'Version', 'Last Updated', 'Status']
  },
  'integration-guide-template.md': {
    requiredSections: [
      'Document Information',
      'Overview',
      'Architecture',
      'Prerequisites',
      'Configuration',
      'Setup Instructions',
      'Authentication',
      'API Reference',
      'Error Handling',
      'Testing',
      'Monitoring',
      'Troubleshooting'
    ],
    requiredFields: ['Integration Name', 'Version', 'Last Updated', 'Status']
  }
};

// Results tracking
const results = {
  totalFiles: 0,
  validFiles: 0,
  filesWithIssues: [],
  errors: []
};

/**
 * Extract all section headers from markdown
 */
function extractSections(content) {
  const sections = [];
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  
  while ((match = headerRegex.exec(content)) !== null) {
    const level = match[1].length;
    const title = match[2].trim();
    sections.push({ level, title });
  }
  
  return sections;
}

/**
 * Check for required sections
 */
function checkRequiredSections(sections, requiredSections) {
  const missing = [];
  const sectionTitles = sections.map(s => s.title.toLowerCase());
  
  requiredSections.forEach(required => {
    const found = sectionTitles.some(title => 
      title.includes(required.toLowerCase()) || 
      required.toLowerCase().includes(title)
    );
    
    if (!found) {
      missing.push(required);
    }
  });
  
  return missing;
}

/**
 * Extract document metadata
 */
function extractMetadata(content) {
  const metadata = {};
  
  // Check for metadata in Document Information section
  const docInfoMatch = content.match(/##\s*(?:Document Information|Endpoint Information)[\s\S]*?(?=\n##|$)/i);
  if (docInfoMatch) {
    const docInfo = docInfoMatch[0];
    
    // Extract field values
    const fieldRegex = /[-*]\s*\*\*([^*]+)\*\*:\s*(.+)/g;
    let match;
    
    while ((match = fieldRegex.exec(docInfo)) !== null) {
      const field = match[1].trim();
      const value = match[2].trim();
      metadata[field] = value;
    }
  }
  
  return metadata;
}

/**
 * Check for required metadata fields
 */
function checkRequiredFields(metadata, requiredFields) {
  const missing = [];
  const metadataKeys = Object.keys(metadata).map(k => k.toLowerCase());
  
  requiredFields.forEach(required => {
    const found = metadataKeys.some(key => 
      key.includes(required.toLowerCase()) || 
      required.toLowerCase().includes(key)
    );
    
    if (!found) {
      missing.push(required);
    }
  });
  
  return missing;
}

/**
 * Check for placeholder text
 */
function checkPlaceholders(content) {
  const placeholders = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check for common placeholder patterns
    const patterns = [
      /\[.*?\]/g,
      /\{.*?\}/g,
      /TODO/gi,
      /FIXME/gi,
      /TBD/gi,
      /\[Date\]/gi,
      /\[Author.*?\]/gi,
      /\[.*?Name\]/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Ignore markdown links and code blocks
          if (!line.includes('](') && !line.trim().startsWith('```')) {
            placeholders.push({
              line: index + 1,
              text: match,
              context: line.trim().substring(0, 80)
            });
          }
        });
      }
    });
  });
  
  return placeholders;
}

/**
 * Check markdown formatting issues
 */
function checkFormatting(content) {
  const issues = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for trailing whitespace
    if (line.endsWith(' ') || line.endsWith('\t')) {
      issues.push({
        line: lineNum,
        type: 'trailing-whitespace',
        message: 'Line has trailing whitespace'
      });
    }
    
    // Check for inconsistent header spacing
    if (line.match(/^#{1,6}[^\s]/)) {
      issues.push({
        line: lineNum,
        type: 'header-spacing',
        message: 'Header should have space after # symbols'
      });
    }
    
    // Check for multiple consecutive blank lines
    if (index > 0 && line === '' && lines[index - 1] === '') {
      if (index > 1 && lines[index - 2] === '') {
        issues.push({
          line: lineNum,
          type: 'multiple-blank-lines',
          message: 'Multiple consecutive blank lines'
        });
      }
    }
    
    // Check for inconsistent list markers
    if (line.match(/^\s*[*+-]\s/)) {
      const indent = line.match(/^\s*/)[0].length;
      if (indent % 2 !== 0) {
        issues.push({
          line: lineNum,
          type: 'list-indentation',
          message: 'List indentation should be in multiples of 2 spaces'
        });
      }
    }
  });
  
  return issues;
}

/**
 * Check code block formatting
 */
function checkCodeBlocks(content) {
  const issues = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  let lineCount = 0;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1];
    const code = match[2];
    
    // Count lines up to this point
    const beforeMatch = content.substring(0, match.index);
    lineCount = (beforeMatch.match(/\n/g) || []).length + 1;
    
    // Check if language is specified
    if (!language) {
      issues.push({
        line: lineCount,
        type: 'code-block-language',
        message: 'Code block should specify language for syntax highlighting'
      });
    }
    
    // Check for empty code blocks
    if (code.trim() === '') {
      issues.push({
        line: lineCount,
        type: 'empty-code-block',
        message: 'Code block is empty'
      });
    }
  }
  
  return issues;
}

/**
 * Determine template type from file path or content
 */
function determineTemplateType(filePath, content) {
  const fileName = path.basename(filePath).toLowerCase();
  const relativePath = path.relative(DOCS_DIR, filePath).toLowerCase();
  
  // Check if file is in templates directory
  if (relativePath.startsWith('templates')) {
    return null; // Don't validate templates themselves
  }
  
  // Determine type based on path or content
  if (relativePath.includes('api') && relativePath.includes('endpoint')) {
    return 'api-endpoint-template.md';
  }
  
  if (relativePath.includes('integration')) {
    return 'integration-guide-template.md';
  }
  
  if (relativePath.includes('feature')) {
    return 'feature-documentation-template.md';
  }
  
  // Check content for template indicators
  if (content.includes('## Endpoint Details') || content.includes('## Request')) {
    return 'api-endpoint-template.md';
  }
  
  if (content.includes('## Integration Type') || content.includes('## Setup Instructions')) {
    return 'integration-guide-template.md';
  }
  
  if (content.includes('## Core Functionality') || content.includes('## Getting Started')) {
    return 'feature-documentation-template.md';
  }
  
  return null; // No specific template required
}

/**
 * Process a single markdown file
 */
function processFile(filePath) {
  results.totalFiles++;
  
  const relativePath = path.relative(DOCS_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const issues = {
    file: relativePath,
    missingSections: [],
    missingFields: [],
    placeholders: [],
    formattingIssues: [],
    codeBlockIssues: []
  };
  
  // Determine if file should follow a template
  const templateType = determineTemplateType(filePath, content);
  
  if (templateType && TEMPLATE_REQUIREMENTS[templateType]) {
    const requirements = TEMPLATE_REQUIREMENTS[templateType];
    const sections = extractSections(content);
    const metadata = extractMetadata(content);
    
    // Check required sections
    issues.missingSections = checkRequiredSections(sections, requirements.requiredSections);
    
    // Check required fields
    issues.missingFields = checkRequiredFields(metadata, requirements.requiredFields);
  }
  
  // Check for placeholders
  issues.placeholders = checkPlaceholders(content);
  
  // Check formatting
  issues.formattingIssues = checkFormatting(content);
  
  // Check code blocks
  issues.codeBlockIssues = checkCodeBlocks(content);
  
  // Determine if file has any issues
  const hasIssues = 
    issues.missingSections.length > 0 ||
    issues.missingFields.length > 0 ||
    issues.placeholders.length > 2 || // Allow a few placeholders
    issues.formattingIssues.length > 0 ||
    issues.codeBlockIssues.length > 0;
  
  if (hasIssues) {
    issues.templateType = templateType;
    results.filesWithIssues.push(issues);
  } else {
    results.validFiles++;
  }
}

/**
 * Recursively find all markdown files
 */
function findMarkdownFiles(dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (MARKDOWN_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    results.errors.push(`Error reading directory ${dir}: ${error.message}`);
  }
  
  return files;
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n=== Documentation Format Validation Report ===\n');
  
  console.log(`Files validated: ${results.totalFiles}`);
  console.log(`Valid files: ${results.validFiles}`);
  console.log(`Files with issues: ${results.filesWithIssues.length}`);
  
  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${results.errors.length}`);
    results.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  if (results.filesWithIssues.length > 0) {
    console.log('\n⚠️  Files with Formatting Issues:\n');
    
    results.filesWithIssues.forEach(fileIssues => {
      console.log(`📄 ${fileIssues.file}`);
      
      if (fileIssues.templateType) {
        console.log(`   Template: ${fileIssues.templateType}`);
      }
      
      if (fileIssues.missingSections.length > 0) {
        console.log(`   Missing sections:`);
        fileIssues.missingSections.forEach(section => {
          console.log(`     - ${section}`);
        });
      }
      
      if (fileIssues.missingFields.length > 0) {
        console.log(`   Missing metadata fields:`);
        fileIssues.missingFields.forEach(field => {
          console.log(`     - ${field}`);
        });
      }
      
      if (fileIssues.placeholders.length > 2) {
        console.log(`   Placeholders found: ${fileIssues.placeholders.length}`);
        fileIssues.placeholders.slice(0, 3).forEach(placeholder => {
          console.log(`     Line ${placeholder.line}: ${placeholder.text}`);
        });
        if (fileIssues.placeholders.length > 3) {
          console.log(`     ... and ${fileIssues.placeholders.length - 3} more`);
        }
      }
      
      if (fileIssues.formattingIssues.length > 0) {
        console.log(`   Formatting issues: ${fileIssues.formattingIssues.length}`);
        fileIssues.formattingIssues.slice(0, 3).forEach(issue => {
          console.log(`     Line ${issue.line}: ${issue.message}`);
        });
        if (fileIssues.formattingIssues.length > 3) {
          console.log(`     ... and ${fileIssues.formattingIssues.length - 3} more`);
        }
      }
      
      if (fileIssues.codeBlockIssues.length > 0) {
        console.log(`   Code block issues: ${fileIssues.codeBlockIssues.length}`);
        fileIssues.codeBlockIssues.forEach(issue => {
          console.log(`     Line ${issue.line}: ${issue.message}`);
        });
      }
      
      console.log('');
    });
  } else {
    console.log('\n✅ All documentation follows formatting standards!\n');
  }
  
  return results.filesWithIssues.length === 0 && results.errors.length === 0;
}

/**
 * Main execution
 */
function main() {
  console.log('Starting documentation format validation...\n');
  console.log(`Scanning directory: ${DOCS_DIR}\n`);
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Error: Documentation directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }
  
  const markdownFiles = findMarkdownFiles(DOCS_DIR);
  
  if (markdownFiles.length === 0) {
    console.log('No markdown files found.');
    process.exit(0);
  }
  
  console.log(`Found ${markdownFiles.length} markdown files\n`);
  
  markdownFiles.forEach(file => {
    processFile(file);
  });
  
  const success = generateReport();
  
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { 
  extractSections, 
  extractMetadata, 
  checkRequiredSections, 
  checkRequiredFields,
  checkPlaceholders,
  checkFormatting,
  checkCodeBlocks
};
