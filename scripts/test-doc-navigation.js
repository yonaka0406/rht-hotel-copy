#!/usr/bin/env node

/**
 * Documentation Navigation and User Experience Testing
 * 
 * Tests documentation navigation paths and user workflows:
 * - New user onboarding flows
 * - Task-oriented workflows
 * - Information architecture validation
 * - Navigation completeness
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

// User journey definitions
const USER_JOURNEYS = {
  newDeveloper: {
    name: 'New Developer Onboarding',
    description: 'A new developer joining the project',
    expectedPath: [
      'README.md',
      'getting-started/README.md',
      'getting-started/quick-setup.md',
      'getting-started/development-environment.md',
      'architecture/README.md',
      'architecture/system-overview.md'
    ],
    requiredSections: [
      'Quick Start',
      'Prerequisites',
      'Installation',
      'Architecture Overview',
      'Technology Stack'
    ]
  },
  apiIntegration: {
    name: 'API Integration Developer',
    description: 'Developer integrating with the API',
    expectedPath: [
      'README.md',
      'api/README.md',
      'api/endpoints/booking-engine.md',
      'integrations/README.md'
    ],
    requiredSections: [
      'Authentication',
      'Endpoints',
      'Request',
      'Response',
      'Examples'
    ]
  },
  systemAdmin: {
    name: 'System Administrator',
    description: 'Admin deploying and maintaining the system',
    expectedPath: [
      'README.md',
      'deployment/README.md',
      'deployment/deployment-guide.md',
      'deployment/troubleshooting.md',
      'deployment/maintenance.md'
    ],
    requiredSections: [
      'Deployment',
      'Configuration',
      'Monitoring',
      'Troubleshooting',
      'Maintenance'
    ]
  },
  frontendDeveloper: {
    name: 'Frontend Developer',
    description: 'Developer working on frontend features',
    expectedPath: [
      'README.md',
      'frontend/README.md',
      'frontend/component-library.md',
      'frontend/state-management.md',
      'getting-started/development-environment.md'
    ],
    requiredSections: [
      'Components',
      'State Management',
      'Routing',
      'Styling',
      'Testing'
    ]
  },
  backendDeveloper: {
    name: 'Backend Developer',
    description: 'Developer working on backend services',
    expectedPath: [
      'README.md',
      'backend/README.md',
      'backend/service-architecture.md',
      'backend/database-schema.md',
      'api/README.md'
    ],
    requiredSections: [
      'Service Architecture',
      'Database',
      'API',
      'Business Logic',
      'Testing'
    ]
  }
};

// Task-oriented workflows
const TASK_WORKFLOWS = {
  addNewFeature: {
    name: 'Adding a New Feature',
    steps: [
      { doc: 'development/README.md', section: 'Development Process' },
      { doc: 'architecture/component-architecture.md', section: 'Component Design' },
      { doc: 'frontend/component-library.md', section: 'Creating Components' },
      { doc: 'backend/service-architecture.md', section: 'Service Layer' }
    ]
  },
  deployToProduction: {
    name: 'Deploying to Production',
    steps: [
      { doc: 'deployment/README.md', section: 'Deployment Overview' },
      { doc: 'deployment/deployment-guide.md', section: 'Production Deployment' },
      { doc: 'deployment/maintenance.md', section: 'Post-Deployment' }
    ]
  },
  integratePayment: {
    name: 'Integrating Payment System',
    steps: [
      { doc: 'integrations/README.md', section: 'Integration Overview' },
      { doc: 'integrations/payment-systems/payment-gateway-guide.md', section: 'Setup' },
      { doc: 'integrations/testing-and-maintenance.md', section: 'Testing' }
    ]
  },
  troubleshootIssue: {
    name: 'Troubleshooting an Issue',
    steps: [
      { doc: 'deployment/troubleshooting.md', section: 'Common Issues' },
      { doc: 'integrations/troubleshooting.md', section: 'Integration Issues' },
      { doc: 'reference/README.md', section: 'Error Codes' }
    ]
  }
};

// Results tracking
const results = {
  journeyTests: [],
  workflowTests: [],
  navigationTests: [],
  informationArchitecture: { passed: false, issues: [] }
};

/**
 * Test a user journey
 */
function testUserJourney(journeyKey, journey) {
  console.log(`\nTesting: ${journey.name}`);
  console.log(`Description: ${journey.description}`);
  
  const issues = [];
  const missingDocs = [];
  const missingSections = [];
  
  // Check if all expected documents exist
  journey.expectedPath.forEach(docPath => {
    const fullPath = path.join(DOCS_DIR, docPath);
    if (!fs.existsSync(fullPath)) {
      missingDocs.push(docPath);
      issues.push(`Missing document: ${docPath}`);
    } else {
      // Check for required sections
      const content = fs.readFileSync(fullPath, 'utf8');
      journey.requiredSections.forEach(section => {
        if (!hasSection(content, section)) {
          missingSections.push({ doc: docPath, section });
        }
      });
    }
  });
  
  // Check for navigation links between documents
  const navigationIssues = checkNavigationLinks(journey.expectedPath);
  issues.push(...navigationIssues);
  
  const passed = issues.length === 0 && missingSections.length === 0;
  
  if (passed) {
    console.log(`  ✅ Journey path is complete`);
  } else {
    console.log(`  ❌ Issues found:`);
    if (missingDocs.length > 0) {
      console.log(`     Missing documents: ${missingDocs.length}`);
    }
    if (missingSections.length > 0) {
      console.log(`     Missing sections: ${missingSections.length}`);
      missingSections.forEach(item => console.log(`       - Doc: ${item.doc}, Section: "${item.section}"`));
    }
    if (navigationIssues.length > 0) {
      console.log(`     Navigation issues: ${navigationIssues.length}`);
    }
  }
  
  return {
    journey: journey.name,
    passed,
    missingDocs,
    missingSections,
    navigationIssues
  };
}

