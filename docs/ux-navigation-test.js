/**
 * Documentation UX and Navigation Testing Script
 * 
 * This script validates:
 * 1. New user onboarding flows through documentation paths
 * 2. Task-oriented workflows for common documentation use cases
 * 3. Information architecture supports efficient information discovery
 * 
 * Requirements: 1.1, 2.1, 3.1
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper function to check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Helper function to read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

// Helper function to extract links from markdown
function extractLinks(content) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2]
    });
  }
  
  return links;
}

// Helper function to resolve relative paths
function resolvePath(basePath, relativePath) {
  // Remove anchor links
  const cleanPath = relativePath.split('#')[0];
  
  // Skip external URLs
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return null;
  }
  
  const baseDir = path.dirname(basePath);
  return path.resolve(baseDir, cleanPath);
}

// Test function wrapper
function test(name, testFn) {
  try {
    const result = testFn();
    if (result.passed) {
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASSED', message: result.message });
      console.log(`✓ ${name}`);
    } else {
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAILED', message: result.message });
      console.log(`✗ ${name}`);
      console.log(`  ${result.message}`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'ERROR', message: error.message });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

// Warning function
function warning(name, message) {
  testResults.warnings++;
  testResults.tests.push({ name, status: 'WARNING', message });
  console.log(`⚠ ${name}`);
  console.log(`  ${message}`);
}

console.log('='.repeat(80));
console.log('Documentation UX and Navigation Testing');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// TEST SUITE 1: New User Onboarding Flow
// ============================================================================
console.log('TEST SUITE 1: New User Onboarding Flow');
console.log('-'.repeat(80));

test('1.1 Main documentation index exists and is accessible', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  if (!fileExists(mainReadme)) {
    return { passed: false, message: 'Main README.md not found' };
  }
  
  const content = readFile(mainReadme);
  if (!content || content.length < 100) {
    return { passed: false, message: 'README.md is empty or too short' };
  }
  
  return { passed: true, message: 'Main documentation index is accessible' };
});

test('1.2 Quick Start section exists in main README', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  if (!content.includes('Quick Start') && !content.includes('🚀')) {
    return { passed: false, message: 'Quick Start section not found' };
  }
  
  return { passed: true, message: 'Quick Start section exists' };
});

test('1.3 Getting Started guide is linked from main README', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const links = extractLinks(content);
  const gettingStartedLink = links.find(link => 
    link.url.includes('getting-started')
  );
  
  if (!gettingStartedLink) {
    return { passed: false, message: 'Getting Started link not found in main README' };
  }
  
  return { passed: true, message: 'Getting Started guide is properly linked' };
});

test('1.4 Getting Started README exists and is comprehensive', () => {
  const gettingStartedReadme = path.join(__dirname, 'getting-started', 'README.md');
  
  if (!fileExists(gettingStartedReadme)) {
    return { passed: false, message: 'getting-started/README.md not found' };
  }
  
  const content = readFile(gettingStartedReadme);
  if (!content || content.length < 500) {
    return { passed: false, message: 'Getting Started README is too short or empty' };
  }
  
  return { passed: true, message: 'Getting Started README is comprehensive' };
});

test('1.5 Development environment setup guide exists', () => {
  const devEnvGuide = path.join(__dirname, 'getting-started', 'development-environment.md');
  
  if (!fileExists(devEnvGuide)) {
    return { passed: false, message: 'development-environment.md not found' };
  }
  
  const content = readFile(devEnvGuide);
  if (!content || content.length < 300) {
    return { passed: false, message: 'Development environment guide is too short' };
  }
  
  return { passed: true, message: 'Development environment setup guide exists' };
});

test('1.6 System overview is accessible from main README', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const links = extractLinks(content);
  const systemOverviewLink = links.find(link => 
    link.url.includes('system-overview')
  );
  
  if (!systemOverviewLink) {
    return { passed: false, message: 'System overview link not found' };
  }
  
  const systemOverviewPath = resolvePath(mainReadme, systemOverviewLink.url);
  if (!fileExists(systemOverviewPath)) {
    return { passed: false, message: 'System overview file does not exist' };
  }
  
  return { passed: true, message: 'System overview is accessible' };
});

test('1.7 New developer onboarding path is clear', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const hasCommonTasks = content.includes('Common Tasks') || content.includes('🎯');
  const hasNewDeveloperSection = content.includes('New Developer') || content.includes('For New Developers');
  
  if (!hasCommonTasks && !hasNewDeveloperSection) {
    return { passed: false, message: 'No clear onboarding path for new developers' };
  }
  
  return { passed: true, message: 'New developer onboarding path is clear' };
});

console.log('');

// ============================================================================
// TEST SUITE 2: Task-Oriented Workflows
// ============================================================================
console.log('TEST SUITE 2: Task-Oriented Workflows');
console.log('-'.repeat(80));

test('2.1 Common tasks section exists for different user roles', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const hasCommonTasks = content.includes('Common Tasks');
  const hasDeveloperTasks = content.includes('For New Developers') || content.includes('Developer');
  const hasAdminTasks = content.includes('System Administrator') || content.includes('Administrator');
  
  if (!hasCommonTasks || !hasDeveloperTasks || !hasAdminTasks) {
    return { passed: false, message: 'Common tasks section incomplete or missing role-specific tasks' };
  }
  
  return { passed: true, message: 'Common tasks section exists for different roles' };
});

test('2.2 Deployment workflow is documented and accessible', () => {
  const deploymentReadme = path.join(__dirname, 'deployment', 'README.md');
  
  if (!fileExists(deploymentReadme)) {
    return { passed: false, message: 'deployment/README.md not found' };
  }
  
  const deploymentGuide = path.join(__dirname, 'deployment', 'deployment-guide.md');
  if (!fileExists(deploymentGuide)) {
    return { passed: false, message: 'deployment-guide.md not found' };
  }
  
  return { passed: true, message: 'Deployment workflow is documented' };
});

test('2.3 Troubleshooting guide is accessible', () => {
  const troubleshootingGuide = path.join(__dirname, 'deployment', 'troubleshooting.md');
  
  if (!fileExists(troubleshootingGuide)) {
    return { passed: false, message: 'troubleshooting.md not found' };
  }
  
  const content = readFile(troubleshootingGuide);
  if (!content || content.length < 200) {
    return { passed: false, message: 'Troubleshooting guide is too short' };
  }
  
  return { passed: true, message: 'Troubleshooting guide is accessible' };
});

test('2.4 API documentation workflow is clear', () => {
  const apiReadme = path.join(__dirname, 'api', 'README.md');
  
  if (!fileExists(apiReadme)) {
    return { passed: false, message: 'api/README.md not found' };
  }
  
  const content = readFile(apiReadme);
  if (!content || content.length < 300) {
    return { passed: false, message: 'API README is too short' };
  }
  
  return { passed: true, message: 'API documentation workflow is clear' };
});

test('2.5 Integration documentation is organized by system type', () => {
  const integrationsReadme = path.join(__dirname, 'integrations', 'README.md');
  
  if (!fileExists(integrationsReadme)) {
    return { passed: false, message: 'integrations/README.md not found' };
  }
  
  // Check for subdirectories
  const bookingEngineDir = path.join(__dirname, 'integrations', 'booking-engine');
  const paymentSystemsDir = path.join(__dirname, 'integrations', 'payment-systems');
  const otaSystemsDir = path.join(__dirname, 'integrations', 'ota-systems');
  
  const hasBookingEngine = fs.existsSync(bookingEngineDir);
  const hasPaymentSystems = fs.existsSync(paymentSystemsDir);
  const hasOtaSystems = fs.existsSync(otaSystemsDir);
  
  if (!hasBookingEngine || !hasPaymentSystems || !hasOtaSystems) {
    return { passed: false, message: 'Integration documentation is not fully organized by system type' };
  }
  
  return { passed: true, message: 'Integration documentation is organized by system type' };
});

test('2.6 Feature documentation is accessible and organized', () => {
  const featuresReadme = path.join(__dirname, 'features', 'README.md');
  
  if (!fileExists(featuresReadme)) {
    return { passed: false, message: 'features/README.md not found' };
  }
  
  const content = readFile(featuresReadme);
  if (!content || content.length < 200) {
    return { passed: false, message: 'Features README is too short' };
  }
  
  return { passed: true, message: 'Feature documentation is accessible' };
});

console.log('');

// ============================================================================
// TEST SUITE 3: Information Architecture and Discovery
// ============================================================================
console.log('TEST SUITE 3: Information Architecture and Discovery');
console.log('-'.repeat(80));

test('3.1 Documentation map exists in main README', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const hasDocMap = content.includes('Documentation Map') || content.includes('📋');
  
  if (!hasDocMap) {
    return { passed: false, message: 'Documentation map not found in main README' };
  }
  
  return { passed: true, message: 'Documentation map exists' };
});

test('3.2 All major sections have README index files', () => {
  const sections = [
    'getting-started',
    'architecture',
    'api',
    'frontend',
    'backend',
    'deployment',
    'integrations',
    'features',
    'development',
    'reference'
  ];
  
  const missingSections = [];
  
  for (const section of sections) {
    const sectionReadme = path.join(__dirname, section, 'README.md');
    if (!fileExists(sectionReadme)) {
      missingSections.push(section);
    }
  }
  
  if (missingSections.length > 0) {
    return { 
      passed: false, 
      message: `Missing README files in sections: ${missingSections.join(', ')}` 
    };
  }
  
  return { passed: true, message: 'All major sections have README index files' };
});

test('3.3 Cross-references exist between related sections', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const links = extractLinks(content);
  
  // Check for links to multiple sections
  const sectionLinks = {
    architecture: false,
    api: false,
    frontend: false,
    backend: false,
    deployment: false,
    integrations: false
  };
  
  links.forEach(link => {
    Object.keys(sectionLinks).forEach(section => {
      if (link.url.includes(section)) {
        sectionLinks[section] = true;
      }
    });
  });
  
  const linkedSections = Object.values(sectionLinks).filter(v => v).length;
  
  if (linkedSections < 4) {
    return { 
      passed: false, 
      message: `Only ${linkedSections} major sections are cross-referenced` 
    };
  }
  
  return { passed: true, message: 'Cross-references exist between related sections' };
});

test('3.4 Search strategies section exists', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const hasSearchSection = content.includes('Finding Information') || 
                          content.includes('Search Strategies') ||
                          content.includes('🔍');
  
  if (!hasSearchSection) {
    return { passed: false, message: 'Search strategies section not found' };
  }
  
  return { passed: true, message: 'Search strategies section exists' };
});

test('3.5 Navigation aids are documented', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const hasNavigationAids = content.includes('Navigation Aids') || 
                           content.includes('Cross-References') ||
                           content.includes('Breadcrumbs');
  
  if (!hasNavigationAids) {
    return { passed: false, message: 'Navigation aids not documented' };
  }
  
  return { passed: true, message: 'Navigation aids are documented' };
});

test('3.6 Templates directory exists for consistency', () => {
  const templatesDir = path.join(__dirname, 'templates');
  
  if (!fs.existsSync(templatesDir)) {
    return { passed: false, message: 'templates/ directory not found' };
  }
  
  const templatesReadme = path.join(templatesDir, 'README.md');
  if (!fileExists(templatesReadme)) {
    return { passed: false, message: 'templates/README.md not found' };
  }
  
  return { passed: true, message: 'Templates directory exists' };
});

test('3.7 Audience targeting is clear in documentation map', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const hasAudienceInfo = content.includes('Audience') || 
                         content.includes('developer') ||
                         content.includes('administrator');
  
  if (!hasAudienceInfo) {
    return { passed: false, message: 'Audience targeting not clear' };
  }
  
  return { passed: true, message: 'Audience targeting is clear' };
});

console.log('');

// ============================================================================
// TEST SUITE 4: Link Integrity
// ============================================================================
console.log('TEST SUITE 4: Link Integrity');
console.log('-'.repeat(80));

test('4.1 Main README links are valid', () => {
  const mainReadme = path.join(__dirname, 'README.md');
  const content = readFile(mainReadme);
  
  if (!content) {
    return { passed: false, message: 'Cannot read README.md' };
  }
  
  const links = extractLinks(content);
  const brokenLinks = [];
  
  links.forEach(link => {
    const resolvedPath = resolvePath(mainReadme, link.url);
    if (resolvedPath && !fileExists(resolvedPath)) {
      brokenLinks.push(link.url);
    }
  });
  
  if (brokenLinks.length > 0) {
    return { 
      passed: false, 
      message: `Found ${brokenLinks.length} broken links: ${brokenLinks.slice(0, 3).join(', ')}${brokenLinks.length > 3 ? '...' : ''}` 
    };
  }
  
  return { passed: true, message: 'All main README links are valid' };
});

test('4.2 Section README files have valid internal links', () => {
  const sections = ['getting-started', 'architecture', 'api', 'frontend', 'backend'];
  let totalBrokenLinks = 0;
  const brokenLinkDetails = [];
  
  sections.forEach(section => {
    const sectionReadme = path.join(__dirname, section, 'README.md');
    if (fileExists(sectionReadme)) {
      const content = readFile(sectionReadme);
      if (content) {
        const links = extractLinks(content);
        links.forEach(link => {
          const resolvedPath = resolvePath(sectionReadme, link.url);
          if (resolvedPath && !fileExists(resolvedPath)) {
            totalBrokenLinks++;
            brokenLinkDetails.push(`${section}: ${link.url}`);
          }
        });
      }
    }
  });
  
  if (totalBrokenLinks > 0) {
    return { 
      passed: false, 
      message: `Found ${totalBrokenLinks} broken links in section READMEs: ${brokenLinkDetails.slice(0, 2).join(', ')}${totalBrokenLinks > 2 ? '...' : ''}` 
    };
  }
  
  return { passed: true, message: 'Section README files have valid internal links' };
});

console.log('');

// ============================================================================
// Summary
// ============================================================================
console.log('='.repeat(80));
console.log('Test Summary');
console.log('='.repeat(80));
console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
console.log(`Passed: ${testResults.passed}`);
console.log(`Failed: ${testResults.failed}`);
console.log(`Warnings: ${testResults.warnings}`);
console.log('');

if (testResults.failed > 0) {
  console.log('Failed Tests:');
  testResults.tests
    .filter(t => t.status === 'FAILED' || t.status === 'ERROR')
    .forEach(t => {
      console.log(`  - ${t.name}`);
      console.log(`    ${t.message}`);
    });
  console.log('');
}

if (testResults.warnings > 0) {
  console.log('Warnings:');
  testResults.tests
    .filter(t => t.status === 'WARNING')
    .forEach(t => {
      console.log(`  - ${t.name}`);
      console.log(`    ${t.message}`);
    });
  console.log('');
}

const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
console.log(`Success Rate: ${successRate}%`);
console.log('');

// Exit with appropriate code
process.exit(testResults.failed > 0 ? 1 : 0);
