#!/usr/bin/env node

/**
 * Requirements Validation Script
 * 
 * This script validates requirements documents for:
 * - EARS format compliance
 * - Completeness checking for required fields
 * - Basic traceability validation
 */

const fs = require('fs');
const path = require('path');

class RequirementsValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.requirements = new Map();
    }

    /**
     * Validate EARS format patterns
     * EARS patterns: WHEN/IF/WHERE/WHILE [condition] THEN [system] SHALL [response]
     */
    validateEARSFormat(text, filePath) {
        const earsPatterns = [
            /WHEN\s+.+\s+THEN\s+.+\s+SHALL\s+.+/gi,
            /IF\s+.+\s+THEN\s+.+\s+SHALL\s+.+/gi,
            /WHERE\s+.+\s+THEN\s+.+\s+SHALL\s+.+/gi,
            /WHILE\s+.+\s+THEN\s+.+\s+SHALL\s+.+/gi
        ];

        const lines = text.split('\n');
        const acceptanceCriteriaLines = [];
        let inAcceptanceCriteria = false;

        // Find acceptance criteria sections
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes('acceptance criteria')) {
                inAcceptanceCriteria = true;
            } else if (line.startsWith('###') || line.startsWith('##')) {
                inAcceptanceCriteria = false;
            } else if (inAcceptanceCriteria && line.trim().match(/^\d+\./)) {
                acceptanceCriteriaLines.push({ line: line.trim(), number: index + 1 });
            }
        });

        // Validate each acceptance criteria line
        acceptanceCriteriaLines.forEach(({ line, number }) => {
            const hasEARSPattern = earsPatterns.some(pattern => pattern.test(line));
            if (!hasEARSPattern) {
                this.warnings.push({
                    file: filePath,
                    line: number,
                    message: `Acceptance criteria may not follow EARS format: "${line}"`
                });
            }
        });

        return acceptanceCriteriaLines.length;
    }

    /**
     * Check for required fields in requirements documents
     */
    validateRequiredFields(content, filePath) {
        const requiredSections = [
            'Introduction',
            'Requirements',
            'User Story',
            'Acceptance Criteria'
        ];

        const missingFields = [];
        
        requiredSections.forEach(section => {
            const sectionRegex = new RegExp(`#{1,4}\\s*${section}`, 'i');
            if (!sectionRegex.test(content)) {
                missingFields.push(section);
            }
        });

        if (missingFields.length > 0) {
            this.errors.push({
                file: filePath,
                message: `Missing required sections: ${missingFields.join(', ')}`
            });
        }

        // Check for user stories format
        const userStoryPattern = /\*\*User Story:\*\*\s*As a .+, I want .+, so that .+/gi;
        const userStories = content.match(userStoryPattern) || [];
        
        if (userStories.length === 0) {
            this.warnings.push({
                file: filePath,
                message: 'No properly formatted user stories found (should follow: "As a [role], I want [feature], so that [benefit]")'
            });
        }

        return {
            hasRequiredFields: missingFields.length === 0,
            userStoriesCount: userStories.length
        };
    }

    /**
     * Extract requirement IDs and dependencies for traceability
     */
    extractRequirementInfo(content, filePath) {
        const requirements = [];
        
        // Extract requirement sections (### Requirement N)
        const requirementMatches = content.match(/###\s*Requirement\s+(\d+(?:\.\d+)?)/gi) || [];
        
        requirementMatches.forEach(match => {
            const idMatch = match.match(/(\d+(?:\.\d+)?)/);
            if (idMatch) {
                requirements.push({
                    id: idMatch[1],
                    file: filePath
                });
            }
        });

        // Extract requirement references (_Requirements: X.X, Y.Y_)
        const referenceMatches = content.match(/_Requirements?:\s*([0-9.,\s]+)_/gi) || [];
        const dependencies = [];
        
        referenceMatches.forEach(match => {
            const refs = match.match(/([0-9]+(?:\.[0-9]+)?)/g) || [];
            dependencies.push(...refs);
        });

        return { requirements, dependencies };
    }

    /**
     * Validate traceability - ensure referenced requirements exist
     */
    validateTraceability() {
        const allRequirementIds = new Set();
        const allDependencies = new Set();

        // Collect all requirement IDs and dependencies
        this.requirements.forEach(({ requirements, dependencies }) => {
            requirements.forEach(req => allRequirementIds.add(req.id));
            dependencies.forEach(dep => allDependencies.add(dep));
        });

        // Check for missing requirement dependencies
        allDependencies.forEach(dep => {
            if (!allRequirementIds.has(dep)) {
                this.errors.push({
                    message: `Referenced requirement ${dep} not found in any requirements document`
                });
            }
        });
    }

    /**
     * Validate a single requirements file
     */
    validateFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            console.log(`\nValidating: ${filePath}`);
            
            // Validate EARS format
            const earsCount = this.validateEARSFormat(content, filePath);
            
            // Validate required fields
            const fieldValidation = this.validateRequiredFields(content, filePath);
            
            // Extract requirement info for traceability
            const reqInfo = this.extractRequirementInfo(content, filePath);
            this.requirements.set(filePath, reqInfo);
            
            console.log(`  - Found ${reqInfo.requirements.length} requirements`);
            console.log(`  - Found ${fieldValidation.userStoriesCount} user stories`);
            console.log(`  - Found ${earsCount} acceptance criteria lines`);
            console.log(`  - Found ${reqInfo.dependencies.length} requirement references`);
            
        } catch (error) {
            this.errors.push({
                file: filePath,
                message: `Error reading file: ${error.message}`
            });
        }
    }

    /**
     * Find and validate all requirements files
     */
    validateAllRequirements(docsPath = 'docs') {
        const requirementsPath = path.join(docsPath, 'requirements');
        
        // Check if requirements directory exists
        if (!fs.existsSync(requirementsPath)) {
            this.errors.push({
                message: `Requirements directory not found: ${requirementsPath}`
            });
            return;
        }

        // Find all markdown files in requirements directory
        const files = fs.readdirSync(requirementsPath)
            .filter(file => file.endsWith('.md'))
            .map(file => path.join(requirementsPath, file));

        if (files.length === 0) {
            this.warnings.push({
                message: `No requirements files found in ${requirementsPath}`
            });
            return;
        }

        // Validate each file
        files.forEach(file => this.validateFile(file));
        
        // Validate traceability across all files
        this.validateTraceability();
    }

    /**
     * Generate validation report
     */
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('REQUIREMENTS VALIDATION REPORT');
        console.log('='.repeat(60));

        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('✅ All requirements validation checks passed!');
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
function main() {
    const validator = new RequirementsValidator();
    
    // Get docs path from command line argument or use default
    const docsPath = process.argv[2] || 'docs';
    
    console.log('Requirements Validation Tool');
    console.log(`Scanning for requirements in: ${docsPath}`);
    
    validator.validateAllRequirements(docsPath);
    const success = validator.generateReport();
    
    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    main();
}

module.exports = RequirementsValidator;