/**
 * Test a task workflow
 */
function testTaskWorkflow(workflowKey, workflow) {
  console.log(`\nTesting: ${workflow.name}`);
  
  const issues = [];
  const missingSteps = [];
  
  workflow.steps.forEach((step, index) => {
    const fullPath = path.join(DOCS_DIR, step.doc);
    
    if (!fs.existsSync(fullPath)) {
      missingSteps.push(`Step ${index + 1}: ${step.doc} not found`);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!hasSection(content, step.section)) {
        missingSteps.push(`Step ${index + 1}: Section "${step.section}" not found in ${step.doc}`);
      }
    }
  });
  
  const passed = missingSteps.length === 0;
  
  if (passed) {
    console.log(`  ✅ Workflow is complete`);
  } else {
    console.log(`  ❌ Missing steps: ${missingSteps.length}`);
  }
  
  return {
    workflow: workflow.name,
    passed,
    missingSteps
  };
}

/**
 * Check if content has a section
 */
function hasSection(content, sectionName) {
  const sectionRegex = new RegExp(`^#{1,6}\\s+.*${sectionName}.*$`, 'mi');
  return sectionRegex.test(content);
}

/**
 * Check navigation links between documents
 */
function checkNavigationLinks(docPaths) {
  const issues = [];
  
  for (let i = 0; i < docPaths.length - 1; i++) {
    const currentDoc = docPaths[i];
    const nextDoc = docPaths[i + 1];
    
    const currentPath = path.join(DOCS_DIR, currentDoc);
    if (!fs.existsSync(currentPath)) continue;
    
    const content = fs.readFileSync(currentPath, 'utf8');
    const nextDocName = path.basename(nextDoc);
    
    // Check if there's a link to the next document
    const hasLink = content.includes(nextDoc) || content.includes(nextDocName);
    
    if (!hasLink) {
      issues.push(`${currentDoc} doesn't link to ${nextDoc}`);
    }
  }
  
  return issues;
}

/**
 * Test navigation completeness
 */
function testNavigationCompleteness() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('Testing Navigation Completeness...');
  console.log('='.repeat(70));
  
  const issues = [];
  
  // Check main README has links to all major sections
  const mainReadme = path.join(DOCS_DIR, 'README.md');
  if (fs.existsSync(mainReadme)) {
    const content = fs.readFileSync(mainReadme, 'utf8');
    
    const majorSections = [
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
    
    majorSections.forEach(section => {
      if (!content.includes(section)) {
        issues.push(`Main README doesn't link to ${section}/`);
      }
    });
  } else {
    issues.push('Main README.md not found');
  }
  
  // Check each section README has links to its documents
  const sectionReadmes = [
    'getting-started/README.md',
    'architecture/README.md',
    'api/README.md',
    'frontend/README.md',
    'backend/README.md',
    'deployment/README.md',
    'integrations/README.md',
    'features/README.md',
    'development/README.md',
    'reference/README.md'
  ];
  
  sectionReadmes.forEach(readme => {
    const fullPath = path.join(DOCS_DIR, readme);
    if (!fs.existsSync(fullPath)) {
      issues.push(`Section README not found: ${readme}`);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      const sectionDir = path.dirname(fullPath);
      
      // Find all markdown files in the section
      const sectionFiles = findMarkdownFilesInDir(sectionDir).filter(
        file => path.basename(file) !== 'README.md'
      );
      
      // Check if README links to section files
      sectionFiles.forEach(file => {
        const fileName = path.basename(file);
        if (!content.includes(fileName)) {
          issues.push(`${readme} doesn't link to ${fileName}`);
        }
      });
    }
  });
  
  if (issues.length === 0) {
    console.log('\n✅ Navigation is complete\n');
    return { passed: true, issues: [] };
  } else {
    console.log(`\n⚠️  Navigation Issues: ${issues.length}\n`);
    issues.slice(0, 10).forEach(issue => console.log(`  ${issue}`));
    if (issues.length > 10) {
      console.log(`  ... and ${issues.length - 10} more`);
    }
    console.log('');
    return { passed: false, issues };
  }
}

/**
 * Test information architecture
 */
