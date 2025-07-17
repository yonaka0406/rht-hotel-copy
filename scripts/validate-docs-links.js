#!/usr/bin/env node

/**
 * Documentation Link Checker Script
 * 
 * This script validates:
 * - Link integrity for all documentation files
 * - Internal cross-references between documents
 * - File existence and proper markdown formatting
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class DocumentationLinkChecker {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.checkedUrls = new Map(); // Cache for external URL checks
        this.documentFiles = new Set(); // Track all documentation files
    }

    /**
     * Find all markdown files in the project
     */
    findMarkdownFiles(dir, files = []) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Skip node_modules, .git, and other common directories
                if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
                    this.findMarkdownFiles(fullPath, files);
                }
            } else if (item.endsWith('.md')) {
                files.push(fullPath);
                this.documentFiles.add(fullPath);
            }
        }
        
        return files;
    }

    /**
     * Extract all links from markdown content
     */
    extractLinks(content) {
        const links = [];
        
        // Markdown link format: [text](url)
        const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
        let match;
        
        while ((match = markdownLinkRegex.exec(content)) !== null) {
            links.push({
                text: match[1],
                url: match[2],
                type: 'markdown'
            });
        }
        
        // Reference-style links: [text][ref] and [ref]: url
        const refLinkRegex = /\[([^\]]+)\]\[([^\]]*)\]/g;
        const refDefRegex = /^\s*\[([^\]]+)\]:\s*(.+)$/gm;
        
        const references = new Map();
        while ((match = refDefRegex.exec(content)) !== null) {
            references.set(match[1], match[2]);
        }
        
        while ((match = refLinkRegex.exec(content)) !== null) {
            const refKey = match[2] || match[1];
            if (references.has(refKey)) {
                links.push({
                    text: match[1],
                    url: references.get(refKey),
                    type: 'reference'
                });
            }
        }
        
        // HTML links: <a href="url">
        const htmlLinkRegex = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
        while ((match = htmlLinkRegex.exec(content)) !== null) {
            links.push({
                text: 'HTML link',
                url: match[1],
                type: 'html'
            });
        }
        
        return links;
    }

    /**
     * Check if a URL is external (http/https)
     */
    isExternalUrl(url) {
        return url.startsWith('http://') || url.startsWith('https://');
    }

    /**
     * Check if a URL is a fragment/anchor link
     */
    isFragmentLink(url) {
        return url.startsWith('#');
    }

    /**
     * Resolve relative path from current file
     */
    resolveRelativePath(currentFile, relativePath) {
        const currentDir = path.dirname(currentFile);
        return path.resolve(currentDir, relativePath);
    }

    /**
     * Check if internal file exists
     */
    checkInternalLink(currentFile, url) {
        // Remove fragment/anchor part
        const [filePath, fragment] = url.split('#');
        
        if (!filePath) {
            // Just a fragment link, check if it exists in current file
            return this.checkFragmentInFile(currentFile, fragment);
        }
        
        const resolvedPath = this.resolveRelativePath(currentFile, filePath);
        
        if (!fs.existsSync(resolvedPath)) {
            return {
                valid: false,
                error: `File not found: ${resolvedPath}`
            };
        }
        
        // If there's a fragment, check if it exists in the target file
        if (fragment) {
            return this.checkFragmentInFile(resolvedPath, fragment);
        }
        
        return { valid: true };
    }

    /**
     * Check if a fragment/anchor exists in a file
     */
    checkFragmentInFile(filePath, fragment) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for markdown headers that would create anchors
            const headerRegex = /^#+\s+(.+)$/gm;
            const headers = [];
            let match;
            
            while ((match = headerRegex.exec(content)) !== null) {
                // Convert header text to anchor format (lowercase, spaces to hyphens, remove special chars)
                const anchor = match[1]
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');
                headers.push(anchor);
            }
            
            if (headers.includes(fragment.toLowerCase())) {
                return { valid: true };
            }
            
            // Also check for explicit anchor tags
            const anchorRegex = new RegExp(`<a\\s+[^>]*(?:name|id)\\s*=\\s*["']${fragment}["'][^>]*>`, 'i');
            if (anchorRegex.test(content)) {
                return { valid: true };
            }
            
            return {
                valid: false,
                error: `Fragment '${fragment}' not found in ${filePath}`
            };
            
        } catch (error) {
            return {
                valid: false,
                error: `Error reading file for fragment check: ${error.message}`
            };
        }
    }

    /**
     * Check external URL (with caching)
     */
    async checkExternalUrl(url) {
        if (this.checkedUrls.has(url)) {
            return this.checkedUrls.get(url);
        }
        
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const request = client.request({
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: 'HEAD',
                timeout: 5000
            }, (response) => {
                const result = {
                    valid: response.statusCode >= 200 && response.statusCode < 400,
                    statusCode: response.statusCode
                };
                
                if (!result.valid) {
                    result.error = `HTTP ${response.statusCode}`;
                }
                
                this.checkedUrls.set(url, result);
                resolve(result);
            });
            
            request.on('error', (error) => {
                const result = {
                    valid: false,
                    error: error.message
                };
                this.checkedUrls.set(url, result);
                resolve(result);
            });
            
            request.on('timeout', () => {
                const result = {
                    valid: false,
                    error: 'Request timeout'
                };
                this.checkedUrls.set(url, result);
                resolve(result);
            });
            
            request.end();
        });
    }

    /**
     * Validate markdown formatting
     */
    validateMarkdownFormatting(content, filePath) {
        const lines = content.split('\n');
        const issues = [];
        
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            
            // Check for unmatched brackets
            const openBrackets = (line.match(/\[/g) || []).length;
            const closeBrackets = (line.match(/\]/g) || []).length;
            const openParens = (line.match(/\(/g) || []).length;
            const closeParens = (line.match(/\)/g) || []).length;
            
            if (openBrackets !== closeBrackets) {
                issues.push({
                    line: lineNum,
                    message: 'Unmatched square brackets'
                });
            }
            
            if (openParens !== closeParens) {
                issues.push({
                    line: lineNum,
                    message: 'Unmatched parentheses'
                });
            }
            
            // Check for malformed links
            if (line.includes('](') && !line.match(/\[([^\]]*)\]\(([^)]+)\)/)) {
                issues.push({
                    line: lineNum,
                    message: 'Potentially malformed markdown link'
                });
            }
        });
        
        issues.forEach(issue => {
            this.warnings.push({
                file: filePath,
                line: issue.line,
                message: `Markdown formatting: ${issue.message}`
            });
        });
    }

    /**
     * Validate a single documentation file
     */
    async validateFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            console.log(`\nValidating: ${filePath}`);
            
            // Validate markdown formatting
            this.validateMarkdownFormatting(content, filePath);
            
            // Extract and validate links
            const links = this.extractLinks(content);
            console.log(`  - Found ${links.length} links`);
            
            for (const link of links) {
                if (this.isExternalUrl(link.url)) {
                    // Check external URL
                    const result = await this.checkExternalUrl(link.url);
                    if (!result.valid) {
                        this.errors.push({
                            file: filePath,
                            message: `External link failed: ${link.url} - ${result.error}`
                        });
                    }
                } else if (this.isFragmentLink(link.url)) {
                    // Check fragment in current file
                    const result = this.checkFragmentInFile(filePath, link.url.substring(1));
                    if (!result.valid) {
                        this.errors.push({
                            file: filePath,
                            message: `Fragment link failed: ${link.url} - ${result.error}`
                        });
                    }
                } else {
                    // Check internal file link
                    const result = this.checkInternalLink(filePath, link.url);
                    if (!result.valid) {
                        this.errors.push({
                            file: filePath,
                            message: `Internal link failed: ${link.url} - ${result.error}`
                        });
                    }
                }
            }
            
        } catch (error) {
            this.errors.push({
                file: filePath,
                message: `Error reading file: ${error.message}`
            });
        }
    }

    /**
     * Validate all documentation files
     */
    async validateAllDocumentation(rootPath = '.') {
        console.log('Documentation Link Checker');
        console.log(`Scanning for markdown files in: ${rootPath}`);
        
        const markdownFiles = this.findMarkdownFiles(rootPath);
        
        if (markdownFiles.length === 0) {
            this.warnings.push({
                message: `No markdown files found in ${rootPath}`
            });
            return;
        }
        
        console.log(`Found ${markdownFiles.length} markdown files`);
        
        // Validate each file
        for (const file of markdownFiles) {
            await this.validateFile(file);
        }
    }

    /**
     * Generate validation report
     */
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('DOCUMENTATION LINK VALIDATION REPORT');
        console.log('='.repeat(60));

        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('✅ All documentation link checks passed!');
            return true;
        }

        if (this.errors.length > 0) {
            console.log(`\n❌ ERRORS (${this.errors.length}):`);
            this.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.file ? `[${error.file}]` : ''} ${error.message}`);
                if (error.line) {
                    console.log(`   Line ${error.line}`);
                }
            });
        }

        if (this.warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
            this.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning.file ? `[${warning.file}]` : ''} ${warning.message}`);
                if (warning.line) {
                    console.log(`   Line ${warning.line}`);
                }
            });
        }

        console.log('\n' + '='.repeat(60));
        return this.errors.length === 0;
    }
}

// Main execution
async function main() {
    const checker = new DocumentationLinkChecker();
    
    // Get root path from command line argument or use current directory
    const rootPath = process.argv[2] || '.';
    
    await checker.validateAllDocumentation(rootPath);
    const success = checker.generateReport();
    
    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DocumentationLinkChecker;