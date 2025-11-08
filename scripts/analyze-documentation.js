#!/usr/bin/env node

/**
 * Documentation Content Analysis Script
 * 
 * This script analyzes the current documentation structure and creates
 * an inventory of all documentation files for migration planning.
 */

const fs = require('fs');
const path = require('path');

class DocumentationAnalyzer {
    constructor(rootPath) {
        this.rootPath = rootPath;
        this.inventory = {
            rootLevelDocs: [],
            existingDocsStructure: [],
            componentDocs: [],
            totalFiles: 0,
            analysisDate: new Date().toISOString()
        };
    }

    /**
     * Analyze all documentation files in the project
     */
    async analyze() {
        console.log('🔍 Starting documentation analysis...');
        
        // Analyze root-level documentation files
        this.analyzeRootLevel();
        
        // Analyze existing docs/ directory
        this.analyzeDocsDirectory();
        
        // Analyze component-specific documentation
        this.analyzeComponentDocs();
        
        // Generate analysis report
        this.generateReport();
        
        console.log('✅ Documentation analysis complete!');
        return this.inventory;
    }

    /**
     * Analyze root-level documentation files
     */
    analyzeRootLevel() {
        console.log('📄 Analyzing root-level documentation...');
        
        const rootFiles = fs.readdirSync(this.rootPath);
        const docFiles = rootFiles.filter(file => 
            file.endsWith('.md') && 
            file !== 'README.md' // Keep README.md separate
        );

        docFiles.forEach(file => {
            const filePath = path.join(this.rootPath, file);
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            
            this.inventory.rootLevelDocs.push({
                filename: file,
                path: filePath,
                size: stats.size,
                lastModified: stats.mtime,
                lineCount: content.split('\n').length,
                hasLinks: this.extractLinks(content).length > 0,
                suggestedLocation: this.suggestNewLocation(file, content)
            });
        });

        this.inventory.totalFiles += docFiles.length;
        console.log(`   Found ${docFiles.length} root-level documentation files`);
    }

    /**
     * Analyze existing docs/ directory structure
     */
    analyzeDocsDirectory() {
        console.log('📁 Analyzing existing docs/ directory...');
        
        const docsPath = path.join(this.rootPath, 'docs');
        if (!fs.existsSync(docsPath)) {
            console.log('   No existing docs/ directory found');
            return;
        }

        this.analyzeDirectory(docsPath, 'docs');
        console.log(`   Analyzed existing docs/ directory structure`);
    }

    /**
     * Analyze component-specific documentation
     */
    analyzeComponentDocs() {
        console.log('🧩 Analyzing component-specific documentation...');
        
        const componentDirs = ['api', 'frontend', 'scripts'];
        
        componentDirs.forEach(dir => {
            const dirPath = path.join(this.rootPath, dir);
            if (fs.existsSync(dirPath)) {
                this.analyzeDirectory(dirPath, dir);
            }
        });

        console.log(`   Analyzed component directories`);
    }