function testInformationArchitecture() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('Testing Information Architecture...');
  console.log('='.repeat(70));
  
  const issues = [];
  
  // Check depth of documentation hierarchy
  const allDocs = findMarkdownFiles(DOCS_DIR);
  allDocs.forEach(docPath => {
    const relativePath = path.relative(DOCS_DIR, docPath);
    const depth = relativePath.split(path.sep).length;
    
    if (depth > 4) {
      issues.push(`${relativePath}: Too deep (${depth} levels)`);
    }
  });
  
  // Check for consistent naming
  allDocs.forEach(docPath => {
    const fileName = path.basename(docPath);
    
    // Check for inconsistent naming patterns
    if (fileName.includes('_') && fileName.includes('-')) {
      issues.push(`${path.relative(DOCS_DIR, docPath)}: Mixed naming conventions (both _ and -)`);
    }
    
    // Check for uppercase in filenames (except README)
    if (fileName !== 'README.md' && fileName !== fileName.toLowerCase()) {
      issues.push(`${path.relative(DOCS_DIR, docPath)}: Filename should be lowercase`);
    }
  });
  
  // Check for orphaned directories
  const directories = findDirectories(DOCS_DIR);
  directories.forEach(dir => {
    const readmePath = path.join(dir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      const relativePath = path.relative(DOCS_DIR, dir);
      issues.push(`${relativePath}/: Directory missing README.md`);
    }
  });
  
  if (issues.length === 0) {
    console.log('\n✅ Information architecture is well-organized\n');
    return { passed: true, issues: [] };
  } else {
    console.log(`\n⚠️  Architecture Issues: ${issues.length}\n`);
    issues.slice(0, 10).forEach(issue => console.log(`  ${issue}`));
    if (issues.length > 10) {
      console.log(`  ... and ${issues.length - 10} more`);
    }
    console.log('');
    return { passed: false, issues };
  }
}

/**
 * Find all markdown files in a directory (non-recursive)
 */
function findMarkdownFilesInDir(dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (MARKDOWN_EXTENSIONS.includes(ext)) {
          files.push(path.join(dir, entry.name));
        }
      }
    }
  } catch (error) {
    // Silently continue
  }
  
  return files;
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
    // Silently continue
  }
  
  return files;
}

/**
 * Find all directories
 */
function findDirectories(dir) {
  const directories = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        directories.push(fullPath);
        directories.push(...findDirectories(fullPath));
      }
    }
  } catch (error) {
    // Silently continue
  }
  
  return directories;
}

/**
 * Generate report
 */
function generateReport() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('NAVIGATION AND UX TEST REPORT');
  console.log('='.repeat(70));
  
  console.log('\nUser Journey Tests:\n');
  const passedJourneys = results.journeyTests.filter(j => j.passed).length;
  console.log(`  Passed: ${passedJourneys}/${results.journeyTests.length}`);
  
  results.journeyTests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`  ${status} ${test.journey}`);
  });
  
  console.log('\nTask Workflow Tests:\n');
  const passedWorkflows = results.workflowTests.filter(w => w.passed).length;
  console.log(`  Passed: ${passedWorkflows}/${results.workflowTests.length}`);
  
  results.workflowTests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`  ${status} ${test.workflow}`);
  });
  
  console.log('\nNavigation Tests:\n');
  const navStatus = results.navigationTests.passed ? '✅' : '❌';
  console.log(`  ${navStatus} Navigation Completeness`);
  
  console.log('\nInformation Architecture:\n');
  const archStatus = results.informationArchitecture.passed ? '✅' : '❌';
  console.log(`  ${archStatus} Information Architecture`);
  
  console.log('\n' + '='.repeat(70));
  
  const allPassed = 
    passedJourneys === results.journeyTests.length &&
    passedWorkflows === results.workflowTests.length &&
    results.navigationTests.passed &&
    results.informationArchitecture.passed;
  
  if (allPassed) {
    console.log('\n🎉 All navigation and UX tests passed!\n');
    return 0;
  } else {
    console.log('\n⚠️  Some tests failed - review issues above\n');
    return 1;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Documentation Navigation & UX Testing Suite              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`\nError: Documentation directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }
  
  // Test user journeys
  console.log(`\n${'='.repeat(70)}`);
  console.log('Testing User Journeys...');
  console.log('='.repeat(70));
  
  Object.entries(USER_JOURNEYS).forEach(([key, journey]) => {
    const result = testUserJourney(key, journey);
    results.journeyTests.push(result);
  });
  
  // Test task workflows
  console.log(`\n${'='.repeat(70)}`);
  console.log('Testing Task Workflows...');
  console.log('='.repeat(70));
  
  Object.entries(TASK_WORKFLOWS).forEach(([key, workflow]) => {
    const result = testTaskWorkflow(key, workflow);
    results.workflowTests.push(result);
  });
  
  // Test navigation completeness
  results.navigationTests = testNavigationCompleteness();
  
  // Test information architecture
  results.informationArchitecture = testInformationArchitecture();
  
  // Generate final report
  const exitCode = generateReport();
  process.exit(exitCode);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  testUserJourney,
  testTaskWorkflow,
  testNavigationCompleteness,
  testInformationArchitecture
};
