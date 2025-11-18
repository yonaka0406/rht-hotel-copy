#!/usr/bin/env node

/**
 * Content Standardization Processor
 * 
 * This script standardizes markdown formatting, applies templates for consistent
 * document structure, and validates formatting compliance.
 */

const fs = require('fs');
const path = require('path');

class ContentStandardizer {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.docsRoot = path.join(this.projectRoot, 'docs');
    this.templatesDir = path.join(this.docsRoot, 'templates');
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    
    this.results = {
      processed: [],
      standardized: [],
      violations: [],
      errors: []
    };
    
    // Formatting rules
    this.rules = {
      headings: {
        atxStyle: true,           // Use # style headings
        noTrailingPunctuation: true,
        properHierarchy: true,
        blankLineAfter: true
      },
      lists: {
        consistentMarkers: true,  // Use - for unordered lists
        properIndentation: true,
        blankLineBefore: true
      },
      codeBlocks: {
        fenced: true,             // Use ``` style
        languageSpecified: true,
        blankLineBefore: true,
        blankLineAfter: true
      },
      links: {
        noBareLinks: true,
        descriptiveText: true
      },
      general: {
        maxLineLength: 100,
        trailingWhitespace: false,
        multipleBlankLines: false,
        endWithNewline: true
      }
    };
  }

  /**
   * Standardize heading format
   */
  standardizeHeadings(content) {
    const lines = content.split('\n');
    const standardized = [];
    let violations = [];
    let modified = false;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Check for ATX-style headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        const level = headingMatch[1].length;
        let text = headingMatch[2].trim();
        
        // Remove trailing punctuation
        if (this.rules.headings.noTrailingPunctuation && /[.!?]$/.test(text)) {
          text = text.replace(/[.!?]+$/, '');
          violations.push({
            line: i + 1,
            rule: 'headings.noTrailingPunctuation',
            message: 'Heading should not end with punctuation'
          });
          modified = true;
        }
        
        // Ensure proper spacing
        const standardHeading = '#'.repeat(level) + ' ' + text;
        standardized.push(standardHeading);
        
        // Check for blank line after heading
        if (this.rules.headings.blankLineAfter && i < lines.length - 1 && lines[i + 1].trim() !== '') {
          const nextLine = lines[i + 1];
          // Don't add blank line if next line is another heading or already blank
          if (!nextLine.match(/^#{1,6}\s/) && nextLine.trim() !== '') {
            standardized.push('');
            violations.push({
              line: i + 1,
              rule: 'headings.blankLineAfter',
              message: 'Heading should be followed by a blank line'
            });
            modified = true;
          }
        }
      } else {
        standardized.push(line);
      }
    }
    
    return {
      content: standardized.join('\n'),
      violations,
      modified
    };
  }

  /**
   * Standardize list formatting
   */
  standardizeLists(content) {
    const lines = content.split('\n');
    const standardized = [];
    let violations = [];
    let modified = false;
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Check for list items
      const unorderedMatch = line.match(/^(\s*)([*+\-])\s+(.+)$/);
      const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
      
      if (unorderedMatch) {
        const indent = unorderedMatch[1];
        const marker = unorderedMatch[2];
        const text = unorderedMatch[3];
        
        // Standardize to use - for unordered lists
        if (this.rules.lists.consistentMarkers && marker !== '-') {
          violations.push({
            line: i + 1,
            rule: 'lists.consistentMarkers',
            message: `Use '-' for unordered lists instead of '${marker}'`
          });
          modified = true;
        }
        
        // Check for blank line before list start
        if (!inList && this.rules.lists.blankLineBefore && i > 0 && lines[i - 1].trim() !== '') {
          const prevLine = lines[i - 1];
          if (!prevLine.match(/^#{1,6}\s/)) { // Don't add if previous is heading
            standardized.push('');
            violations.push({
              line: i + 1,
              rule: 'lists.blankLineBefore',
              message: 'List should be preceded by a blank line'
            });
            modified = true;
          }
        }
        
        standardized.push(`${indent}- ${text}`);
        inList = true;
      } else if (orderedMatch) {
        standardized.push(line);
        inList = true;
      } else {
        if (line.trim() === '') {
          inList = false;
        }
        standardized.push(line);
      }
    }
    
    return {
      content: standardized.join('\n'),
      violations,
      modified
    };
  }

  /**
   * Standardize code block formatting
   */
  standardizeCodeBlocks(content) {
    const lines = content.split('\n');
    const standardized = [];
    let violations = [];
    let modified = false;
    let inCodeBlock = false;
    let codeBlockStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Check for fenced code blocks
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          // Starting code block
          const language = line.trim().substring(3).trim();
          
          // Check for blank line before
          if (this.rules.codeBlocks.blankLineBefore && i > 0 && lines[i - 1].trim() !== '') {
            standardized.push('');
            violations.push({
              line: i + 1,
              rule: 'codeBlocks.blankLineBefore',
              message: 'Code block should be preceded by a blank line'
            });
            modified = true;
          }
          
          // Check for language specification
          if (this.rules.codeBlocks.languageSpecified && !language) {
            violations.push({
              line: i + 1,
              rule: 'codeBlocks.languageSpecified',
              message: 'Code block should specify a language'
            });
          }
          
          inCodeBlock = true;
          codeBlockStart = i;
        } else {
          // Ending code block
          inCodeBlock = false;
          
          // Check for blank line after
          if (this.rules.codeBlocks.blankLineAfter && i < lines.length - 1 && lines[i + 1].trim() !== '') {
            standardized.push(line);
            standardized.push('');
            violations.push({
              line: i + 1,
              rule: 'codeBlocks.blankLineAfter',
              message: 'Code block should be followed by a blank line'
            });
            modified = true;
            continue;
          }
        }
      }
      
      standardized.push(line);
    }
    
    return {
      content: standardized.join('\n'),
      violations,
      modified
    };
  }

  /**
   * Remove trailing whitespace
   */
  removeTrailingWhitespace(content) {
    const lines = content.split('\n');
    let modified = false;
    
    const cleaned = lines.map((line, i) => {
      if (line !== line.trimEnd()) {
        modified = true;
        return line.trimEnd();
      }
      return line;
    });
    
    return {
      content: cleaned.join('\n'),
      modified
    };
  }

  /**
   * Remove multiple consecutive blank lines
   */
  removeMultipleBlankLines(content) {
    let modified = false;
    const result = content.replace(/\n{3,}/g, (match) => {
      modified = true;
      return '\n\n';
    });
    
    return {
      content: result,
      modified
    };
  }

  /**
   * Escapes special characters in a string for use in a regular expression.
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\\]/g, '\\{new_string}'); // {new_string} means the whole matched string
  }

  /**
   * Validate link formatting
   */
  validateLinks(content) {
    const violations = [];
    
    // Check for bare URLs
    const bareUrlRegex = /(?<!\(|\[)https?:\/\/[^\s)]+/g;
    let match;
    let lineNum = 1;
    let currentPos = 0;
    
    while ((match = bareUrlRegex.exec(content)) !== null) {
      // Count line number
      lineNum = content.substring(0, match.index).split('\n').length;
      
      violations.push({
        line: lineNum,
        rule: 'links.noBareLinks',
        message: 'URLs should be wrapped in markdown link syntax',
        url: match[0]
      });
    }
    
    // Check for non-descriptive link text
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1].toLowerCase();
      const nonDescriptive = ['click here', 'here', 'link', 'this', 'read more'];
      
      if (nonDescriptive.includes(linkText)) {
        lineNum = content.substring(0, match.index).split('\n').length;
        violations.push({
          line: lineNum,
          rule: 'links.descriptiveText',
          message: `Link text "${match[1]}" is not descriptive`,
          suggestion: 'Use descriptive text that explains the link destination'
        });
      }
    }
    
    return violations;
  }

  /**
   * Apply template structure to content
   */
  applyTemplate(content, templateType) {
    // Load template if exists
    const templatePath = path.join(this.templatesDir, `${templateType}-template.md`);
    
    if (!fs.existsSync(templatePath)) {
      this.log(`Template not found: ${templatePath}`, 'warning');
      return { content, applied: false };
    }
    
    try {
      const template = fs.readFileSync(templatePath, 'utf8');
      
      // Extract sections from template
      const templateSections = this.extractSections(template);
      const contentSections = this.extractSections(content);
      
      // Merge content into template structure
      let result = template;
      
      for (const [sectionName, sectionContent] of Object.entries(contentSections)) {
        if (templateSections[sectionName]) {
          // Replace template section with actual content
          const escapedSectionName = this.escapeRegex(sectionName);
          const sectionRegex = new RegExp(
            `(#{1,6}\\s+${escapedSectionName}[\\s\\S]*?)(?=#{1,6}\\s+|$)`,
            'i'
          );
          result = result.replace(sectionRegex, `$1\n\n${sectionContent}\n`);
        }
      }
      
      return { content: result, applied: true };
    } catch (error) {
      this.log(`Error applying template: ${error.message}`, 'error');
      return { content, applied: false };
    }
  }

  /**
   * Extract sections from markdown content
   */
  extractSections(content) {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = null;
    let currentContent = [];
    
    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        
        // Start new section
        currentSection = headingMatch[2].trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }
    
    return sections;
  }

  /**
   * Process a single file
   */
  processFile(filePath) {
    try {
      this.log(`Processing: ${filePath}`, 'verbose');
      
      let content = fs.readFileSync(filePath, 'utf8');
      let allViolations = [];
      let wasModified = false;
      
      // Apply standardization rules
      const headingResult = this.standardizeHeadings(content);
      content = headingResult.content;
      allViolations.push(...headingResult.violations);
      wasModified = wasModified || headingResult.modified;
      
      const listResult = this.standardizeLists(content);
      content = listResult.content;
      allViolations.push(...listResult.violations);
      wasModified = wasModified || listResult.modified;
      
      const codeBlockResult = this.standardizeCodeBlocks(content);
      content = codeBlockResult.content;
      allViolations.push(...codeBlockResult.violations);
      wasModified = wasModified || codeBlockResult.modified;
      
      // Validate links
      const linkViolations = this.validateLinks(content);
      allViolations.push(...linkViolations);
      
      // General formatting
      if (!this.rules.general.trailingWhitespace) { // Inverted check
        const wsResult = this.removeTrailingWhitespace(content);
        content = wsResult.content;
        wasModified = wasModified || wsResult.modified;
      }
      
      if (!this.rules.general.multipleBlankLines) { // Inverted check
        const blankResult = this.removeMultipleBlankLines(content);
        content = blankResult.content;
        wasModified = wasModified || blankResult.modified;
      }
      
      if (this.rules.general.endWithNewline) {
        const newlineResult = this.ensureEndingNewline(content);
        content = newlineResult.content;
        wasModified = wasModified || newlineResult.modified;
      }
      
      // Write back if modified
      if (wasModified && !this.dryRun) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.log(`✓ Standardized: ${filePath}`, 'info');
      } else if (wasModified) {
        this.log(`[DRY RUN] Would standardize: ${filePath}`, 'info');
      }
      
      const result = {
        file: filePath,
        modified: wasModified,
        violations: allViolations
      };
      
      this.results.processed.push(result);
      
      if (wasModified) {
        this.results.standardized.push(filePath);
      }
      
      if (allViolations.length > 0) {
        this.results.violations.push(result);
      }
      
      return result;
    } catch (error) {
      this.log(`Error processing ${filePath}: ${error.message}`, 'error');
      this.results.errors.push({
        file: filePath,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Process all markdown files in directory
   */
  processDirectory(dir = this.docsRoot) {
    if (!fs.existsSync(dir)) {
      this.log(`Directory does not exist: ${dir}`, 'error');
      return;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        this.processDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        this.processFile(fullPath);
      }
    }
  }

  /**
   * Run standardization on all documentation
   */
  standardize() {
    this.log('=== Content Standardization Started ===', 'info');
    this.log(`Docs Root: ${this.docsRoot}`, 'info');
    this.log(`Dry Run: ${this.dryRun}`, 'info');
    this.log('', 'info');
    
    this.processDirectory(this.docsRoot);
    
    this.printSummary();
    
    return this.results;
  }

  /**
   * Print summary
   */
  printSummary() {
    const totalFiles = this.results.processed.length;
    const totalModified = this.results.standardized.length;
    const totalViolations = this.results.violations.length;
    const totalErrors = this.results.errors.length;
    
    this.log('', 'info');
    this.log('=== Standardization Summary ===', 'info');
    this.log(`Files processed: ${totalFiles}`, 'info');
    this.log(`Files modified: ${totalModified}`, 'info');
    this.log(`Files with violations: ${totalViolations}`, 'info');
    this.log(`Errors: ${totalErrors}`, 'info');
    
    if (totalViolations > 0 && this.verbose) {
      this.log('', 'info');
      this.log('Violations by file:', 'warning');
      this.results.violations.forEach(result => {
        this.log(`  ${result.file} (${result.violations.length} violations)`, 'warning');
        result.violations.forEach(v => {
          this.log(`    Line ${v.line}: ${v.message} [${v.rule}]`, 'warning');
        });
      });
    }
  }

  /**
   * Generate report
   */
  generateReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      dryRun: this.dryRun,
      summary: {
        filesProcessed: this.results.processed.length,
        filesModified: this.results.standardized.length,
        filesWithViolations: this.results.violations.length,
        errors: this.results.errors.length
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
  
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    projectRoot: process.cwd()
  };
  
  const standardizer = new ContentStandardizer(options);
  const results = standardizer.standardize();
  
  const reportPath = path.join(standardizer.projectRoot, 'content-standardization-report.json');
  standardizer.generateReport(reportPath);
  
  process.exit(results.errors.length > 0 ? 1 : 0);
}

module.exports = ContentStandardizer;
