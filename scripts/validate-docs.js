#!/usr/bin/env node

/**
 * Master Documentation Validation Script
 * 
 * Runs all documentation quality assurance checks:
 * - Link validation
 * - Freshness checking
 * - Format validation
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = __dirname;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Run a validation script
 */
function runValidation(scriptName, description) {
  console.log(`\n${colors.bright}${colors.cyan}Running ${description}...${colors.reset}\n`);
  console.log('='.repeat(80));
  
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  
  try {
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.dirname(SCRIPTS_DIR)
    });
    
    console.log(`\n${colors.green}✓ ${description} passed${colors.reset}`);
    return { success: true, name: description };
  } catch (error) {
    console.log(`\n${colors.red}✗ ${description} failed${colors.reset}`);
    return { success: false, name: description, exitCode: error.status };
  }
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Documentation Quality Assurance Suite                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const results = [];
  
  // Run all validation checks
  results.push(runValidation('validate-doc-links.js', 'Link Validation'));
  results.push(runValidation('check-doc-freshness.js', 'Freshness Check'));
  results.push(runValidation('validate-doc-format.js', 'Format Validation'));
  
  // Generate summary report
  console.log('\n' + '='.repeat(80));
  console.log(`\n${colors.bright}${colors.blue}Summary Report${colors.reset}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const warnings = results.filter(r => r.exitCode === 2).length;
  
  console.log(`Total checks: ${results.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  
  if (warnings > 0) {
    console.log(`${colors.yellow}Warnings: ${warnings}${colors.reset}`);
  }
  
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  }
  
  console.log('');
  
  results.forEach(result => {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? colors.green : 
                  result.exitCode === 2 ? colors.yellow : colors.red;
    console.log(`  ${color}${icon} ${result.name}${colors.reset}`);
  });
  
  console.log('');
  
  // Determine exit code
  const hasFailures = results.some(r => !r.success && r.exitCode !== 2);
  const hasWarnings = results.some(r => r.exitCode === 2);
  
  if (hasFailures) {
    console.log(`${colors.red}${colors.bright}Documentation validation failed!${colors.reset}`);
    console.log('Please fix the issues above before proceeding.\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`${colors.yellow}${colors.bright}Documentation validation completed with warnings.${colors.reset}`);
    console.log('Consider addressing the warnings above.\n');
    process.exit(2);
  } else {
    console.log(`${colors.green}${colors.bright}All documentation validation checks passed!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