    /**
     * Recursively analyze a directory for documentation files
     */
    analyzeDirectory(dirPath, relativePath) {
        const items = fs.readdirSync(dirPath);
        
        items.forEach(item => {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);
            const relativeItemPath = path.join(relativePath, item);

            if (stats.isDirectory()) {
                // Recursively analyze subdirectories
                this.analyzeDirectory(itemPath, relativeItemPath);
            } else if (item.endsWith('.md')) {
                const content = fs.readFileSync(itemPath, 'utf8');
                
                const docInfo = {
                    filename: item,
                    path: itemPath,
                    relativePath: relativeItemPath,
                    size: stats.size,
                    lastModified: stats.mtime,
                    lineCount: content.split('\n').length,
                    links: this.extractLinks(content),
                    headings: this.extractHeadings(content)
                };

                if (relativePath.startsWith('docs')) {
                    this.inventory.existingDocsStructure.push(docInfo);
                } else {
                    this.inventory.componentDocs.push(docInfo);
                }

                this.inventory.totalFiles++;
            }
        });
    }

    /**
     * Extract markdown links from content
     */
    extractLinks(content) {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const links = [];
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            links.push({
                text: match[1],
                url: match[2],
                isInternal: !match[2].startsWith('http')
            });
        }

        return links;
    }

    /**
     * Extract headings from markdown content
     */
    extractHeadings(content) {
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        const headings = [];
        let match;

        while ((match = headingRegex.exec(content)) !== null) {
            headings.push({
                level: match[1].length,
                text: match[2]
            });
        }

        return headings;
    }

    /**
     * Suggest new location for root-level documentation files
     */
    suggestNewLocation(filename, content) {
        const suggestions = {
            'ARCHITECTURE.md': 'docs/architecture/system-overview.md',
            'BOOKING_ENGINE_API_DOCUMENTATION.md': 'docs/api/endpoints/booking-engine.md',
            'BOOKING_ENGINE_INTEGRATION_STRATEGY.md': 'docs/integrations/booking-engine/overview.md',
            'STATE_MGMT.md': 'docs/frontend/state-management.md',
            'square_payment_integration.md': 'docs/integrations/payment-systems/square-integration.md',
            'BUGS.md': 'docs/development/known-issues.md',
            'CHANGELOG.md': 'docs/reference/changelog.md',
            'DEALT.md': 'docs/development/dealt-issues.md',
            'GEMINI.md': 'docs/development/ai-assistance.md'
        };

        return suggestions[filename] || `docs/reference/${filename.toLowerCase()}`;
    }

    /**
     * Generate comprehensive analysis report
     */
    generateReport() {
        const reportPath = path.join(this.rootPath, 'docs', 'migration-analysis-report.md');
        
        const report = `# Documentation Migration Analysis Report

Generated: ${this.inventory.analysisDate}
Total Documentation Files: ${this.inventory.totalFiles}

## Root-Level Documentation Files (${this.inventory.rootLevelDocs.length} files)

These files need to be migrated to the new documentation structure:

${this.inventory.rootLevelDocs.map(doc => `
### ${doc.filename}
- **Current Path**: \`${doc.path}\`
- **Suggested Location**: \`${doc.suggestedLocation}\`
- **Size**: ${doc.size} bytes (${doc.lineCount} lines)
- **Last Modified**: ${doc.lastModified.toISOString().split('T')[0]}
- **Has Internal Links**: ${doc.hasLinks ? 'Yes' : 'No'}
`).join('\n')}

## Existing Docs Structure (${this.inventory.existingDocsStructure.length} files)

Current organized documentation that may need reorganization:

${this.inventory.existingDocsStructure.map(doc => `
### ${doc.relativePath}
- **Size**: ${doc.size} bytes (${doc.lineCount} lines)
- **Internal Links**: ${doc.links.filter(l => l.isInternal).length}
- **External Links**: ${doc.links.filter(l => !l.isInternal).length}
- **Headings**: ${doc.headings.length}
`).join('\n')}

## Component Documentation (${this.inventory.componentDocs.length} files)

Documentation within component directories:

${this.inventory.componentDocs.map(doc => `
### ${doc.relativePath}
- **Size**: ${doc.size} bytes (${doc.lineCount} lines)
- **Links**: ${doc.links.length}
`).join('\n')}

## Migration Recommendations

### High Priority
1. **Root-level files** should be migrated first as they contain critical system information
2. **ARCHITECTURE.md** → \`docs/architecture/system-overview.md\`
3. **API documentation** → \`docs/api/endpoints/\` directory
4. **Integration guides** → \`docs/integrations/\` directory

### Medium Priority
1. **Existing docs/ content** should be reorganized into new structure
2. **Component READMEs** should be consolidated where appropriate
3. **Cross-references** need to be updated after migration

### Low Priority
1. **Legacy files** can be archived or moved to reference section
2. **Duplicate content** should be consolidated
3. **Outdated information** should be updated during migration

## Next Steps

1. **Create migration scripts** for systematic file movement
2. **Update internal links** to reflect new structure
3. **Consolidate duplicate content** where found
4. **Validate all cross-references** after migration
5. **Create comprehensive navigation** in new structure

---

*This report was generated automatically by the documentation analysis script.*
`;

        fs.writeFileSync(reportPath, report);
        console.log(`📊 Analysis report saved to: ${reportPath}`);
    }
}

// Run the analysis if this script is executed directly
if (require.main === module) {
    const analyzer = new DocumentationAnalyzer(process.cwd());
    analyzer.analyze().catch(console.error);
}

module.exports = DocumentationAnalyzer;