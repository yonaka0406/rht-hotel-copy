#!/usr/bin/env node

/**
 * Combined Documentation Validation Script
 * 
 * This script runs all documentation validation tools:
 * - Requirements validation (EARS format, completeness, traceability)
 * - Link checking (internal/external links, markdown formatting)
 */

const RequirementsValidator = require('./validate-requirements');
const DocumentationLinkChecker = require('./validate-docs-links');

async function main() {
    console.log('🔍 COMPREHENSIVE DOCUMENTATION VALIDATION');
    console.log('=' .repeat(60));
    
    let overallSuccess = true;
    
    // Get root path from command line argument or use current directory
    const rootPath = process.argv[2] || '.';
    
    try {
        // Run requirements validation
        console.log('\n📋 PHASE 1: Requirements Validation');
        console.log('-'.repeat(40));
        
        const requirementsValidator = new RequirementsValidator();
        requirementsValidator.validateAllRequirements('docs');
        const requirementsSuccess = requirementsValidator.generateReport();
        
        if (!requirementsSuccess) {
            overallSuccess = false;
        }
        
        // Run link checking
        console.log('\n🔗 PHASE 2: Link Validation');
        console.log('-'.repeat(40));
        
        const linkChecker = new DocumentationLinkChecker();
        await linkChecker.validateAllDocumentation(rootPath);
        const linksSuccess = linkChecker.generateReport();
        
        if (!linksSuccess) {
            overallSuccess = false;
        }
        
        // Overall summary
        console.log('\n' + '='.repeat(60));
        console.log('OVERALL VALIDATION SUMMARY');
        console.log('='.repeat(60));
        
        if (overallSuccess) {
            console.log('✅ All documentation validation checks passed!');
            console.log('📚 Your documentation is in great shape!');
        } else {
            console.log('❌ Some validation checks failed.');
            console.log('📝 Please review and fix the issues above.');
        }
        
        console.log('\nValidation completed.');
        
    } catch (error) {
        console.error('❌ Validation failed with error:', error.message);
        overallSuccess = false;
    }
    
    process.exit(overallSuccess ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { RequirementsValidator, DocumentationLinkChecker };