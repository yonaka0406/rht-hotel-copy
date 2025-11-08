#!/usr/bin/env node

/**
 * Link Management and Updating System
 * 
 * This script scans documentation files for internal links, updates them to reflect
 * new file locations, and validates link integrity after migration.
 */

const fs = require('fs');
const path = require('path');

class LinkManager {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.docsRoot = path.join(this.projectRoot, 'docs');
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    
    this.results = {
      scanned: [],
      updated: [],
      broken: [],
      external: []
    };
    
    // Link patterns to match
    this.linkPatterns = [
      // Markdown links: [text](url)
      /\[([^\]]+)\]\(([^)]+)\)/g,
      // Reference-style links: [text][ref]
      /\[([^\]]+)\]\[([^\]]+)\]/g,
      // Reference definitions: [ref]: url
      /^\[([^\]]+)\]:\s*(.+)$/gm,
      // HTML links: <a href="url">
      /<a\s+href=["']([^"']+)["']/gi
    ];
  }

  /**
   * Check if a link is external
   */
  isExternalLink(link) {
    return /^(https?:\/\/|mailto:|ftp:)/i.test(link) || link.startsWith('#');
  }

  /**
   * Extract all links from markdown content
   */
  extractLinks(content, filePath) {
    const links = [];
    
    // Extract markdown links [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      links.push({
        type: 'markdown',
        text: linkText,
        url: linkUrl,
        fullMatch: match[0],
        index: match.index,
        isExternal: this.isExternalLink(linkUrl)
      });
    }
    
    // Extract reference-style links [text][ref]
    const refLinkRegex = /\[([^\]]+)\]\[([^\]]+)\]/g;
    while ((match = refLinkRegex.exec(content)) !== null) {
      links.push({
        type: 'reference',
        text: match[1],
        ref: match[2],
        fullMatch: match[0],
        index: match.index
      });
    }
    
    // Extract reference definitions [ref]: url
    const refDefRegex = /^\[([^\]]+)\]:\s*(.+)$/gm;
    while ((match = refDefRegex.exec(content)) !== null) {
      const refUrl = match[2].trim();
      links.push({
        type: 'reference-definition',
        ref: match[1],
        url: refUrl,
        fullMatch: match[0],
        index: match.index,
        isExternal: this.isExternalLink(refUrl)
      });
    }
    
    return links;
  }

  /**
   * Resolve relative path from one file to another
   */
  resolveRelativePath(fromFile, toFile) {
    const fromDir = path.dirname(fromFile);
    const relativePath = path.relative(fromDir, toFile);
    // Convert Windows backslashes to forward slashes for URLs
    return relativePath.replace(/\\/g, '/');
  }

  /**
   * Check if a file exists at the given path
   */
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Resolve a link URL to an absolute file path
   */
  resolveLinkPath(linkUrl, sourceFile) {
    // Remove anchor fragments (only split at first '#')
    const hashIdx = linkUrl.indexOf('#');
    const urlWithoutAnchor = hashIdx === -1 ? linkUrl : linkUrl.slice(0, hashIdx);
    
    if (!urlWithoutAnchor) {
      return null; // Just an anchor link
    }
    
    // Resolve relative to source file
    const sourceDir = path.dirname(sourceFile);
    const resolvedPath = path.resolve(sourceDir, urlWithoutAnchor);
    
    return resolvedPath;
  }

  /**
   * Validate a link and check if target exists
   */
  validateLink(link, sourceFile) {
    if (link.isExternal) {
      return { valid: true, type: 'external' };
    }
    
    const targetPath = this.resolveLinkPath(link.url, sourceFile);
    
    if (!targetPath) {
      return { valid: true, type: 'anchor' };
    }
    
    const exists = this.fileExists(targetPath);
    
    return {
      valid: exists,
      type: 'internal',
      targetPath: targetPath,
      exists: exists
    };
  }

  /**
   * Update links in content based on file relocation map
   */
  updateLinks(content, sourceFile, relocationMap) {
    let updatedContent = content;
    const updates = [];
    
    const links = this.extractLinks(content, sourceFile);
    
    // Sort links by index in reverse order to maintain correct positions during replacement
    links.sort((a, b) => b.index - a.index);
    
    for (const link of links) {
      if (link.isExternal || link.type === 'reference') {
        continue; // Skip external links and reference-style links
      }
      
      const targetPath = this.resolveLinkPath(link.url, sourceFile);
      
      if (!targetPath) {
        continue; // Skip anchor-only links
      }
      
      // Check if target file has been relocated
      const newTargetPath = relocationMap[targetPath];
      
      if (newTargetPath) {
        // Calculate new relative path
        const newRelativePath = this.resolveRelativePath(sourceFile, newTargetPath);
        
        // Preserve anchor if present (including multiple '#' characters)
        const hashIdx = link.url.indexOf('#');
        const anchor = hashIdx === -1 ? '' : link.url.slice(hashIdx);
        const newUrl = newRelativePath + anchor;
        
        // Replace the link in content
        const newLink = link.fullMatch.replace(link.url, newUrl);
        
        updatedContent = 
          updatedContent.substring(0, link.index) +
          newLink +
          updatedContent.substring(link.index + link.fullMatch.length);
        
        updates.push({
          oldUrl: link.url,
          newUrl: newUrl,
          text: link.text,
          position: link.index
        });
        
        this.log(`  Updated link: ${link.url} -> ${newUrl}`, 'verbose');
      }
    }
    
    return { content: updatedContent, updates };
  }

  /**
   * Scan a single file for links
   */
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const links = this.extractLinks(content, filePath);
      
      const fileResult = {
        file: filePath,
        totalLinks: links.length,
        internalLinks: 0,
        externalLinks: 0,
        brokenLinks: [],
        validLinks: []
      };
      
      for (const link of links) {
        if (link.isExternal) {
          fileResult.externalLinks++;
          this.results.external.push({
            file: filePath,
            url: link.url,
            text: link.text
          });
        } else if (link.type !== 'reference') {
          fileResult.internalLinks++;
          
          const validation = this.validateLink(link, filePath);
          
          if (validation.valid) {
            fileResult.validLinks.push({
              url: link.url,
              text: link.text,
              target: validation.targetPath
            });
          } else {
            fileResult.brokenLinks.push({
              url: link.url,
              text: link.text,
              target: validation.targetPath
            });
            
            this.results.broken.push({
              file: filePath,
              url: link.url,
              text: link.text,
              target: validation.targetPath
            });
          }
        }
      }
      
      this.results.scanned.push(fileResult);
      
      return fileResult;
    } catch (error) {
      this.log(`Error scanning ${filePath}: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Scan all markdown files in a directory
   */
  scanDirectory(dir = this.docsRoot) {
    if (!fs.existsSync(dir)) {
      this.log(`Directory does not exist: ${dir}`, 'error');
      return;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        this.scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        this.log(`Scanning: ${fullPath}`, 'verbose');
        this.scanFile(fullPath);
      }
    }
  }

  /**
   * Update links in all files based on relocation map
   */
  updateAllLinks(relocationMap) {
    this.log('Updating links in all documentation files...', 'info');
    
    const updateDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          updateDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          this.updateFileLinks(fullPath, relocationMap);
        }
      }
    };
    
    updateDirectory(this.docsRoot);
    updateDirectory(this.projectRoot); // Also check root level files
  }

  /**
   * Update links in a single file
   */
  updateFileLinks(filePath, relocationMap) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { content: updatedContent, updates } = this.updateLinks(content, filePath, relocationMap);
      
      if (updates.length > 0) {
        if (!this.dryRun) {
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          this.log(`✓ Updated ${updates.length} link(s) in: ${filePath}`, 'info');
        } else {
          this.log(`[DRY RUN] Would update ${updates.length} link(s) in: ${filePath}`, 'info');
        }
        
        this.results.updated.push({
          file: filePath,
          updates: updates
        });
      }
    } catch (error) {
      this.log(`Error updating links in ${filePath}: ${error.message}`, 'error');
    }
  }

  /**
   * Validate all links in documentation
   */
  validateAllLinks() {
    this.log('=== Link Validation Started ===', 'info');
    this.log(`Docs Root: ${this.docsRoot}`, 'info');
    this.log('', 'info');
    
    this.scanDirectory(this.docsRoot);
    
    // Also scan root-level markdown files
    const rootFiles = fs.readdirSync(this.projectRoot);
    for (const file of rootFiles) {
      if (file.endsWith('.md')) {
        const fullPath = path.join(this.projectRoot, file);
        if (fs.statSync(fullPath).isFile()) {
          this.log(`Scanning root file: ${fullPath}`, 'verbose');
          this.scanFile(fullPath);
        }
      }
    }
    
    this.printValidationSummary();
    
    return this.results;
  }

  /**
   * Print validation summary
   */
  printValidationSummary() {
    const totalFiles = this.results.scanned.length;
    const totalBroken = this.results.broken.length;
    const totalExternal = this.results.external.length;
    
    let totalInternal = 0;
    this.results.scanned.forEach(file => {
      totalInternal += file.internalLinks;
    });
    
    this.log('', 'info');
    this.log('=== Validation Summary ===', 'info');
    this.log(`Files scanned: ${totalFiles}`, 'info');
    this.log(`Internal links: ${totalInternal}`, 'info');
    this.log(`External links: ${totalExternal}`, 'info');
    this.log(`Broken links: ${totalBroken}`, 'info');
    
    if (totalBroken > 0) {
      this.log('', 'info');
      this.log('Broken links:', 'error');
      this.results.broken.forEach(broken => {
        this.log(`  ${broken.file}`, 'error');
        this.log(`    [${broken.text}](${broken.url})`, 'error');
        this.log(`    Target: ${broken.target}`, 'error');
      });
    }
  }

  /**
   * Generate link report
   */
  generateReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      summary: {
        filesScanned: this.results.scanned.length,
        filesUpdated: this.results.updated.length,
        brokenLinks: this.results.broken.length,
        externalLinks: this.results.external.length
      },
      details: this.results
    };
    
    const reportJson = JSON.stringify(report, null, 2);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, reportJson);
      this.log(`Report saved to: ${outputPath}`, 'info');
    }
    
    return report;
  }

  /**
   * Logging utility
   */
  log(message, level = 'info') {
    if (level === 'verbose' && !this.verbose) return;
    
    const prefix = {
      info: '',
      warning: '⚠ ',
      error: '✗ ',
      verbose: '  '
    }[level] || '';
    
    console.log(prefix + message);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    projectRoot: process.cwd()
  };
  
  const linkManager = new LinkManager(options);
  
  if (command === 'validate') {
    const results = linkManager.validateAllLinks();
    const reportPath = path.join(linkManager.projectRoot, 'link-validation-report.json');
    linkManager.generateReport(reportPath);
    process.exit(results.broken.length > 0 ? 1 : 0);
  } else if (command === 'update') {
    // Load relocation map from file or argument
    const mapFile = args.find(arg => arg.startsWith('--map='));
    if (!mapFile) {
      console.error('Error: --map=<file> argument required for update command');
      process.exit(1);
    }
    
    const mapPath = mapFile.split('=')[1];
    const relocationMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    
    linkManager.updateAllLinks(relocationMap);
    const reportPath = path.join(linkManager.projectRoot, 'link-update-report.json');
    linkManager.generateReport(reportPath);
  } else {
    console.log('Usage:');
    console.log('  node link-manager.js validate [--dry-run] [--verbose]');
    console.log('  node link-manager.js update --map=<relocation-map.json> [--dry-run] [--verbose]');
    process.exit(1);
  }
}

module.exports = LinkManager;
